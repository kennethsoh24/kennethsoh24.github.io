// Mech rigs for Chess Fantasia.
// Each Higgsfield mech is one fused, hard-surface mesh, so it gets a hand-placed *rigid* skeleton:
// every bone owns a capsule (segment + radius) and each vertex is bound to the capsule it sits
// deepest inside, with only a thin blend band at the joints. Armour plates therefore move as solid
// pieces and nothing stretches like a soft auto-skin. Bind pose = identity rotations, so poses are
// authored in the model's own axes: the mech faces +z, y is up, +x is its left.
//   rotation about x: + tips an upright bone forward, + swings a hanging limb backward
//   rotation about z: + swings a hanging limb toward +x
import * as THREE from 'three';

// y0..y1: the only heights the bone may claim; rin: a hollow shell (cape, robe) that leaves its core to the bones inside
const L = (n, parent, pivot, a, b, r, y0 = -9, y1 = 9, rin = 0) => ({ n, parent, pivot, a, b, r, y0, y1, rin });
const mirror = list => list.flatMap(b => {
  if (!b.n.endsWith('N')) return [b];
  const m = p => p && [-p[0], p[1], p[2]];
  return [b, { n: b.n.slice(0, -1) + 'P', parent: b.parent && b.parent.endsWith('N') ? b.parent.slice(0, -1) + 'P' : b.parent, pivot: m(b.pivot), a: m(b.a), b: m(b.b), r: b.r, y0: b.y0, y1: b.y1, rin: b.rin }];
});

// game units: feet at y = 0, centred, facing +z (same space as normaliseModel)
export const RIGS = {
  P: { kind: 'biped', bones: [
    L('hips', null, [0, .70, 0], [0, .62, 0], [0, .86, 0], .13),
    ...mirror([
      L('thighN', 'hips', [-.04, .66, 0], [-.04, .66, 0], [-.04, .36, 0], .055),
      L('shinN', 'thighN', [-.04, .36, 0], [-.04, .36, 0], [-.04, 0, 0], .07),
    ]),
    L('spine', 'hips', [0, .86, 0], [0, .86, 0], [0, 1.04, 0], .14),
    L('chest', 'spine', [0, 1.04, 0], [0, 1.04, 0], [0, 1.30, 0], .27),
    L('head', 'chest', [0, 1.36, 0], [0, 1.42, 0], [0, 1.9, 0], .16),
    ...mirror([
      L('armN', 'chest', [-.25, 1.12, 0], [-.27, 1.1, 0], [-.30, .86, 0], .085),
      L('foreN', 'armN', [-.30, .86, 0], [-.30, .84, 0], [-.35, .48, 0], .085),
    ]),
    L('spear', 'chest', [-.34, .66, -.26], [-.59, .31, -.26], [.59, 1.95, -.26], .045),   // slung across the back
  ] },
  N: { kind: 'biped', bones: [
    L('hips', null, [-.06, .76, .03], [-.06, .66, .03], [-.06, .9, .03], .14),
    L('thighN', 'hips', [-.1, .72, .03], [-.1, .72, .03], [-.1, .38, .03], .06, -9, .74),
    L('shinN', 'thighN', [-.1, .38, .03], [-.1, .38, .03], [-.1, 0, .03], .075),
    L('thighP', 'hips', [-.02, .72, .03], [-.02, .72, .03], [-.02, .38, .03], .06, -9, .74),
    L('shinP', 'thighP', [-.02, .38, .03], [-.02, .38, .03], [-.02, 0, .03], .075),
    L('spine', 'hips', [-.06, .9, .03], [-.06, .9, .03], [-.06, 1.08, .03], .15),
    L('chest', 'spine', [-.06, 1.08, .03], [-.06, 1.1, .05], [-.06, 1.5, .08], .3, 1.0, 1.58),
    L('head', 'chest', [-.04, 1.56, 0], [-.05, 1.66, -.02], [-.05, 2.0, .12], .22, 1.55),
    L('armN', 'chest', [-.31, 1.24, .03], [-.32, 1.22, .03], [-.36, .98, .05], .085, -9, 1.32),
    L('foreN', 'armN', [-.36, .98, .05], [-.36, .96, .05], [-.39, .7, .08], .095),
    L('armP', 'chest', [.18, 1.24, .03], [.19, 1.22, .03], [.21, 1.0, .03], .085, -9, 1.32),
    L('foreP', 'armP', [.21, 1.0, .03], [.21, .98, .03], [.23, .68, .03], .095),
    L('lance', 'foreN', [-.34, .73, .08], [-.57, .37, .18], [.59, 2.14, -.32], .05),
  ] },
  B: { kind: 'biped', bones: [
    L('hips', null, [.05, .9, -.03], [.05, .84, -.03], [.05, 1.0, -.03], .13, .8, 1.06),
    L('thighN', 'hips', [0, .88, -.03], [0, .88, -.03], [0, .45, -.03], .07, -9, .9),
    L('shinN', 'thighN', [0, .45, -.03], [0, .45, -.03], [0, 0, -.03], .075),
    L('thighP', 'hips', [.1, .88, -.03], [.1, .88, -.03], [.1, .45, -.03], .07, -9, .9),
    L('shinP', 'thighP', [.1, .45, -.03], [.1, .45, -.03], [.1, 0, -.03], .075),
    L('chest', 'hips', [.02, 1.08, -.03], [.02, 1.1, -.03], [.03, 1.9, -.01], .45, 1.05, 1.94),
    L('robe', 'chest', [.02, 1.08, -.03], [.02, .62, -.08], [.02, 1.06, -.08], .45, .5, 1.08, .16),   // lower cape: a shell around the legs, hung from the chest so it never tears
    L('head', 'chest', [.03, 1.94, .0], [.03, 1.98, .02], [.03, 2.3, .05], .2, 1.92),
    L('armN', 'chest', [-.13, 1.6, 0], [-.15, 1.58, .02], [-.36, 1.57, .14], .075, 1.45, 1.72),
    L('staff', 'armN', [-.385, 1.57, .15], [-.36, .2, -.12], [-.415, 2.4, .29], .07),
  ] },
  Q: { kind: 'robe', bones: [
    L('gown', null, [0, .9, .02], [0, .05, .02], [0, 1.25, .04], .62, -9, 1.36),
    L('torso', 'gown', [0, 1.36, .05], [0, 1.36, .05], [0, 1.9, .06], .3, 1.32, 1.96),
    L('head', 'torso', [0, 1.95, .08], [0, 2.02, .08], [0, 2.6, .08], .2, 1.93),
    L('armN', 'torso', [-.19, 1.87, .08], [-.19, 1.85, .08], [-.19, 1.56, .08], .07, 1.45),
    L('foreN', 'armN', [-.19, 1.56, .08], [-.2, 1.55, .1], [-.32, 1.56, .45], .08, 1.2),
    L('sceptre', 'foreN', [-.31, 1.55, .45], [-.3, 0, .46], [-.3, 1.9, .46], .07),   // a floor-length staff
    L('armP', 'torso', [.19, 1.87, .08], [.19, 1.85, .08], [.19, 1.56, .08], .07, 1.45),
    L('foreP', 'armP', [.19, 1.56, .08], [.19, 1.55, .08], [.21, 1.1, .1], .08, 1.02),
  ] },
  K: { kind: 'robe', bones: [
    L('gown', null, [0, .9, 0], [0, .05, -.04], [0, 1.25, -.04], .7, -9, 1.38),
    L('torso', 'gown', [0, 1.38, .03], [0, 1.38, .03], [0, 1.92, .05], .3, 1.34, 1.97),
    L('head', 'torso', [0, 1.96, .07], [0, 2.02, .08], [0, 2.65, .08], .2, 1.94),
    ...mirror([
      L('armN', 'torso', [-.19, 1.88, .09], [-.19, 1.86, .09], [-.21, 1.22, .1], .09, 1.15),
      L('foreN', 'armN', [-.21, 1.22, .1], [-.21, 1.2, .1], [-.22, .45, .08], .09, .38),
    ]),
  ] },
  R: { kind: 'turret', bones: [
    L('base', null, [0, .45, -.07], [0, .36, -.07], [0, 1.02, -.07], .3),
    L('turret', 'base', [0, 1.04, -.07], [0, 1.1, -.07], [0, 1.42, -.07], .48, 1.0),
    L('cannon', 'turret', [.06, 1.48, -.04], [.05, 1.48, -.06], [.12, 1.6, .62], .14, 1.38),
    ...mirror([
      L('legBN', 'base', [-.2, .48, -.31], [-.2, .48, -.31], [-.42, .22, -.32], .075),
      L('footBN', 'legBN', [-.42, .22, -.32], [-.42, .22, -.32], [-.55, 0, -.3], .08),
      L('legFN', 'base', [-.24, .48, .24], [-.24, .48, .24], [-.28, .22, .3], .075),
      L('footFN', 'legFN', [-.28, .22, .3], [-.28, .22, .3], [-.34, 0, .36], .08),
    ]),
  ] },
};

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _p = new THREE.Vector3(), _d = new THREE.Vector3();
function segDist(p, a, b) {
  _d.subVectors(b, a); const l2 = _d.lengthSq();
  const t = l2 > 0 ? Math.max(0, Math.min(1, _p.subVectors(p, a).dot(_d) / l2)) : 0;
  return _p.copy(a).addScaledVector(_d, t).distanceTo(p);
}

// skinIndex / skinWeight for one geometry (cached on the geometry per rig)
export function weightGeometry(geo, spec, tau = .07) {
  if (geo.userData.rigged === spec) return;
  const pos = geo.attributes.position, n = pos.count, B = spec.bones;
  const A = B.map(b => new THREE.Vector3(...b.a)), Bv = B.map(b => new THREE.Vector3(...b.b));
  const si = new Uint16Array(n * 4), sw = new Float32Array(n * 4), v = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    v.fromBufferAttribute(pos, i);
    let s1 = 1e9, s2 = 1e9, i1 = 0, i2 = 0;
    for (let k = 0; k < B.length; k++) {
      const dd = segDist(v, A[k], Bv[k]);
      const s = dd / B[k].r + (v.y < B[k].y0 || v.y > B[k].y1 || dd < B[k].rin ? 50 : 0);
      if (s < s1) { s2 = s1; i2 = i1; s1 = s; i1 = k; } else if (s < s2) { s2 = s; i2 = k; }
    }
    // blend only across a real joint (parent <-> child); neighbouring limbs never pull on each other
    const joint = B[i1].parent === B[i2].n || B[i2].parent === B[i1].n;
    const w2 = joint ? Math.exp(-(s2 - s1) / tau) : 0, w1 = 1;
    si[i * 4] = i1; si[i * 4 + 1] = i2;
    sw[i * 4] = w1 / (w1 + w2); sw[i * 4 + 1] = w2 / (w1 + w2);
  }
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
  geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
  geo.userData.rigged = spec;
}

// bones in bind pose (identity rotations); returns { root, bones: {name: Bone}, list }
export function makeSkeleton(spec) {
  const map = {}, list = [];
  for (const b of spec.bones) {
    const bone = new THREE.Bone(); bone.name = b.n;
    const par = b.parent ? spec.bones.find(x => x.n === b.parent) : null;
    bone.position.set(b.pivot[0] - (par ? par.pivot[0] : 0), b.pivot[1] - (par ? par.pivot[1] : 0), b.pivot[2] - (par ? par.pivot[2] : 0));
    map[b.n] = bone; list.push(bone);
    if (par) map[par.n].add(bone);
  }
  list[0].updateMatrixWorld(true);
  const rest = {}; for (const b of list) rest[b.name] = b.position.clone();
  return { root: list[0], bones: map, list, rest, skeleton: new THREE.Skeleton(list) };
}

// pose = { bone: [rx, ry, rz] | { r: [rx, ry, rz] | q: Quaternion, p: [dx, dy, dz] } } relative to bind;
// unlisted bones return to rest. Returns { q: {name: Quaternion}, p: {name: Vector3} }
const _e = new THREE.Euler();
export function poseTarget(rig, pose) {
  const q = {}, p = {};
  for (const name in rig.bones) {
    const v = pose[name], rest = rig.rest[name];
    const r = Array.isArray(v) ? v : v && v.r;
    q[name] = v && v.q ? v.q.clone() : r ? new THREE.Quaternion().setFromEuler(_e.set(r[0], r[1], r[2], 'YXZ')) : new THREE.Quaternion();
    p[name] = rest.clone(); if (v && v.p) p[name].add(new THREE.Vector3(...v.p));
  }
  return { q, p };
}
export function poseNow(rig) {
  const q = {}, p = {};
  for (const name in rig.bones) { q[name] = rig.bones[name].quaternion.clone(); p[name] = rig.bones[name].position.clone(); }
  return { q, p };
}
export function blendPose(rig, from, to, k) {
  for (const name in rig.bones) {
    const b = rig.bones[name];
    b.quaternion.slerpQuaternions(from.q[name], to.q[name], k);
    b.position.lerpVectors(from.p[name], to.p[name], k);
  }
}
