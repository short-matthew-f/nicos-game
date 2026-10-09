"""Track B: build, rig, animate and render Nico in Blender (headless).

Usage:
  blender -b --factory-startup -P blender/build_nico.py -- --out out/blender [--proof] [--mutate NAME] [--no-post]

Everything is scripted; nothing depends on a GUI or a saved .blend.

Units: 1 Blender unit == 1 unit of the 2D rig in src/gen.py (build_walk). The 2D scene draws Nico
at scale 1.3, so the orthographic camera maps 1 unit -> 1.3 px (ortho_scale = 800 / 1.3).
Axes: Nico faces +X, Z is up, +Y is his left. Ground is z = 0 and lands on pixel row 392 (as in 2D).

Pipeline: this script renders flat-colour RGBA frames ("raw") with the Workbench engine, then calls
blender/sticker_post.py (Pillow, in .venv) which applies the same sticker filter chain as the SVG.
"""
import bpy, bmesh, json, math, os, subprocess, sys, time
from mathutils import Matrix, Vector, Quaternion
from mathutils.bvhtree import BVHTree

ARGV = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
def arg(name, default=None):
    return ARGV[ARGV.index(name) + 1] if name in ARGV else default
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.abspath(os.path.join(ROOT, arg('--out', 'out/blender')))
PROOF = '--proof' in ARGV
MUT = arg('--mutate', '')
NO_POST = '--no-post' in ARGV
HULL = '--hull' in ARGV          # experiment: inverted-hull outline instead of the sticker post-process
FPS = 24
W, H = 800, 460
PX = 1.3                       # px per unit (2D scene scale)
GROUND_ROW = 392
CAM_Z = (GROUND_ROW - H / 2) / PX   # camera centre height above ground so z=0 lands on row 392

# ------------------------------------------------------------------ palette (HANDOFF.md section 2 + gen.py)
def mix(a, b, k):  # k of a over b, in sRGB like the SVG opacity
    pa = [int(a[i:i + 2], 16) for i in (1, 3, 5)]; pb = [int(b[i:i + 2], 16) for i in (1, 3, 5)]
    return '#' + ''.join(f'{round(k * x + (1 - k) * y):02X}' for x, y in zip(pa, pb))
PAL = {
    'skin': '#E8B48F', 'skin2': '#D6996F', 'hair': '#6B4A35',
    'shirt': '#5B8FD6', 'sleeve': '#4F86D0', 'sleeve2': '#3F74BC',
    'pant': '#5B78AA', 'pant2': '#4A6590', 'shoe': '#34495E', 'shoe2': '#2C3E52', 'sole': '#E9EEF3',
    'eye': '#3A2E2A', 'mouth': '#A5583F', 'cheek': mix('#F29A8A', '#E8B48F', 0.55),
    'collar': '#A9CCF2', 'pocket': '#3F78C6', 'pocketflap': '#6FA2E4',
    'box': '#E3A857', 'boxtop': '#F0C27C', 'tape': '#FFE7A6', 'label': '#FFFFFF',
}
if MUT == 'wrong_shirt':
    PAL['shirt'] = '#6B9FE6'

def srgb_to_lin(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

# ------------------------------------------------------------------ scene reset
def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = 'BLENDER_WORKBENCH'
    sh = sc.display.shading
    sh.light = 'STUDIO' if MUT == 'lit' else 'FLAT'
    sh.color_type = 'MATERIAL'
    for attr in ('show_object_outline', 'show_cavity', 'show_shadows', 'show_specular_highlight',
                 'use_dof', 'show_xray', 'show_backface_culling'):
        if hasattr(sh, attr): setattr(sh, attr, False)
    sc.display.render_aa = '8'
    sc.view_settings.view_transform = 'AgX' if MUT == 'agx' else 'Standard'
    sc.view_settings.look = 'None'
    sc.view_settings.exposure = 0.0
    sc.view_settings.gamma = 1.0
    sc.display_settings.display_device = 'sRGB'
    sc.render.film_transparent = MUT != 'film_opaque'
    if MUT == 'film_opaque':   # with no World at all, Workbench still wrote alpha 0 (found by mutation testing)
        sc.world = bpy.data.worlds.new('W')
        sc.world.color = (0.8, 0.85, 0.9)
    sc.render.resolution_x, sc.render.resolution_y = W, H
    sc.render.resolution_percentage = 100
    sc.render.fps = FPS
    sc.render.image_settings.file_format = 'PNG'
    sc.render.image_settings.color_mode = 'RGBA'
    sc.render.image_settings.color_depth = '8'
    sc.render.image_settings.compression = 90
    if hasattr(sc.render, 'use_persistent_data'): sc.render.use_persistent_data = True
    if HULL:
        sh.show_backface_culling = True
    return sc

MATS = {}
def mat(key):
    if key not in MATS:
        m = bpy.data.materials.new('M_' + key)
        hx = PAL[key]
        rgb = [srgb_to_lin(int(hx[i:i + 2], 16) / 255) for i in (1, 3, 5)]
        m.diffuse_color = (*rgb, 1.0)
        m.roughness = 1.0
        m.metallic = 0.0
        m.specular_intensity = 0.0
        MATS[key] = m
    return MATS[key]

# ------------------------------------------------------------------ primitive builders (into a bmesh, world coords)
def _apply(bm, geom_verts, M):
    bmesh.ops.transform(bm, matrix=M, verts=geom_verts)

def sphere(bm, c, r, scale=(1, 1, 1), seg=32, rings=16):
    res = bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=rings, radius=r)
    M = Matrix.Translation(Vector(c)) @ Matrix.Diagonal((*scale, 1))
    _apply(bm, res['verts'], M)
    return res['verts']

def capsule(bm, p0, p1, r, seg=24):
    """Capsule from p0 to p1 (hemisphere centres) with radius r."""
    p0, p1 = Vector(p0), Vector(p1)
    L = (p1 - p0).length
    res = bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=seg // 2 if seg // 2 % 2 == 0 else seg // 2 + 1, radius=r)
    for v in res['verts']:
        v.co.z += L / 2 if v.co.z >= 0 else -L / 2
    d = (p1 - p0).normalized()
    q = Vector((0, 0, 1)).rotation_difference(d)
    M = Matrix.Translation((p0 + p1) / 2) @ q.to_matrix().to_4x4()
    _apply(bm, res['verts'], M)
    return res['verts']

def rbox(bm, c, size, r, seg=5):
    """Rounded box centred at c with full size (sx, sy, sz) and corner radius r."""
    res = bmesh.ops.create_cube(bm, size=1.0)
    verts = res['verts']
    _apply(bm, verts, Matrix.Translation(Vector(c)) @ Matrix.Diagonal((*size, 1)))
    if r > 0:
        edges = list({e for v in verts for e in v.link_edges})
        bmesh.ops.bevel(bm, geom=list(verts) + edges, offset=min(r, min(size) / 2 - 1e-3), segments=seg,
                        affect='EDGES', profile=0.5, clamp_overlap=True)
    return verts

def cyl(bm, p0, p1, r, seg=24):
    p0, p1 = Vector(p0), Vector(p1)
    res = bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r, radius2=r, depth=(p1 - p0).length)
    q = Vector((0, 0, 1)).rotation_difference((p1 - p0).normalized())
    _apply(bm, res['verts'], Matrix.Translation((p0 + p1) / 2) @ q.to_matrix().to_4x4())

def stroke(bm, pts, w, n=14):
    """A round-capped stroke along a polyline: dense small spheres (reads as a flat line under flat shading)."""
    pts = [Vector(p) for p in pts]
    seglen = [(pts[i + 1] - pts[i]).length for i in range(len(pts) - 1)]
    tot = sum(seglen)
    for k in range(n + 1):
        s = tot * k / n
        i = 0
        while i < len(seglen) - 1 and s > seglen[i]:
            s -= seglen[i]; i += 1
        p = pts[i].lerp(pts[i + 1], min(1.0, s / seglen[i]))
        sphere(bm, p, w / 2, seg=12, rings=6)

# ------------------------------------------------------------------ model
PARTS = {}   # (bone, role) -> bmesh
def part(bone, role, tag=''):
    k = (bone, role, tag)
    if k not in PARTS: PARTS[k] = bmesh.new()
    return PARTS[k]

HIP_Z = 58.0                       # hip joint height (2D: hip at -58 from ground)
LEG_Y = 10.0                       # lateral leg offset
THIGH, SHIN = 25.0, 25.0
ANKLE_Z = 8.0
SHOULDER = (2.0, 27.0, 100.0)      # 2D shoulder at (2,-42) from the hip
HEAD_C = Vector((4.0, 0.0, 144.0)) # 2D head circle (4,-86) r=29
HEAD_R = 29.0
BOX_REST = Vector((50.0, 0.0, 70.0))  # box centre in the upper-body frame at rest (2D BOXL (50,-12))

def on_head(lat, zrel, r=HEAD_R, inset=0.0):
    """Point on the head sphere surface: lateral offset, vertical offset from centre, facing +X."""
    x = math.sqrt(max(0.0, r * r - lat * lat - zrel * zrel))
    n = Vector((x, lat, zrel)).normalized()
    return HEAD_C + n * (r - inset)

def build_model():
    # --- torso, neck, collar, pocket (spine)
    torso_c, torso_s = Vector((-1.0, 0.0, 83.0)), (38.0, 46.0, 54.0)   # 2D rect x -20..18, y -52..2 rx 15
    rbox(part('spine', 'shirt'), torso_c, torso_s, 15.0, seg=6)
    cyl(part('spine', 'skin2'), (2.5, 0, 100), (2.5, 0, 121), 7.5)       # neck, 2D x -5..10
    # collar: a U across the front of the torso top, snapped onto the torso surface
    tb = bmesh.new(); rbox(tb, torso_c, torso_s, 15.0, seg=6)
    tree = BVHTree.FromBMesh(tb)
    cpts = []
    for k in range(9):
        u = -1 + 2 * k / 8
        p = Vector((30.0, 10.0 * u, 101.0 + 8.0 * u * u))
        hit = tree.find_nearest(p)[0]
        cpts.append(hit + Vector((0.6, 0, 0)))
    stroke(part('spine', 'collar'), cpts, 4.0, n=20)
    tb.free()
    # pocket on the left chest (character's left = +Y), 2D x 3..15, y -30..-16
    rbox(part('spine', 'pocket'), (17.0, 9.0, 81.0), (5.0, 12.0, 14.0), 2.0, seg=2)
    rbox(part('spine', 'pocketflap'), (19.6, 9.0, 85.5), (1.0, 7.0, 2.0), 0.4, seg=1)

    # --- head (head bone)
    sphere(part('head', 'skin'), HEAD_C, HEAD_R, seg=48, rings=24)
    sphere(part('head', 'skin'), on_head(0, -5, inset=3.5), 4.0, seg=16, rings=8)   # nose (2D (31,-81) r4)
    for s in (-1, 1):
        sphere(part('head', 'skin2'), HEAD_C + Vector((-1.0, s * 27.5, -2.0)), 6.5, scale=(0.75, 0.6, 1.0), seg=16, rings=8)  # ears
        side = 'L' if s > 0 else 'R'
        sphere(part('face', 'eye', side), on_head(s * 11.0, 2.0, inset=2.4), 3.4, seg=16, rings=8)
        sphere(part('face', 'cheek', side), on_head(s * 16.5, -10.0, inset=1.6), 4.5, seg=16, rings=8)
    # smile (2D M10,-70 Q18,-63 26,-71): an arc on the face below the nose
    mpts = []
    for k in range(9):
        u = -1 + 2 * k / 8
        mpts.append(on_head(6.5 * u, -14.0 - 3.2 * (1 - u * u), r=HEAD_R + 0.3))
    stroke(part('face', 'mouth'), mpts, 2.8, n=18)
    # hair = union of two sphere caps (bisected, so hairlines are clean straight edges, not a UV staircase):
    #   crown: everything above z_rel +7 (keeps the eyes clear in every view, like the 2D fringe line)
    #   back:  behind x_rel -4, down a sloped nape line (z_rel -9 at x=-4 to about -23 at the back),
    #          which reads as the 2D sideburn/nape shape in the side view and covers the back of the head
    hb = part('head', 'hair')
    def cap(cuts):
        tmp = bmesh.new()
        bmesh.ops.create_uvsphere(tmp, u_segments=48, v_segments=24, radius=31.5)
        for co, no in cuts:
            bmesh.ops.bisect_plane(tmp, geom=tmp.verts[:] + tmp.edges[:] + tmp.faces[:], dist=1e-4,
                                   plane_co=co, plane_no=no, clear_inner=True)
        bmesh.ops.transform(tmp, matrix=Matrix.Translation(HEAD_C + Vector((-1.5, 0, 1.5))), verts=tmp.verts[:])
        me = bpy.data.meshes.new('tmp'); tmp.to_mesh(me); tmp.free()
        hb.from_mesh(me); bpy.data.meshes.remove(me)
    cap([((0, 0, 5.5), (0, 0, 1.0))])
    cap([((0, 0, -7.0), (-0.55, 0, 1.0)), ((-5.5, 0, 0), (-1.0, 0, 0))])
    # front fringe tuft (2D hair has a forward-swept fringe reaching x=33)
    sphere(hb, HEAD_C + Vector((17.0, -4.0, 17.0)), 13.0, scale=(1.0, 1.5, 0.75), seg=24, rings=12)

    # --- arms (sleeve, forearm, hand) hanging from the shoulder, tilted 4 deg outward
    for side, s in (('R', -1), ('L', 1)):
        sx, sy, sz = SHOULDER
        sy *= s
        tilt = Matrix.Translation((sx, sy, sz)) @ Matrix.Rotation(math.radians(-4 * s), 4, 'X') @ Matrix.Translation((-sx, -sy, -sz))
        b = 'arm.' + side
        bm = part(b, 'sleeve'); vs = capsule(bm, (sx, sy, sz + 0.5), (sx, sy, sz - 8.5), 8.5); _apply(bm, vs, tilt)
        bm = part(b, 'skin');   vs = capsule(bm, (sx, sy, sz - 6), (sx, sy, sz - 34), 6.0); _apply(bm, vs, tilt)
        vs = sphere(bm, (sx, sy, sz - 39), 8.0, seg=20, rings=10); _apply(bm, vs, tilt)

    # --- legs: thigh + shin capsules, shoe with light sole
    for side, s in (('R', -1), ('L', 1)):
        y = s * LEG_Y
        capsule(part('thigh.' + side, 'pant'), (0, y, HIP_Z + 2), (0, y, HIP_Z - THIGH), 8.5)
        capsule(part('shin.' + side, 'pant'), (0, y, HIP_Z - THIGH), (0, y, ANKLE_Z + 4), 8.0)
        # 2D shoe: x -10..21 (31 long), 13 tall, sole 4 tall in #E9EEF3
        rbox(part('foot.' + side, 'shoe'), (5.5, y, 7.5), (31.0, 16.0, 11.0), 5.4, seg=4)
        rbox(part('foot.' + side, 'sole'), (5.5, y, 2.0), (29.0, 15.0, 4.0), 1.9, seg=2)

    # --- small box prop (prop bone). 40 x 34 (side), 34 deep.
    c = BOX_REST
    rbox(part('prop', 'box'), c, (40.0, 34.0, 34.0), 5.0, seg=3)
    rbox(part('prop', 'boxtop'), c + Vector((0, 0, 12.0)), (40.6, 34.6, 10.0), 3.0, seg=2)
    rbox(part('prop', 'tape'), c + Vector((0, 0, 0.3)), (9.0, 35.2, 34.6), 0.5, seg=1)
    rbox(part('prop', 'label'), c + Vector((12.5, -17.3, -7.0)), (11.0, 0.8, 8.0), 1.2, seg=1)
    rbox(part('prop', 'label'), c + Vector((12.5, 17.3, -7.0)), (11.0, 0.8, 8.0), 1.2, seg=1)

# ------------------------------------------------------------------ armature
BONES = [  # name, parent, head, tail
    ('hips', None, (0, 0, HIP_Z), (0, 0, HIP_Z + 10)),
    ('spine', 'hips', (0, 0, HIP_Z), (0, 0, 112)),
    ('head', 'spine', (4, 0, 118), (4, 0, 150)),
    ('arm.R', 'spine', (2, -27, 100), (2, -27, 61)),
    ('arm.L', 'spine', (2, 27, 100), (2, 27, 61)),
    ('thigh.R', 'hips', (0, -LEG_Y, HIP_Z), (0, -LEG_Y, HIP_Z - THIGH)),
    ('shin.R', 'thigh.R', (0, -LEG_Y, HIP_Z - THIGH), (0, -LEG_Y, ANKLE_Z)),
    ('foot.R', 'shin.R', (0, -LEG_Y, ANKLE_Z), (14, -LEG_Y, ANKLE_Z)),
    ('thigh.L', 'hips', (0, LEG_Y, HIP_Z), (0, LEG_Y, HIP_Z - THIGH)),
    ('shin.L', 'thigh.L', (0, LEG_Y, HIP_Z - THIGH), (0, LEG_Y, ANKLE_Z)),
    ('foot.L', 'shin.L', (0, LEG_Y, ANKLE_Z), (14, LEG_Y, ANKLE_Z)),
    ('face', 'head', tuple(HEAD_C), tuple(HEAD_C + Vector((0, 0, 10)))),   # posed per view, never keyframed
    ('prop', None, tuple(BOX_REST), tuple(BOX_REST + Vector((0, 0, 20)))),
]

def build_rig(sc):
    ad = bpy.data.armatures.new('NicoRig')
    rig = bpy.data.objects.new('NicoRig', ad)
    sc.collection.objects.link(rig)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode='EDIT')
    for name, parent, h, t in BONES:
        eb = ad.edit_bones.new(name)
        eb.head, eb.tail = h, t
        eb.roll = 0.0
        if parent:
            eb.parent = ad.edit_bones[parent]
            eb.use_connect = False
    bpy.ops.object.mode_set(mode='OBJECT')
    for pb in rig.pose.bones:
        pb.rotation_mode = 'QUATERNION'
    # one object per (bone, role): vertex group with weight 1 + Armature modifier
    objs = {}
    for (bone, role, tag), bm in PARTS.items():
        me = bpy.data.meshes.new(f'{bone}_{role}{tag}')
        bm.to_mesh(me); bm.free()
        ob = bpy.data.objects.new(f'{bone}_{role}{tag}', me)
        sc.collection.objects.link(ob)
        me.materials.append(mat(role))
        vg = ob.vertex_groups.new(name=bone)
        vg.add(list(range(len(me.vertices))), 1.0, 'REPLACE')
        mod = ob.modifiers.new('Armature', 'ARMATURE')
        mod.object = rig
        if HULL:   # inverted hull: solidify outward with flipped normals, white, front faces culled
            me.materials.append(mat('label'))
            so = ob.modifiers.new('Hull', 'SOLIDIFY')
            so.thickness = 5.0; so.offset = 1.0
            so.use_flip_normals = True; so.use_rim = False
            so.material_offset = 1
        objs[(bone, role, tag)] = ob
    return rig, objs

# ------------------------------------------------------------------ pose math (same beats as src/gen.py build_walk)
def sm(x):
    x = max(0.0, min(1.0, x)); return x * x * (3 - 2 * x)
def ramp(t, a, b): return sm((t - a) / (b - a))

DC, LEAN_C = 30.745, 25.0
WALK_N = 17                      # frames per walk cycle: 2D period 0.7 s = 16.8 frames -> 17 (0.708 s)
STRIDE, LIFT = 20.0, 7.0
IDLE_N = 48

def leg_ik(hip, ankle):
    """2-link IK in the sagittal (x,z) plane, knee forward. Returns world angles (deg) of thigh and shin,
    measured as Blender +Y rotations from straight down."""
    hx, hz = hip; ax, az = ankle
    dx, dz = ax - hx, az - hz
    d = math.hypot(dx, dz)
    d = min(d, THIGH + SHIN - 1e-6)
    ux, uz = dx / max(d, 1e-9), dz / max(d, 1e-9)
    a = d / 2
    h = math.sqrt(max(0.0, THIGH * THIGH - a * a))
    px, pz = -uz, ux                    # perpendicular; pick the one pointing forward (+x)
    if px < 0: px, pz = -px, -pz
    kx, kz = hx + ux * a + px * h, hz + uz * a + pz * h
    ang = lambda vx, vz: math.degrees(math.atan2(-vx, -vz))
    return ang(kx - hx, kz - hz), ang(hx + ux * d - kx, hz + uz * d - kz)

def base_pose():
    return dict(hip=(0.0, HIP_Z), lean=0.0, head=0.0, arm={'R': 0.0, 'L': 0.0},
                ankle={'R': (0.0, ANKLE_Z), 'L': (0.0, ANKLE_Z)}, foot={'R': 0.0, 'L': 0.0},
                box=None)

def pose_idle(f):
    p = base_pose()
    u = 2 * math.pi * f / IDLE_N
    p['hip'] = (0.0, HIP_Z - 0.8 * (1 - math.cos(u)) / 2)
    p['head'] = 1.5 * math.sin(u)
    p['arm'] = {'R': 2.0 * math.sin(u), 'L': -2.0 * math.sin(u)}
    return p

def pose_walk(f, period=WALK_N):
    p = base_pose()
    ph = 2 * math.pi * f / period
    an = 28.0 * math.sin(ph)                         # 2D leg angle; near (R) leg back when an > 0
    p['ankle'] = {'R': (-STRIDE * math.sin(ph), ANKLE_Z + LIFT * max(0.0, -math.cos(ph))),
                  'L': (STRIDE * math.sin(ph), ANKLE_Z + LIFT * max(0.0, math.cos(ph)))}
    # swing foot: toe dips slightly while it is in the air (stance foot stays flat on the ground)
    p['foot'] = {'R': 8.0 * max(0.0, -math.cos(ph)), 'L': 8.0 * max(0.0, math.cos(ph))}
    p['hip'] = (0.0, 54.5 - 1.5 * math.sin(ph) ** 2)
    p['lean'] = 3.0
    p['arm'] = {'R': -0.85 * an, 'L': 0.85 * an}
    return p

def crouch_pose(c, w, carried, ground_box):
    p = base_pose()
    hx = -6.0 * c
    p['hip'] = (hx, HIP_Z - DC * c)
    p['lean'] = LEAN_C * c
    p['ankle'] = {'R': (-4.0 * c, ANKLE_Z), 'L': (-4.0 * c, ANKLE_Z)}
    p['arm'] = {'R': w * -56.0, 'L': w * -56.0}
    p['box'] = box_carried(p) if carried else ground_box
    return p

def box_carried(p):
    a = math.radians(p['lean'])
    ox, oz = BOX_REST.x, BOX_REST.z - HIP_Z          # (50, +12) in the upper-body frame
    x = ox * math.cos(a) + oz * math.sin(a)
    z = -ox * math.sin(a) + oz * math.cos(a)
    return (p['hip'][0] + x, p['hip'][1] + z)

GROUND_BOX = box_carried(dict(hip=(-6.0, HIP_Z - DC), lean=LEAN_C))   # box centre at full crouch

PUT_T0, PUT_N = 3.3, 44         # 2D times 3.3 .. 5.1 s
PICK_T0, PICK_N = 12.4, 41      # 2D times 12.4 .. 14.1 s
def pose_putdown(f):
    t = PUT_T0 + f / FPS
    c = ramp(t, 3.5, 4.1) - ramp(t, 4.3, 4.9)
    w = 1 - ramp(t, 4.2, 4.7)
    return crouch_pose(c, w, t < 4.2, GROUND_BOX)
def pose_pickup(f):
    t = PICK_T0 + f / FPS
    c = ramp(t, 12.6, 13.2) - ramp(t, 13.3, 13.9)
    w = ramp(t, 12.6, 13.2)
    return crouch_pose(c, w, t >= 13.3, GROUND_BOX)

# clip name -> (pose fn, frames rendered, loops?, timeline offset)
CLIPS = {
    'idle': (pose_idle, IDLE_N, True, 0),
    'walk': (pose_walk, WALK_N, True, 100),
    'putdown': (pose_putdown, PUT_N, False, 200),
    'pickup': (pose_pickup, PICK_N, False, 300),
}
if MUT == 'loop_shift':   # bake the walk with a 16-frame period but render/loop it as 17 frames
    CLIPS['walk'] = (lambda f: pose_walk(f, period=16), WALK_N, True, 100)

# ------------------------------------------------------------------ apply pose to bones
def basis_rot(rig, bone, axis_world, deg):
    R = rig.data.bones[bone].matrix_local.to_3x3()
    Q = Matrix.Rotation(math.radians(deg), 3, axis_world)
    return (R.inverted() @ Q @ R).to_quaternion()

def basis_loc(rig, bone, delta):
    R = rig.data.bones[bone].matrix_local.to_3x3()
    return R.inverted() @ Vector(delta)

def apply_pose(rig, p, frame):
    pb = rig.pose.bones
    hx, hz = p['hip']
    hip_extra = 10.0 if MUT == 'hip_offset' else 0.0
    sets = {}
    sets['hips'] = (basis_loc(rig, 'hips', (hx, 0, hz - HIP_Z + hip_extra)), Quaternion())
    sets['spine'] = (Vector(), basis_rot(rig, 'spine', 'Y', p['lean']))
    sets['head'] = (Vector(), basis_rot(rig, 'head', 'Y', p['head']))
    for s in ('R', 'L'):
        sets['arm.' + s] = (Vector(), basis_rot(rig, 'arm.' + s, 'Y', p['arm'][s]))
        ax, az = p['ankle'][s]
        a1, a2 = leg_ik((hx, hz), (ax, az))
        sets['thigh.' + s] = (Vector(), basis_rot(rig, 'thigh.' + s, 'Y', a1))
        sets['shin.' + s] = (Vector(), basis_rot(rig, 'shin.' + s, 'Y', a2 - a1))
        sets['foot.' + s] = (Vector(), basis_rot(rig, 'foot.' + s, 'Y', p['foot'][s] - a2))
    bx = p['box'] or (BOX_REST.x, BOX_REST.z)
    sets['prop'] = (basis_loc(rig, 'prop', (bx[0] - BOX_REST.x, 0, bx[1] - BOX_REST.z)), Quaternion())
    for name, (loc, rot) in sets.items():
        pb[name].location = loc
        pb[name].rotation_quaternion = rot
        pb[name].keyframe_insert('location', frame=frame)
        pb[name].keyframe_insert('rotation_quaternion', frame=frame)

def bake(rig, objs):
    box_objs = [o for (b, r, _), o in objs.items() if b == 'prop']
    for clip, (fn, n, loops, off) in CLIPS.items():
        for f in range(n + 1):            # frame n is baked too: equals frame 0 for loops (seam check)
            p = fn(f)
            apply_pose(rig, p, off + f)
        for o in box_objs:
            o.hide_render = clip in ('idle', 'walk')
            o.keyframe_insert('hide_render', frame=off)
    if rig.animation_data and rig.animation_data.action:
        rig.animation_data.action.name = 'NicoClips'

# ------------------------------------------------------------------ cameras / views
VIEWS = {  # camera direction from the character (azimuth in XY plane)
    'side': Vector((0, -1, 0)),
    'front': Vector((1, 0, 0)),
    'back': Vector((-1, 0, 0)),
    'threequarter': Vector((1, -1, 0)).normalized(),
}
FAR_SIDE = {'side': 'L', 'threequarter': 'L', 'front': None, 'back': None}
SHADE = {'sleeve': 'sleeve2', 'skin': 'skin2', 'pant': 'pant2', 'shoe': 'shoe2'}

def make_camera(sc, view):
    cd = bpy.data.cameras.new('Cam_' + view)
    cd.type = 'ORTHO'
    cd.ortho_scale = W / PX
    if MUT == 'view_scale' and view == 'front':
        cd.ortho_scale *= 0.95
    cd.sensor_fit = 'HORIZONTAL'
    cd.clip_start, cd.clip_end = 1.0, 5000.0
    cam = bpy.data.objects.new('Cam_' + view, cd)
    sc.collection.objects.link(cam)
    d = VIEWS[view]
    cam.location = Vector((0, 0, CAM_Z)) + d * 1000.0
    cam.rotation_mode = 'QUATERNION'
    cam.rotation_quaternion = (-d).to_track_quat('-Z', 'Y')
    return cam

# Face cheat, like the 2D side view: the eye/mouth/cheek set (bone 'face') turns toward the camera in the
# side and three-quarter views, and the far eye/cheek are hidden in the side view.
FACE_YAW = {'side': -38.0, 'threequarter': -15.0, 'front': 0.0, 'back': 0.0}
def set_view_face(rig, objs, view):
    rig.pose.bones['face'].rotation_quaternion = basis_rot(rig, 'face', 'Z', FACE_YAW[view])
    for role in ('eye', 'cheek'):
        objs[('face', role, 'L')].hide_render = view == 'side'

def set_view_materials(objs, view):
    far = FAR_SIDE[view]
    for (bone, role, tag), ob in objs.items():
        side = bone.split('.')[-1] if '.' in bone else None
        r = SHADE.get(role, role) if (far and side == far and role in SHADE) else role
        ob.data.materials[0] = mat(r)

def project(sc, cam, co):
    from bpy_extras.object_utils import world_to_camera_view
    v = world_to_camera_view(sc, cam, Vector(co))
    return (v.x * W, (1 - v.y) * H)

# ------------------------------------------------------------------ render jobs
def jobs():
    if PROOF:
        return [('walk', v, [4]) for v in VIEWS] + [('putdown', 'side', [20]), ('idle', 'front', [0])]
    J = [('walk', v, None) for v in VIEWS] + [('idle', v, None) for v in VIEWS]
    J += [('putdown', 'side', None), ('pickup', 'side', None)]
    if MUT:   # mutation runs only need what the checks look at
        J = [('walk', v, None) for v in ('side', 'front', 'back')] + [('idle', v, [0]) for v in ('side', 'front', 'back')]
    return J

def main():
    t0 = time.time()
    sc = reset()
    build_model()
    rig, objs = build_rig(sc)
    bake(rig, objs)
    cams = {v: make_camera(sc, v) for v in VIEWS}
    os.makedirs(OUT, exist_ok=True)
    t_build = time.time() - t0

    # bone matrices per clip frame (armature space), for the loop-seam check
    bones = {}
    for clip, (fn, n, loops, off) in CLIPS.items():
        fr = []
        for f in range(n + 1):
            sc.frame_set(off + f)
            fr.append({pb.name: [list(r) for r in pb.matrix] for pb in rig.pose.bones})
        bones[clip] = dict(frames=fr, loops=loops, n=n)
    with open(os.path.join(OUT, 'bones.json'), 'w') as fh:
        json.dump(bones, fh)

    meta = dict(fps=FPS, px_per_unit=PX, ground_row=GROUND_ROW, width=W, height=H, mutate=MUT,
                walk_frames=WALK_N, views={}, clips={})
    timings = {}
    for clip, view, frames in jobs():
        fn, n, loops, off = CLIPS[clip]
        frames = frames if frames is not None else list(range(n))
        set_view_materials(objs, view)
        set_view_face(rig, objs, view)
        sc.camera = cams[view]
        d = os.path.join(OUT, f'{clip}_{view}', 'raw')
        os.makedirs(d, exist_ok=True)
        t1 = time.time()
        for f in frames:
            sc.frame_set(off + f)
            sc.render.filepath = os.path.join(d, f'f{f:04d}.png')
            bpy.ops.render.render(write_still=True)
        timings[f'{clip}_{view}'] = dict(frames=len(frames), seconds=round(time.time() - t1, 2))
        meta['clips'][f'{clip}_{view}'] = dict(clip=clip, view=view, frames=frames, loops=loops)
        print(f'[nico] {clip}_{view}: {len(frames)} frames in {time.time() - t1:.1f}s', flush=True)
    for v, cam in cams.items():
        gx, gy = project(sc, cam, (0, 0, 0))
        meta['views'][v] = dict(ground_row=gy, centre_col=gx)
    meta['timings'] = timings
    meta['build_seconds'] = round(t_build, 2)
    if not PROOF and not MUT:
        set_view_materials(objs, 'front'); set_view_face(rig, objs, 'front')   # save in the neutral state
        sc.camera = cams['side']
        bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, 'nico.blend'))
    meta['render_seconds'] = round(time.time() - t0 - t_build, 2)
    with open(os.path.join(OUT, 'meta.json'), 'w') as fh:
        json.dump(meta, fh, indent=1)
    print(f'[nico] blender total {time.time() - t0:.1f}s', flush=True)

    if not NO_POST:
        py = os.path.join(ROOT, '.venv', 'bin', 'python')
        cmd = [py if os.path.exists(py) else 'python3', os.path.join(ROOT, 'blender', 'sticker_post.py'), OUT]
        if MUT == 'outline_r':
            cmd += ['--r', '2']
        if MUT == 'outline_wide':
            cmd += ['--r', '8']
        t2 = time.time()
        subprocess.run(cmd, check=True)
        print(f'[nico] sticker post {time.time() - t2:.1f}s', flush=True)

main()
