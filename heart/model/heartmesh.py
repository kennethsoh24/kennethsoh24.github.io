import numpy as np, trimesh, sys
from skimage import measure

def U(px,py,z): return np.array([(px-504)/336.0,(504-py)/336.0,z],dtype=np.float32)

def smin(a,b,k):
    h=np.clip(0.5+0.5*(b-a)/k,0,1); return b*(1-h)+a*h-k*h*(1-h)
def seg(P,a,b,ra,rb=None):
    rb=ra if rb is None else rb
    ba=b-a; pa=P-a
    h=np.clip((pa@ba)/(ba@ba),0,1)
    q=pa-h[...,None]*ba
    return np.linalg.norm(q,axis=-1)-(ra+(rb-ra)*h)
def ell(P,c,r):
    q=(P-c)/r; k0=np.linalg.norm(q,axis=-1); 
    return (k0-1)*min(r)
def poly(P,pts,r,r2=None):
    r2=r if r2 is None else r2
    n=len(pts)-1; d=None
    for i in range(n):
        ra=r+(r2-r)*i/n; rb=r+(r2-r)*(i+1)/n
        s=seg(P,pts[i],pts[i+1],ra,rb); d=s if d is None else np.minimum(d,s)
    return d

# ---- vessels: (points, radius_start, radius_end, open_end)
SVC=[U(330,400,0.02),U(352,260,0.0),U(372,165,-0.02)]
IVC=[U(330,640,-0.12),U(318,735,-0.22)]
AZY=[U(372,300,-0.02),U(305,282,0.14)]
AORTA=[U(505,540,0.02),U(505,380,0.06),U(522,240,0.02),U(560,175,-0.12),U(620,165,-0.32),U(665,215,-0.48),U(680,360,-0.56),U(680,600,-0.56)]
BRACH=[U(538,205,-0.04),U(528,95,-0.04)]
LCC=[U(590,175,-0.22),U(598,95,-0.24)]
LSUB=[U(636,185,-0.38),U(668,105,-0.42)]
PULM=[U(565,580,0.50),U(582,450,0.58),U(605,350,0.40)]
LPA=[U(605,350,0.40),U(700,350,0.16),U(800,372,0.02)]
RPA=[U(595,350,0.20),U(480,330,-0.22),U(405,335,-0.36)]
PV=[[U(520,430,-0.5),U(430,415,-0.62)],[U(525,480,-0.5),U(440,505,-0.62)],
    [U(650,430,-0.5),U(745,410,-0.6)],[U(650,480,-0.5),U(745,505,-0.6)]]

def body(P):
    Pz=P.copy(); Pz[...,2]*=1.22
    d=seg(Pz,U(535,545,0),U(450,905,0.10*1.22),0.70,0.16)        # ventricular cone
    d=smin(d,ell(P,U(600,670,-0.10),np.array([.52,.68,.46])),0.22) # LV bulge
    d=smin(d,ell(P,U(460,650,0.12),np.array([.50,.60,.42])),0.22)  # RV
    d=smin(d,ell(P,U(335,480,0.02),np.array([.32,.42,.32])),0.10)  # RA
    d=smin(d,ell(P,U(395,405,0.30),np.array([.20,.11,.12])),0.06)  # R auricle
    d=smin(d,ell(P,U(585,430,-0.36),np.array([.40,.30,.30])),0.10) # LA
    d=smin(d,ell(P,U(700,455,0.16),np.array([.17,.11,.12])),0.05) # L auricle
    return d

vessels=[(SVC,.16,.15,True),(IVC,.15,.14,True),(AZY,.075,.07,True),(AORTA,.17,.14,False),
         (BRACH,.09,.08,True),(LCC,.07,.065,True),(LSUB,.075,.07,True),
         (PULM,.17,.16,False),(LPA,.13,.12,True),(RPA,.11,.10,True)]+[(p,.085,.08,True) for p in PV]

def sdf_base(P):
    d=body(P)
    for pts,r1,r2,_ in vessels:
        d=smin(d,poly(P,pts,r1,r2),0.07 if r1>.1 else 0.045)
    # descending aorta bottom open too
    return d

def openings(P,d):
    for pts,r1,r2,op in vessels+[(AORTA[::-1][:2][::-1],.15,.14,True)]:
        if not op: continue
        a,b=pts[-2],pts[-1]; dirv=(b-a)/np.linalg.norm(b-a)
        inner=seg(P,b-dirv*0.22,b+dirv*0.3,r2*0.62)
        d=np.maximum(d,-inner)
    return d

def noise(P):
    x,y,z=P[...,0],P[...,1],P[...,2]
    n=(np.sin(9.1*x+2.3*np.sin(7.3*y))*np.sin(8.7*y+1.7*z)*np.sin(9.9*z+1.3*x)
       +0.5*np.sin(21*x+3*y)*np.sin(19*y-5*z)*np.sin(23*z+2*x))
    return n

# surface finder for coronary vessels (ray march from front along -z)
def surf_z(px,py,front=True):
    zs=np.linspace(1.2,-1.2,600) if front else np.linspace(-1.2,1.2,600)
    P=np.stack([np.full_like(zs,(px-504)/336),np.full_like(zs,(504-py)/336),zs],-1)
    d=sdf_base(P); i=np.argmax(d<0); return zs[i]
def on_surface(path,front=True,lift=0.0):
    out=[]; path=np.array(path,float)
    # smooth, densified path (Chaikin) so vessels hug and curve over the surface
    for _ in range(3):
        q=[path[0]]
        for a,b in zip(path[:-1],path[1:]): q+= [0.75*a+0.25*b,0.25*a+0.75*b]
        q.append(path[-1]); path=np.array(q)
    for px,py in path:
        z=surf_z(px,py,front); out.append(U(px,py,z+(lift if front else -lift)))
    return out
COR=[ (on_surface([(578,495),(560,560),(538,640),(520,720),(495,800),(468,870),(452,912)]),.042,.026),   # LAD
      (on_surface([(545,610),(590,660),(628,720),(660,790),(672,840)]),.032,.02),           # diagonal 1
      (on_surface([(512,740),(555,790),(585,850),(598,890)]),.03,.02),                      # diagonal 2
      (on_surface([(478,505),(440,560),(408,630),(392,710),(390,790),(405,850)]),.038,.024),           # right coronary
      (on_surface([(405,640),(440,700),(458,770),(462,830)]),.028,.018),                     # marginal
      (on_surface([(690,520),(722,580),(740,650),(742,730)]),.032,.02),                     # circumflex edge
      (on_surface([(560,660),(470,880)],front=False),.036,.022),                   # posterior IV
]
def sdf(P):
    d=sdf_base(P)
    # anterior groove
    for pts,r1,r2 in COR[:1]:
        d=np.maximum(d,-(poly(P,pts,0.05,0.03))*1.0+0.0) if False else d
    for pts,r1,r2 in COR:
        d=smin(d,poly(P,pts,r1,r2),0.025)
    d=openings(P,d)
    d=d+0.010*noise(P)
    return d

step=float(sys.argv[1]) if len(sys.argv)>1 else 0.02
xs=np.arange(-1.65,1.75,step); ys=np.arange(-1.65,1.75,step); zs=np.arange(-1.25,1.05,step)
X,Y,Z=np.meshgrid(xs,ys,zs,indexing='ij')
P=np.stack([X,Y,Z],-1).astype(np.float32)
D=np.empty(X.shape,np.float32)
for i in range(0,len(xs),16): D[i:i+16]=sdf(P[i:i+16])
v,f,n,_=measure.marching_cubes(D,0.0,spacing=(step,)*3)
v+=np.array([xs[0],ys[0],zs[0]])
m=trimesh.Trimesh(v,f,process=True)
# keep largest component
comps=m.split(only_watertight=False); m=max(comps,key=lambda c:len(c.faces))
trimesh.smoothing.filter_taubin(m,iterations=8)
print('verts',len(m.vertices),'faces',len(m.faces))
m.export(sys.argv[2] if len(sys.argv)>2 else 'heart.obj')
