import sys, os
OUT=os.environ.get('OUT','out')
from playwright.sync_api import sync_playwright
from PIL import Image
name=sys.argv[1]; times=[float(x) for x in sys.argv[2].split(',')]
cols=int(sys.argv[3]) if len(sys.argv)>3 else 3
svg=open(f'{OUT}/{name}.svg').read()
frames=[]
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':800,'height':460})
    pg.set_content(f'<body style="margin:0">{svg}</body>')
    for t in times:
        pg.evaluate("t=>{document.getAnimations().forEach(a=>{a.pause();a.currentTime=t*1000})}",t)
        pg.wait_for_timeout(60)
        pg.screenshot(path=f'/tmp/{name}_{t}.png'); frames.append(Image.open(f'/tmp/{name}_{t}.png'))
w,h=frames[0].size; sc=0.6
rows=(len(frames)+cols-1)//cols
sheet=Image.new('RGB',(int(w*sc)*cols,int(h*sc)*rows),'white')
for i,f in enumerate(frames):
    f=f.resize((int(w*sc),int(h*sc)))
    sheet.paste(f,((i%cols)*int(w*sc),(i//cols)*int(h*sc)))
sheet.save(f'/tmp/{name}_sheet.png'); print(sheet.size)
