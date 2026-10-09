import os
OUT=os.environ.get('OUT', os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'out'))
svgs={n:open(f'{OUT}/{n}.svg').read() for n in ('walk','walk3d','taxi','factory')}
cards=[
 ('walk','The Dreamer','Walks, turns around, sets a box down, then comes back for it'),
 ('walk3d','Coming and Going','Walks across, turns to face you, comes closer, then turns and heads back'),
 ('taxi','City Taxi','Your first money-making ride, rolling through town'),
 ('factory','Toy Works','A helper arm packs the toy, then the box is taped, labelled and shipped'),
]
figs=''.join(f'<figure class="card" tabindex="0" role="button" aria-label="{t}: tap to pause or play">{svgs[k]}<figcaption><h2>{t}</h2><p>{d}</p></figcaption></figure>' for k,t,d in cards)
html=f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Big Dreams, Small Beginnings: animated stickers</title>
<style>
:root{{--bg:#E9EEF3;--ink:#2B3F55;--sub:#7A8A9B;--card:#E9EEF3;--shadow:rgba(43,63,85,.14);
box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}}
@media (prefers-color-scheme:dark){{:root:not([data-theme="light"]){{--bg:#16202C;--ink:#E4ECF4;--sub:#8FA1B3;--shadow:rgba(0,0,0,.4)}}}}
:root[data-theme="dark"]{{--bg:#16202C;--ink:#E4ECF4;--sub:#8FA1B3;--shadow:rgba(0,0,0,.4)}}
html{{scroll-padding-top:env(safe-area-inset-top,0px)}}
*{{box-sizing:border-box}}
body{{margin:0;background:var(--bg);color:var(--ink);font-family:'DejaVu Sans',Verdana,Arial,sans-serif;padding:28px 16px 40px}}
main{{max-width:760px;margin:0 auto}}
h1{{font-size:clamp(20px,5.2vw,32px);letter-spacing:.02em;margin:0 0 6px;text-transform:uppercase;line-height:1.15}}
.sub{{margin:0 0 26px;color:var(--sub);font-size:14px}}
.card{{margin:0 0 30px;cursor:pointer;-webkit-tap-highlight-color:transparent}}
.card svg{{display:block;width:100%;height:auto;border-radius:20px;box-shadow:0 10px 26px var(--shadow)}}
.card:focus-visible{{outline:3px solid #5B8FD6;outline-offset:4px;border-radius:22px}}
figcaption{{text-align:center;padding-top:14px}}
h2{{margin:0;font-size:clamp(16px,4.4vw,20px);letter-spacing:.06em;text-transform:uppercase}}
figcaption p{{margin:4px 0 0;font-size:13px;color:var(--sub)}}
.paused svg *{{animation-play-state:paused !important}}
.hint{{text-align:center;color:var(--sub);font-size:12px;margin:0}}
</style></head>
<body><main>
<h1>Big dreams, small beginnings</h1>
<p class="sub">Animated stickers, flat color, white edges, soft cast shadows</p>
{figs}
<p class="hint">Tap a scene to pause or play</p>
</main>
<script>
document.querySelectorAll('.card').forEach(function(c){{
  function tog(){{c.classList.toggle('paused')}}
  c.addEventListener('click',tog);
  c.addEventListener('keydown',function(e){{if(e.key===' '||e.key==='Enter'){{e.preventDefault();tog()}}}});
  if(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)c.classList.add('paused');
}});
</script>
</body></html>'''
open(f'{OUT}/animated-stickers.html','w').write(html)
print(len(html)//1024,'KB')
