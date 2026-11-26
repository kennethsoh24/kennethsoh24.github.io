import sys, numpy as np, trimesh
sys.argv=['x']
exec(open('heartmesh.py').read().split('step=float')[0])
m=trimesh.load(sys_path if False else 'heart_mid.obj', process=False)
V=m.vertices.astype(np.float32); N=m.vertex_normals.astype(np.float32); F=m.faces.astype(np.uint32)
def chunked(fn,P):
    out=np.empty(len(P),np.float32)
    for i in range(0,len(P),20000): out[i:i+20000]=fn(P[i:i+20000])
    return out
# ambient occlusion from the SDF
ao=np.zeros(len(V),np.float32)
for i in range(1,6):
    h=0.035*i; ao+=(h-chunked(sdf,V+N*h))/(2**i)
ao=np.clip(1-6.0*ao,0,1)
# regions
bd=chunked(body,V)
vessel=np.clip((bd-0.01)/0.08,0,1)            # 1 on great vessels
y=V[:,1]; ypx=504-y*336
vent=(1-vessel)*np.clip((ypx-470)/90,0,1)      # below the AV groove
atria=(1-vessel)*(1-np.clip((ypx-470)/90,0,1))
cor=np.full(len(V),9.0,np.float32)
for pts,r1,r2 in COR: cor=np.minimum(cor,chunked(lambda P:poly(P,pts,r1,r2),V))
cor=np.clip(1-(cor-0.0)/0.03,0,1)*(1-vessel)
attr=(np.stack([ao,vent,atria,np.maximum(cor,0)],1)*255).round().astype(np.uint8)
n8=np.clip(np.round(N*127),-127,127).astype(np.int8)
assert len(V)<65536
hdr=np.array([len(V),len(F)*3],np.uint32)
with open('heart.bin','wb') as f:
    f.write(hdr.tobytes()); f.write(V.tobytes()); f.write(n8.tobytes()); f.write(attr.tobytes()); f.write(F.astype(np.uint16).tobytes())
print(len(V),len(F),'ao',ao.min(),ao.mean(),'cor',(cor>0.5).mean(),'vessel',(vessel>0.5).mean())
