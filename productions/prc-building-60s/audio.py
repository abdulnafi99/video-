import numpy as np, wave
SR=48000; DUR=60.0; N=int(SR*DUR)
rng=np.random.default_rng(3)
t=np.arange(N)/SR
def mtof(m): return 440*2**((m-69)/12)
def lp(x,fc):
    a=np.exp(-2*np.pi*np.asarray(fc)/SR); y=np.empty_like(x); s=0.0
    if np.ndim(a)==0:
        for i in range(len(x)): s=x[i]+(s-x[i])*a; y[i]=s
    else:
        for i in range(len(x)): s=x[i]+(s-x[i])*a[i]; y[i]=s
    return y
from numpy.fft import rfft, irfft
def conv(x,h):
    n=len(x)+len(h); n2=1<<(n-1).bit_length(); return irfft(rfft(x,n2)*rfft(h,n2),n2)[:len(x)]
def reverb(x,sec=2.6,seed=1):
    r=np.random.default_rng(seed); L=int(sec*SR); tt=np.arange(L)/SR
    hL=r.standard_normal(L)*np.exp(-tt*6.9/sec); hR=r.standard_normal(L)*np.exp(-tt*6.9/sec)
    hL[:int(.012*SR)]=0; hR[:int(.017*SR)]=0
    hL=lp(hL,5000)/np.sqrt((hL**2).sum()); hR=lp(hR,5000)/np.sqrt((hR**2).sum())
    return conv(x,hL),conv(x,hR)
def env(n,a,d): # attack/release seconds, n samples
    e=np.ones(n); A=max(1,int(a*SR)); D=max(1,int(d*SR))
    e[:A]=np.linspace(0,1,A); e[-D:]*=np.linspace(1,0,D); return e
def add(buf,start,sig,g=1.0):
    i=int(start*SR); j=min(N,i+len(sig))
    if j>i: buf[i:j]+=sig[:j-i]*g
mL=np.zeros(N); mR=np.zeros(N)
def addst(start,sig,g=1.0,pan=0.0):
    add(mL,start,sig,g*np.sqrt(0.5*(1-pan))*1.414); add(mR,start,sig,g*np.sqrt(0.5*(1+pan))*1.414)

# ---------------- MUSIC ----------------
BPM=100; beat=60/BPM; bar=4*beat
# progression (root midi, chord tones) Bm G D A
prog=[(47,[59,62,66]),(43,[59,62,67]),(50,[57,62,66]),(45,[57,61,64])]
def chord_at(b): return prog[(b//2)%4]
def intensity(x):
    pts=[(0,.25),(8,.45),(18,.7),(38,1.0),(50,.75),(52.5,.35),(54.5,1.0),(60,.8)]
    xs,ys=zip(*pts); return np.interp(x,xs,ys)
nbars=int(np.ceil(DUR/bar))+1
pad=np.zeros(N); padR=np.zeros(N)
for b in range(0,nbars,2):
    root,tones=chord_at(b); st=b*bar; ln=2*bar+1.0
    n=int(ln*SR); tt=np.arange(n)/SR
    sL=np.zeros(n); sR=np.zeros(n)
    for m in tones+[root+12]:
        for det,pan in [(-0.08,-1),(0.0,0),(0.09,1)]:
            f=mtof(m+det)*1.0
            w=2*((tt*f+rng.random())%1)-1
            if pan<=0: sL+=w
            if pan>=0: sR+=w
    e=env(n,1.2,1.2)
    i=int(st*SR)
    for buf,s in ((pad,sL),(padR,sR)):
        j=min(N,i+n); buf[i:j]+=(s*e)[:j-i]
cut=600+2600*intensity(t)
pad=lp(lp(pad,cut),cut)*0.05; padR=lp(lp(padR,cut),cut)*0.05
mL+=pad; mR+=padR
# low drone 0-8 and sub under everything
drone=np.sin(2*np.pi*mtof(35)*t)*0.5+np.sin(2*np.pi*mtof(47)*t)*0.25
drone*=np.interp(t,[0,2,7,8.5,50,52.5,54,60],[0,.6,.8,.35,.35,.7,.3,.3])*0.22
mL+=drone; mR+=drone
# bass pulse (eighths) from 8s
def pluck(f,dur,dec=6,harm=(1,.5,.25)):
    n=int(dur*SR); tt=np.arange(n)/SR
    s=sum(a*np.sin(2*np.pi*f*(k+1)*tt) for k,a in enumerate(harm))
    return s*np.exp(-tt*dec)*env(n,.004,.02)
for k in range(int(DUR/(beat/2))):
    tm=k*beat/2
    if tm<8.2 or 52.4<tm<54.5: continue
    b=int(tm//bar); root,_=chord_at(b)
    g=0.16*intensity(tm)*(1.0 if k%2==0 else 0.7)
    addst(tm,np.tanh(2*pluck(mtof(root-12),beat/2*0.95,dec=8,harm=(1,.35,.1))),g)
# piano-ish arpeggio
arp_pat=[0,1,2,1,3,2,1,2]
for k in range(int(DUR/(beat/2))):
    tm=k*beat/2
    if 52.6<tm<54.4: continue
    b=int(tm//bar); root,tones=chord_at(b)
    seq=tones+[tones[0]+12]
    if tm<8 and k%4!=0: continue
    m=seq[arp_pat[k%8]]+12
    g=0.07*(0.6+0.4*intensity(tm))
    addst(tm,pluck(mtof(m),1.6,dec=3.2,harm=(1,.3,.12,.05)),g,pan=0.35*np.sin(k*0.7))
# drums
def kick():
    n=int(.45*SR); tt=np.arange(n)/SR; f=48+90*np.exp(-tt*28)
    ph=2*np.pi*np.cumsum(f)/SR; return np.sin(ph)*np.exp(-tt*7)
def hat(): n=int(.06*SR); x=rng.standard_normal(n); x=x-lp(x,7000); return x*np.exp(-np.arange(n)/SR*70)
def clap():
    n=int(.25*SR); x=rng.standard_normal(n); x=lp(x,2500)-lp(x,900); tt=np.arange(n)/SR
    e=np.exp(-tt*18); 
    for o in (0.0,.011,.022): e+=np.exp(-np.maximum(0,tt-o)*120)*(tt>=o)*.5
    return x*e
K,H,CL=kick(),hat(),clap()
for k in range(int(DUR/beat)):
    tm=k*beat
    if 18<=tm<52.4 or tm>=54.5:
        addst(tm,K,0.30 if tm<38 else 0.38)
        if tm>=38 and k%2==1: addst(tm,CL,0.10)
    if 18<=tm<52.4 or tm>=54.5:
        addst(tm+beat/2,H,0.035,pan=0.3); addst(tm,H,0.02,pan=-0.3)

# ---------------- SFX ----------------
sL=np.zeros(N); sR=np.zeros(N)
def sadd(start,sig,g=1.0,pan=0.0):
    add(sL,start,sig,g*np.sqrt(0.5*(1-pan))*1.414); add(sR,start,sig,g*np.sqrt(0.5*(1+pan))*1.414)
def whoosh(d=0.9,f0=300,f1=3500,peak=0.6):
    n=int(d*SR); tt=np.arange(n)/SR; x=rng.standard_normal(n)
    fc=f0*(f1/f0)**np.clip(tt/d/peak,0,1)
    fc=np.where(tt/d>peak, f1*(f0/f1)**((tt/d-peak)/(1-peak)), fc)
    y=lp(x,fc)-lp(x,fc*0.35)
    e=np.where(tt/d<peak,(tt/d/peak)**2,np.exp(-(tt/d-peak)*9))
    return y*e
def impact(big=1.0):
    n=int(2.5*SR); tt=np.arange(n)/SR
    f=38+50*np.exp(-tt*9); boom=np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-tt*2.2)
    th=lp(rng.standard_normal(n),900)*np.exp(-tt*14)
    return (boom*1.0+th*0.8)*big
def tick(f=2200):
    n=int(.09*SR); tt=np.arange(n)/SR
    return (np.sin(2*np.pi*f*tt)+.4*np.sin(2*np.pi*f*1.5*tt))*np.exp(-tt*55)
def clink(f=1300):
    n=int(.7*SR); tt=np.arange(n)/SR
    return sum(a*np.sin(2*np.pi*f*r*tt)*np.exp(-tt*d) for r,a,d in [(1,.6,9),(2.76,.35,14),(5.4,.2,22),(8.9,.1,30)])
def thud():
    n=int(.35*SR); tt=np.arange(n)/SR
    return (np.sin(2*np.pi*(70+60*np.exp(-tt*30))*tt)*np.exp(-tt*14)+lp(rng.standard_normal(n),600)*np.exp(-tt*25)*.6)
def riser(d,f0=200,f1=2000):
    n=int(d*SR); tt=np.arange(n)/SR; f=f0*(f1/f0)**(tt/d)
    x=rng.standard_normal(n); y=lp(x,f)-lp(x,f*.5)
    tone=np.sin(2*np.pi*np.cumsum(f*0.5)/SR)*.15
    return (y+tone)*(tt/d)**2.2
def rumble(d):
    n=int(d*SR); x=lp(lp(rng.standard_normal(n),350),350); return x*env(n,.3,.4)*3
# intro riser into logo
sadd(0.6,riser(4.7,120,1800),0.18)
sadd(5.25,impact(1.0),0.55)
for tm in (7.55,17.3,22.85,27.85,32.85,37.55,42.45,46.05,49.45):
    sadd(tm,whoosh(0.9 if tm!=17.3 else 1.0),0.32 if tm in(17.3,37.55,7.55) else 0.2,pan=0.4*np.sin(tm))
for tm,g in ((8.15,.25),(18.15,.45),(39.55,.22),(42.85,.2),(46.15,.22),(50.0,.18)):
    sadd(tm,impact(.6),g)
for tm in (8.9,9.7,12.0,13.9,23.7,24.8,26.2,28.5,29.5,30.3,31.7,33.4,34.0,34.3,35.4,40.2,40.6,43.4,43.8,47.4):
    sadd(tm,tick(2000+300*(int(tm*10)%3)),0.18,pan=0.5)
for tm in (18.1,23.0,28.0,33.0): sadd(tm,tick(1500),0.22)
# construction sounds
for i in range(9): sadd(11.8+i*0.12,thud(),0.22,pan=-0.3+i*0.07)          # footings
sadd(12.7,thud(),0.3)                                                  # slab
for i in range(9): sadd(13.6+i*0.13,clink(1100+i*40),0.07,pan=-0.4+i*0.1) # columns
for i in range(6): sadd(14.7+i*0.18,clink(900+i*30),0.06)               # beams
for i in range(5): sadd(23.4+i*0.25,thud()*.6,0.12,pan=0.2)             # excavation
for i in range(8): sadd(24.7+i*0.12,clink(1700+i*60),0.05,pan=0.3)      # rebar
sadd(25.5,rumble(1.4),0.10)                                            # pour
for i in range(9): sadd(28.2+i*0.11,clink(1200),0.05,pan=-0.3+i*0.07)   # columns
for i in range(10): sadd(29.1+i*0.13,thud()*.5,0.10)                    # walls
for i in range(8): sadd(31.5+i*0.13,clink(700+i*25),0.07,pan=0.4)       # roof
# scan sweep
n=int(1.7*SR); tt=np.arange(n)/SR; f=300*np.exp(tt*1.4)
sadd(38.35,np.sin(2*np.pi*np.cumsum(f)/SR)*env(n,.4,.6)*0.4,0.15)
# logo: reverse riser + sub drop
sadd(51.6,riser(1.55,150,3000),0.2)
sadd(53.1,impact(1.2),0.5)
sadd(54.45,impact(.9),0.38)
n=int(1.5*SR); tt=np.arange(n)/SR
sadd(54.45,sum(np.sin(2*np.pi*mtof(m)*tt) for m in (74,78,81,86))*np.exp(-tt*1.4)*env(n,.005,.2)*.15,0.6)  # shimmer bell

# ---------------- MIX ----------------
rvL,rvR=reverb(mL+mR,3.0,5)
musL=mL+0.22*rvL; musR=mR+0.22*rvR
fxrL,fxrR=reverb(sL+sR,1.8,9)
fxL=sL+0.18*fxrL; fxR=sR+0.18*fxrR
# end fade & start fade
fade=np.interp(t,[0,0.05,58.2,60],[0,1,1,0])
mus=np.stack([musL,musR]); fx=np.stack([fxL,fxR])
mus/=np.abs(mus).max(); fx/=np.abs(fx).max()
mix=(0.62*mus+0.55*fx)*fade
mix=np.tanh(mix*1.3)/np.tanh(1.3)
mix*=0.89/np.abs(mix).max()
np.save('out/music_only.npy',(0.62*mus*fade).astype(np.float32))
def wr(path,x):
    d=(np.clip(x,-1,1).T*32767).astype('<i2')
    with wave.open(path,'wb') as w: w.setnchannels(2);w.setsampwidth(2);w.setframerate(SR);w.writeframes(d.tobytes())
wr('out/soundtrack.wav',mix)
print('ok',mix.shape)
