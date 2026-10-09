"""Contact sheet: python verify/shot.py <scene> <t1,t2,...> [cols] [out.png] [scale]
Default output /tmp/<scene>_sheet.png. Each frame is labelled with its time."""
import sys, os, io
OUT=os.environ.get('OUT', os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'out'))
from playwright.sync_api import sync_playwright
from PIL import Image, ImageDraw
name=sys.argv[1]; times=[float(x) for x in sys.argv[2].split(',')]
cols=int(sys.argv[3]) if len(sys.argv)>3 else 3
dest=sys.argv[4] if len(sys.argv)>4 else f'/tmp/{name}_sheet.png'
sc=float(sys.argv[5]) if len(sys.argv)>5 else 0.6
svg=open(f'{OUT}/{name}.svg').read()
frames=[]
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':800,'height':460})
    pg.set_content(f'<body style="margin:0">{svg}</body>')
    for t in times:
        pg.evaluate("t=>{document.getAnimations().forEach(a=>{a.pause();a.currentTime=t*1000})}",t)
        pg.wait_for_timeout(60)
        frames.append(Image.open(io.BytesIO(pg.screenshot())).convert('RGB'))
w,h=frames[0].size
rows=(len(frames)+cols-1)//cols
sheet=Image.new('RGB',(int(w*sc)*cols,int(h*sc)*rows),'white')
for i,(t,f) in enumerate(zip(times,frames)):
    f=f.resize((int(w*sc),int(h*sc)))
    ImageDraw.Draw(f).text((8,6),f't={t}s',fill='#2B3F55')
    sheet.paste(f,((i%cols)*int(w*sc),(i//cols)*int(h*sc)))
sheet.save(dest); print(dest, sheet.size)
