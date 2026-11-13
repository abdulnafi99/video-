import numpy as np, sys
from PIL import Image
U="/root/.claude/uploads/dddb85e4-6715-56da-8aa0-1885580d43c7/"
col={"chandan":"f2bcfb5b-image.jpg","gerik":"d43f91f1-image.jpg","ipoh":"8777da48-image.jpg","laneh":"f6425fab-image.jpg","lempor":"c8fb748b-image.jpg"}
def runs(mask):
    out=[];s=None
    for i,v in enumerate(mask):
        if v and s is None: s=i
        if not v and s is not None:
            if i-s>150: out.append((s,i))
            s=None
    if s is not None and len(mask)-s>150: out.append((s,len(mask)))
    return out
for name,f in col.items():
    im=Image.open(U+f).convert("RGB"); a=np.asarray(im).astype(int)
    a=a[:, :1600]  # exclude label column
    nonwhite=(a.min(axis=2)<235)
    cols=runs(nonwhite.mean(axis=0)>0.5); rows=runs(nonwhite.mean(axis=1)>0.5)
    print(name,cols,rows)
    k=0
    for r in rows:
        for c in cols:
            k+=1
            im.crop((c[0]+3,r[0]+3,c[1]-3,r[1]-3)).save(f"assets/{name}_{k}.jpg",quality=94)
import shutil
shutil.copy(U+"c17a3c96-image.webp","assets/gerik_hero.webp")
shutil.copy(U+"ecd517b2-image.webp","assets/kitchen.webp")
shutil.copy(U+"dd399876-image.webp","assets/gerik_room.webp")
shutil.copy("/home/user/video-/hyperframes/assets/brand/prc-logo-on-dark.png","assets/logo.png")
