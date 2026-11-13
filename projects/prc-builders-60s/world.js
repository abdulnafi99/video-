// PRC Builders — 60s film. Three.js architectural world.
// Every frame is a pure function of film time t (hf-seek). No rAF loops, no clocks, no Math.random.
import * as THREE from "./lib/three.module.js";

const W = 1920, H = 1080;
const canvas = document.getElementById("gl");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, powerPreference: "high-performance" });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.localClippingEnabled = true;

// ------------------------------------------------------------------ helpers
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const easeIO = (x) => { x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const easeO = (x) => { x = clamp(x); return 1 - Math.pow(1 - x, 3); };
const sIO = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const span = (t, a, b) => clamp((t - a) / (b - a));
function rng(seed) { let a = seed | 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const GOLD = new THREE.Color(0xc9a45c);

// ------------------------------------------------------- procedural textures
function canvasTex(size, draw, repeat = [1, 1], srgb = true) {
  const c = document.createElement("canvas"); c.width = c.height = size;
  const g = c.getContext("2d"); draw(g, size);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = 8;
  return t;
}
function noise(g, s, seed, alpha, scale = 1) {
  const r = rng(seed); const img = g.getImageData(0, 0, s, s); const d = img.data;
  for (let i = 0; i < d.length; i += 4) { const n = (r() - 0.5) * 255 * alpha * scale; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  g.putImageData(img, 0, 0);
}
const T = {
  wood: () => canvasTex(512, (g, s) => {
    g.fillStyle = "#9a6a3f"; g.fillRect(0, 0, s, s); const r = rng(11);
    for (let i = 0; i < 160; i++) { const y = r() * s; g.strokeStyle = `rgba(${60 + r() * 40},${35 + r() * 20},${15},${0.15 + r() * 0.25})`; g.lineWidth = 1 + r() * 3;
      g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= s; x += 32) g.lineTo(x, y + Math.sin(x * 0.02 + i) * 3 + (r() - 0.5) * 2); g.stroke(); }
    noise(g, s, 12, 0.06);
  }),
  concrete: () => canvasTex(512, (g, s) => { g.fillStyle = "#8e8c88"; g.fillRect(0, 0, s, s); const r = rng(21);
    for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${r() < 0.5 ? 60 : 200},${r() < 0.5 ? 60 : 200},${r() < 0.5 ? 60 : 200},0.035)`; const x = r() * s, y = r() * s, w = 4 + r() * 40; g.fillRect(x, y, w, w * 0.6); }
    noise(g, s, 22, 0.1); }),
  render: () => canvasTex(512, (g, s) => { g.fillStyle = "#eceae5"; g.fillRect(0, 0, s, s); noise(g, s, 31, 0.035); }),
  grass: () => canvasTex(512, (g, s) => { g.fillStyle = "#4d6b34"; g.fillRect(0, 0, s, s); const r = rng(41);
    for (let i = 0; i < 9000; i++) { const v = r(); g.fillStyle = `rgba(${50 + v * 50},${80 + v * 60},${30 + v * 20},0.5)`; g.fillRect(r() * s, r() * s, 1.5, 3); } }, [40, 40]),
  stone: () => canvasTex(512, (g, s) => { g.fillStyle = "#3f3e3c"; g.fillRect(0, 0, s, s); const r = rng(51); let y = 0;
    while (y < s) { const h = 10 + r() * 22; let x = -r() * 60; while (x < s) { const w = 40 + r() * 110; const v = 45 + r() * 45;
      g.fillStyle = `rgb(${v + 4},${v + 2},${v})`; g.fillRect(x + 1.5, y + 1.5, w - 3, h - 3); x += w; } y += h; }
    noise(g, s, 52, 0.08); }),
  paver: () => canvasTex(512, (g, s) => { g.fillStyle = "#6b6863"; g.fillRect(0, 0, s, s); const r = rng(61);
    for (let y = 0; y < s; y += 64) for (let x = 0; x < s; x += 128) { const v = 150 + r() * 25; g.fillStyle = `rgb(${v},${v - 3},${v - 8})`; g.fillRect(x + ((y / 64) % 2) * 64 + 2, y + 2, 124, 60); }
    noise(g, s, 62, 0.05); }),
  asphalt: () => canvasTex(512, (g, s) => { g.fillStyle = "#2b2c2e"; g.fillRect(0, 0, s, s); noise(g, s, 71, 0.12); }, [30, 2]),
  marble: () => canvasTex(512, (g, s) => { g.fillStyle = "#f1efea"; g.fillRect(0, 0, s, s); const r = rng(81);
    for (let i = 0; i < 26; i++) { g.strokeStyle = `rgba(120,115,110,${0.08 + r() * 0.22})`; g.lineWidth = 0.6 + r() * 2.2; g.beginPath();
      let x = r() * s, y = 0; g.moveTo(x, y); while (y < s) { x += (r() - 0.5) * 40; y += 12 + r() * 20; g.lineTo(x, y); } g.stroke(); }
    noise(g, s, 82, 0.03); }),
  brushed: () => canvasTex(256, (g, s) => { g.fillStyle = "#b08d57"; g.fillRect(0, 0, s, s); const r = rng(91);
    for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(255,240,210,${r() * 0.08})`; g.fillRect(0, r() * s, s, 1); } }),
  rug: () => canvasTex(256, (g, s) => { g.fillStyle = "#b9ab95"; g.fillRect(0, 0, s, s); noise(g, s, 95, 0.12); }),
  fabric: () => canvasTex(256, (g, s) => { g.fillStyle = "#cfc6b8"; g.fillRect(0, 0, s, s); noise(g, s, 96, 0.1); }),
};

// ---------------------------------------------------------------- materials
const CLIP_SOLID = [new THREE.Plane(V(-1, 0, 0), 1e5)];                 // keep x < s
const CLIP_LINES = [new THREE.Plane(V(0, -1, 0), 1e5), new THREE.Plane(V(1, 0, 0), 1e5)]; // keep y < h, keep x > s
const allMats = [];
function M(params, clip = true) {
  const m = new THREE.MeshStandardMaterial(params);
  if (clip) m.clippingPlanes = CLIP_SOLID;
  allMats.push(m);
  return m;
}
const tex = Object.fromEntries(Object.entries(T).map(([k, f]) => [k, f()]));
const mats = {
  render: M({ color: 0xf2f0eb, map: tex.render, roughness: 0.88 }),
  concreteRaw: M({ color: 0xa3a19c, map: tex.concrete, roughness: 0.95 }),
  slab: M({ color: 0xdedbd4, map: tex.concrete, roughness: 0.85 }),
  fascia: M({ color: 0x2b2d31, roughness: 0.5, metalness: 0.4 }),
  stone: M({ color: 0xffffff, map: tex.stone, roughness: 0.9 }),
  timber: M({ color: 0xffffff, map: tex.wood, roughness: 0.62 }),
  timberDark: M({ color: 0x8d6a4a, map: tex.wood, roughness: 0.7 }),
  steel: M({ color: 0x26282c, roughness: 0.45, metalness: 0.7 }),
  glass: M({ color: 0x1b242c, roughness: 0.04, metalness: 0.8, emissive: 0xffb369, emissiveIntensity: 0, envMapIntensity: 1.4, transparent: true, opacity: 0.62 }),
  interiorWarm: M({ color: 0x4a3c31, roughness: 0.9, emissive: 0xffa95a, emissiveIntensity: 0 }),
  paver: M({ color: 0xffffff, map: tex.paver, roughness: 0.85 }),
  coping: M({ color: 0xe6e2da, roughness: 0.6 }),
  water: M({ color: 0x1f8fb5, roughness: 0.03, metalness: 0.35, emissive: 0x0b4a64, emissiveIntensity: 0.25, envMapIntensity: 1.6 }),
  grass: M({ color: 0xffffff, map: tex.grass, roughness: 0.98 }),
  hedge: M({ color: 0x3c5a2c, roughness: 0.95 }),
  leaf: M({ color: 0x46683a, roughness: 0.9 }),
  leafDark: M({ color: 0x2f4c2b, roughness: 0.9 }),
  trunk: M({ color: 0x5b4636, roughness: 0.9 }),
  asphalt: M({ color: 0xffffff, map: tex.asphalt, roughness: 0.95 }),
  kerb: M({ color: 0xb9b6b0, roughness: 0.9 }),
  lineWhite: M({ color: 0xe8e8e8, roughness: 0.8 }),
  downlight: M({ color: 0xffffff, emissive: 0xffc88a, emissiveIntensity: 0 }),
  scaffold: M({ color: 0x9aa0a6, roughness: 0.5, metalness: 0.6 }),
  scaffoldBoard: M({ color: 0xa8865a, map: tex.wood, roughness: 0.8 }),
  // old house (renovation "before")
  oldWall: M({ color: 0xcdbb98, map: tex.render, roughness: 0.95 }),
  oldRoof: M({ color: 0x7b4636, roughness: 0.85 }),
  oldTrim: M({ color: 0x6e6352, roughness: 0.9 }),
};
const lineMat = new THREE.LineBasicMaterial({ color: 0xf3d79c, transparent: true, opacity: 1.0, clippingPlanes: CLIP_LINES, depthWrite: false });
const lineMatDim = new THREE.LineBasicMaterial({ color: 0x9cc0e6, transparent: true, opacity: 0.55, clippingPlanes: CLIP_LINES, depthWrite: false });

// --------------------------------------------------------------- geometry
// box anchored at its bottom: (x, y0, z) = bottom-centre
function box(w, h, d, mat, x, y0, z, parent, opts = {}) {
  const g = new THREE.BoxGeometry(w, h, d); g.translate(0, h / 2, 0);
  if (opts.uv) { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * opts.uv[0], uv.getY(i) * opts.uv[1]); }
  const m = new THREE.Mesh(g, mat);
  m.position.set(x, y0, z); m.castShadow = opts.cast !== false; m.receiveShadow = true;
  if (parent) parent.add(m);
  return m;
}

// ---------------------------------------------------------- sky + lighting
function skyTexture(top, mid, horizon, below, sunAz, sunEl, sunCol, glow) {
  const c = document.createElement("canvas"); c.width = 1024; c.height = 512; const g = c.getContext("2d");
  const grd = g.createLinearGradient(0, 0, 0, 512);
  grd.addColorStop(0, top); grd.addColorStop(0.32, mid); grd.addColorStop(0.495, horizon); grd.addColorStop(0.52, below); grd.addColorStop(1, below);
  g.fillStyle = grd; g.fillRect(0, 0, 1024, 512);
  // sun glow
  const sx = ((sunAz / (Math.PI * 2)) % 1 + 1) % 1 * 1024, sy = 256 - (sunEl / (Math.PI / 2)) * 256;
  for (const dx of [-1024, 0, 1024]) {
    const r = g.createRadialGradient(sx + dx, sy, 2, sx + dx, sy, 420 * glow);
    r.addColorStop(0, sunCol); r.addColorStop(0.08, sunCol.replace(/[\d.]+\)$/, "0.55)")); r.addColorStop(1, "rgba(255,200,140,0)");
    g.fillStyle = r; g.fillRect(0, 0, 1024, 512);
  }
  // faint cloud streaks
  const rr = rng(5);
  for (let i = 0; i < 26; i++) { g.fillStyle = `rgba(255,${235 - glow * 40},${220 - glow * 70},${0.03 + rr() * 0.05})`; const y = 120 + rr() * 120;
    g.beginPath(); g.ellipse(rr() * 1024, y, 80 + rr() * 220, 4 + rr() * 8, 0, 0, Math.PI * 2); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.mapping = THREE.EquirectangularReflectionMapping; return t;
}
// sun azimuth measured like the equirect u coordinate; the facade faces +z
const SUN = {
  day: { dir: V(0.55, 0.78, 0.62).normalize(), color: new THREE.Color(0xfff1de), I: 3.1, hemiSky: new THREE.Color(0xbcd3ee), hemiGround: new THREE.Color(0x5a5446), hemiI: 1.0, fog: new THREE.Color(0xd9e2ea) },
  gold: { dir: V(-0.72, 0.22, 0.66).normalize(), color: new THREE.Color(0xff9d52), I: 3.8, hemiSky: new THREE.Color(0x7d88b0), hemiGround: new THREE.Color(0x3a281d), hemiI: 0.45, fog: new THREE.Color(0xe6b28c) },
};
const skyDay = skyTexture("#4f7fb8", "#8fb4d9", "#e6eef2", "#9aa39a", 0.9, 0.9, "rgba(255,250,235,1)", 0.5);
const skyGold = skyTexture("#2d3b63", "#8a7aa0", "#ffc28a", "#6e5242", -0.75 + Math.PI * 1.5, 0.2, "rgba(255,214,150,1)", 1.0);

function makeSkyDome(texture) {
  const m = new THREE.MeshBasicMaterial({ map: texture, side: THREE.BackSide, fog: false, depthWrite: false, clippingPlanes: CLIP_SOLID });
  const s = new THREE.Mesh(new THREE.SphereGeometry(400, 48, 24), m);
  s.renderOrder = -10; return s;
}

// ======================================================== EXTERIOR SCENE
const ext = new THREE.Scene();
ext.fog = new THREE.Fog(0xd9e2ea, 60, 260);
const skyDomeDay = makeSkyDome(skyDay), skyDomeGold = makeSkyDome(skyGold);
ext.add(skyDomeDay, skyDomeGold);
const hemi = new THREE.HemisphereLight(0xbcd3ee, 0x5a5446, 1.0); ext.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 3); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03; sun.shadow.radius = 3;
ext.add(sun, sun.target);
const warmLights = [];
[[-5, 2.2, 1.5], [-1.5, 2.2, 1.5], [2.5, 5.6, 2.5], [-3, 5.6, 2]].forEach(([x, y, z]) => { const p = new THREE.PointLight(0xffa95a, 0, 9, 1.6); p.position.set(x, y, z); ext.add(p); warmLights.push(p); });
const poolLight = new THREE.PointLight(0x55c8ff, 0, 7, 1.8); poolLight.position.set(-3, 0.2, 6.8); ext.add(poolLight);

// ground
const lawn = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), mats.grass); lawn.rotation.x = -Math.PI / 2; lawn.receiveShadow = true; ext.add(lawn);

// ---------- main house (front faces +z) ----------
const house = new THREE.Group(); ext.add(house);
const parts = []; // { mesh, stage }
const P = (mesh, stage) => { parts.push({ mesh, stage, finalY: mesh.position.y }); return mesh; };
const FF0 = 3.95; // first floor level
// site plinth + terrace
P(box(17, 0.3, 11.5, mats.paver, -0.5, 0, -0.2, house, { uv: [3, 2] }), 0.0);
// ground floor
P(box(11.2, 3.4, 0.3, mats.render, -2.4, 0.3, -4.0, house), 0.22);              // back wall
P(box(0.5, 3.75, 7.8, mats.stone, -8.0, 0.3, -0.2, house, { uv: [1.2, 1] }), 0.24); // stone feature wall
P(box(0.3, 3.4, 7.8, mats.render, 3.1, 0.3, -0.2, house), 0.26);                 // right wall
P(box(2.6, 3.4, 0.3, mats.render, 1.95, 0.3, 3.55, house), 0.28);                // front solid
P(box(8.3, 3.2, 0.06, mats.interiorWarm, -3.6, 0.35, 2.6, house, { cast: false }), 0.6); // interior glow plane
P(box(8.3, 3.25, 0.05, mats.glass, -3.6, 0.32, 3.6, house), 0.62);                // front glazing
for (let i = 0; i <= 5; i++) P(box(0.07, 3.25, 0.1, mats.fascia, -7.75 + i * 1.66, 0.32, 3.62, house), 0.63);
// columns (structure) — slim steel at the cantilever corner
[[7.2, 4.7], [7.2, -3.6]].forEach(([x, z]) => P(box(0.18, 3.65, 0.18, mats.steel, x, 0.3, z, house), 0.12));
// first-floor slab with cantilever over the car porch
P(box(14.4, 0.4, 9.4, mats.slab, 0.3, FF0 - 0.4, 0.3, house, { uv: [3, 2] }), 0.36);
for (let i = 0; i < 6; i++) P(box(0.22, 0.04, 0.22, mats.downlight, -6 + i * 2.4, FF0 - 0.44, 4.4, house, { cast: false }), 0.8);
// first floor volume
P(box(12.4, 3.1, 0.3, mats.render, 0.6, FF0, -3.6, house), 0.44);
P(box(0.3, 3.1, 8.0, mats.render, -5.45, FF0, 0.4, house), 0.46);
P(box(0.3, 3.1, 8.0, mats.render, 6.65, FF0, 0.4, house), 0.48);
P(box(7.0, 0.75, 0.3, mats.render, -2.0, FF0, 4.4, house), 0.5);                  // sill band
P(box(7.0, 0.8, 0.3, mats.render, -2.0, FF0 + 2.3, 4.4, house), 0.52);            // head band
P(box(7.0, 1.55, 0.05, mats.interiorWarm, -2.0, FF0 + 0.75, 3.9, house, { cast: false }), 0.6);
P(box(7.0, 1.55, 0.05, mats.glass, -2.0, FF0 + 0.75, 4.45, house), 0.64);
P(box(5.0, 3.1, 0.05, mats.glass, 4.1, FF0, 4.3, house), 0.64);                   // glass behind slats
const slats = new THREE.Group(); house.add(slats);
for (let i = 0; i < 30; i++) slats.add(P(box(0.07, 3.1, 0.16, mats.timber, 1.7 + i * 0.165, FF0, 4.5, null, { uv: [0.2, 2] }), 0.72 + i * 0.002));
// roof slab + fascia
P(box(14.0, 0.32, 9.0, mats.slab, 0.6, FF0 + 3.1, 0.4, house), 0.66);
P(box(14.2, 0.36, 0.14, mats.fascia, 0.6, FF0 + 3.08, 4.95, house), 0.68);
P(box(14.2, 0.36, 0.14, mats.fascia, 0.6, FF0 + 3.08, -4.15, house), 0.68);
// ground floor roof/terrace edge on the left (over the stone wall line)
P(box(2.8, 0.3, 8.4, mats.slab, -7.0, 3.65, -0.2, house), 0.38);
// pool + deck
P(box(10.4, 0.06, 1.8, mats.timberDark, -3.2, 0.3, 4.6, house, { uv: [6, 1] }), 0.86);
P(box(10.4, 0.12, 4.2, mats.coping, -3.2, 0.24, 7.6, house), 0.88);
P(box(9.4, 0.04, 3.2, mats.water, -3.2, 0.3, 7.6, house, { cast: false }), 0.9);
// driveway
P(box(5.6, 0.06, 10.5, mats.paver, 5.0, 0.0, 9.0, house, { uv: [1.5, 3] }), 0.84);
const houseParts = parts.slice();

// landscaping (not part of the blueprint)
const land = new THREE.Group(); ext.add(land);
function tree(x, z, s = 1, seed = 1, parent = land) {
  const g = new THREE.Group(); const r = rng(seed);
  const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.1 * s, 0.16 * s, 2.6 * s, 7), mats.trunk); tr.position.y = 1.3 * s; tr.castShadow = true; g.add(tr);
  for (let i = 0; i < 6; i++) {
    const c = new THREE.Mesh(new THREE.IcosahedronGeometry((0.9 + r() * 0.6) * s, 1), r() < 0.5 ? mats.leaf : mats.leafDark);
    c.position.set((r() - 0.5) * 1.8 * s, (2.6 + r() * 1.3) * s, (r() - 0.5) * 1.8 * s); c.castShadow = true; c.receiveShadow = true; g.add(c);
  }
  g.position.set(x, 0, z); parent.add(g); return g;
}
function palm(x, z, s = 1, seed = 2, parent = land) {
  const g = new THREE.Group(); const r = rng(seed);
  let px = 0, py = 0; const lean = (r() - 0.5) * 0.25;
  for (let i = 0; i < 8; i++) { const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.14 * s, 0.17 * s, 0.8 * s, 7), mats.trunk); px += lean * 0.8 * s; py += 0.78 * s; seg.position.set(px, py, 0); seg.rotation.z = -lean; seg.castShadow = true; g.add(seg); }
  for (let i = 0; i < 9; i++) {
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.28 * s, 2.6 * s, 4), mats.leaf); const a = (i / 9) * Math.PI * 2;
    f.position.set(px + Math.cos(a) * 1.1 * s, py + 0.1, Math.sin(a) * 1.1 * s); f.rotation.set(Math.sin(a) * 1.2, 0, -Math.cos(a) * 1.2); f.scale.z = 0.25; f.castShadow = true; g.add(f);
  }
  g.position.set(x, 0, z); parent.add(g); return g;
}
tree(-12, 2, 1.25, 3); tree(-11, -6, 1.1, 4); tree(11.5, -5, 1.2, 5); tree(12.5, 5, 0.9, 6);
palm(-9.6, 8.5, 1.0, 7); palm(9.2, -1.5, 0.95, 8); palm(-13.5, 10, 0.9, 9);
for (let i = 0; i < 7; i++) box(1.2, 0.8, 0.9, mats.hedge, -9 + i * 1.3, 0, 11.6, land);
box(16, 0.9, 0.25, mats.render, -2.5, 0, 12.4, land);            // low boundary wall
box(0.25, 0.9, 25, mats.render, -16, 0, 0, land); box(0.25, 0.9, 25, mats.render, 13, 0, 0, land);

// ---------- blueprint edges of the house ----------
const edges = new THREE.Group(); ext.add(edges);
house.updateMatrixWorld(true);
houseParts.forEach(({ mesh }) => {
  const eg = new THREE.EdgesGeometry(mesh.geometry, 25);
  const l = new THREE.LineSegments(eg, mesh.material === mats.glass ? lineMatDim : lineMat);
  mesh.updateMatrixWorld(true); l.applyMatrix4(mesh.matrixWorld); edges.add(l);
});
// blueprint grid
const bpGrid = new THREE.GridHelper(80, 80, 0x3e6a9a, 0x24405f); bpGrid.material.transparent = true; bpGrid.material.opacity = 0.55; bpGrid.material.clippingPlanes = [CLIP_LINES[1]]; bpGrid.position.y = 0.01; ext.add(bpGrid);
const bpGridFine = new THREE.GridHelper(80, 160, 0x1a2d44, 0x1a2d44); bpGridFine.material.transparent = true; bpGridFine.material.opacity = 0.3; bpGridFine.material.clippingPlanes = [CLIP_LINES[1]]; ext.add(bpGridFine);
// glowing scan wall
const scanMat = new THREE.MeshBasicMaterial({ color: 0xf2cf86, transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
const scan = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 40), scanMat); scan.rotation.y = Math.PI / 2; ext.add(scan);
const scanGlowMat = new THREE.MeshBasicMaterial({ color: 0xc9a45c, transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
const scanGlow = new THREE.Mesh(new THREE.PlaneGeometry(60, 40), scanGlowMat); scanGlow.rotation.y = Math.PI / 2; ext.add(scanGlow);

// ---------- scaffolding (construction shot) ----------
const scaffold = new THREE.Group(); ext.add(scaffold);
{
  const xs = [-6.2, -4.4, -2.6, -0.8, 1.0, 2.8, 4.6, 6.4, 7.6];
  xs.forEach((x) => [5.3, 6.4].forEach((z) => box(0.06, 7.6, 0.06, mats.scaffold, x, 0.3, z, scaffold)));
  [1.9, 3.9, 5.9, 7.6].forEach((y) => { [5.3, 6.4].forEach((z) => box(14.0, 0.05, 0.05, mats.scaffold, 0.7, y, z, scaffold)); box(14.0, 0.05, 1.2, mats.scaffoldBoard, 0.7, y + 0.05, 5.85, scaffold); });
  for (let i = 0; i < xs.length - 1; i++) { const d = box(0.04, 2.9, 0.04, mats.scaffold, (xs[i] + xs[i + 1]) / 2, 0, 6.4, scaffold); d.position.y = 2.6; d.geometry.translate(0, -1.45, 0); d.rotation.z = 0.55 * (i % 2 ? 1 : -1); }
}

// ---------- old house (renovation "before") ----------
const oldHouse = new THREE.Group(); ext.add(oldHouse);
{
  box(14, 0.25, 9, mats.paver, -1.5, 0, -0.5, oldHouse, { uv: [3, 2] });
  box(10.5, 3.0, 7.0, mats.oldWall, -2.2, 0.25, -0.5, oldHouse);
  const roofShape = new THREE.Shape(); roofShape.moveTo(-4.3, 0); roofShape.lineTo(4.3, 0); roofShape.lineTo(0, 2.4); roofShape.closePath();
  const rg = new THREE.ExtrudeGeometry(roofShape, { depth: 11.6, bevelEnabled: false }); rg.translate(0, 0, -5.8);
  const roof = new THREE.Mesh(rg, mats.oldRoof); roof.rotation.y = Math.PI / 2; roof.position.set(-2.2, 3.25, -0.5); roof.castShadow = true; oldHouse.add(roof);
  [[-6.2], [-3.6], [0.6]].forEach(([x]) => { box(1.3, 1.3, 0.08, mats.glass, x, 1.3, 3.02, oldHouse); box(1.5, 0.12, 0.2, mats.oldTrim, x, 1.2, 3.05, oldHouse); });
  box(1.0, 2.2, 0.08, mats.oldTrim, -1.5, 0.25, 3.02, oldHouse);
  box(3.6, 0.15, 2.2, mats.oldTrim, -1.5, 2.6, 4.0, oldHouse);
  [-3.1, 0.1].forEach((x) => box(0.12, 2.4, 0.12, mats.oldTrim, x, 0.25, 4.95, oldHouse));
}

// ---------- the street (neighbouring homes) ----------
const street = new THREE.Group(); ext.add(street);
function modernBlock(x, z, w, rot, seed, parent = street) {
  const g = new THREE.Group(); const r = rng(seed);
  const d = 9, h1 = 3.3, h2 = 3.0;
  box(w, 0.25, d + 2, mats.paver, 0, 0, 0, g, { uv: [2, 2] });
  box(w - 0.4, h1, d, mats.render, 0, 0.25, -0.5, g);
  box(w * 0.55, h1 - 0.4, 0.05, mats.glass, -w * 0.15, 0.4, 4.02, g);
  box(w, 0.3, d + 0.8, mats.slab, 0, h1 + 0.25, -0.1, g);
  box(w - 1.0, h2, d - 1.0, r() < 0.5 ? mats.render : mats.slab, 0.2, h1 + 0.55, -0.6, g);
  if (r() < 0.6) for (let i = 0; i < Math.floor(w * 1.6); i++) box(0.06, h2, 0.12, mats.timber, w * 0.05 + i * 0.16 - w * 0.25, h1 + 0.55, 3.45, g);
  box(w * 0.45, 1.3, 0.05, mats.glass, -w * 0.2, h1 + 1.3, 3.42, g);
  box(w - 0.8, 0.28, d - 0.6, mats.slab, 0.2, h1 + h2 + 0.55, -0.6, g);
  box(w, 0.8, 0.2, mats.render, 0, 0, 5.8, g);
  g.position.set(x, 0, z); g.rotation.y = rot; parent.add(g); return g;
}
{
  // road in front of the main house
  const road = box(260, 0.04, 7, mats.asphalt, 0, 0.0, 17, street, { cast: false });
  for (let i = -26; i < 26; i++) box(2.2, 0.01, 0.16, mats.lineWhite, i * 5, 0.04, 17, street, { cast: false });
  box(260, 0.18, 1.6, mats.kerb, 0, 0, 13.2, street, { cast: false }); box(260, 0.18, 1.6, mats.kerb, 0, 0, 20.8, street, { cast: false });
  // same side: semi-D pair, bungalow, terrace row
  modernBlock(-24, 0, 11, 0, 31); modernBlock(-35.2, 0, 11, 0, 32);           // semi-detached pair
  modernBlock(24, 0, 14, 0, 33);                                             // bungalow
  [0, 1, 2, 3].forEach((i) => modernBlock(40 + i * 7.2, 0, 7.2, 0, 40 + i));  // terrace row
  // opposite side
  [-46, -32, -18, -4, 10, 24, 38].forEach((x, i) => modernBlock(x, 34, i % 3 === 0 ? 12 : 9, Math.PI, 60 + i));
  for (let i = -6; i < 7; i++) { tree(i * 11 + 3, 22.6, 0.85, 100 + i, street); }
  for (let i = -5; i < 6; i++) if (Math.abs(i * 12 - 4) > 15) palm(i * 12 - 4, 12.2, 0.85, 200 + i, street);
}

// ======================================================== INTERIOR SCENE
const inn = new THREE.Scene();
inn.background = new THREE.Color(0x1a1714);
const innParts = new THREE.Group(); inn.add(innParts);
const imat = {
  floor: new THREE.MeshStandardMaterial({ color: 0xc8a47c, map: T.wood(), roughness: 0.45 }),
  wall: new THREE.MeshStandardMaterial({ color: 0xefe9df, roughness: 0.9 }),
  ceiling: new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 0.95 }),
  slat: new THREE.MeshStandardMaterial({ color: 0xffffff, map: T.wood(), roughness: 0.6 }),
  fabric: new THREE.MeshStandardMaterial({ color: 0xd7cfc2, map: tex.fabric, roughness: 0.95 }),
  cushion: new THREE.MeshStandardMaterial({ color: 0x9a8a72, roughness: 0.95 }),
  marble: new THREE.MeshStandardMaterial({ color: 0xffffff, map: tex.marble, roughness: 0.18 }),
  brass: new THREE.MeshStandardMaterial({ color: 0xc9a45c, map: tex.brushed, roughness: 0.35, metalness: 1.0 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x2a2826, roughness: 0.55, metalness: 0.2 }),
  rug: new THREE.MeshStandardMaterial({ color: 0xffffff, map: tex.rug, roughness: 1 }),
  lamp: new THREE.MeshStandardMaterial({ color: 0xfff3e0, emissive: 0xffc27a, emissiveIntensity: 2.2 }),
  strip: new THREE.MeshStandardMaterial({ color: 0xfff3e0, emissive: 0xffd09a, emissiveIntensity: 1.6 }),
  outside: new THREE.MeshBasicMaterial({ map: canvasTex(512, (g, s) => { const gr = g.createLinearGradient(0, 0, 0, s); gr.addColorStop(0, "#f2d9b6"); gr.addColorStop(0.55, "#f6e6cc"); gr.addColorStop(0.62, "#7a8c5d"); gr.addColorStop(1, "#4b5c38"); g.fillStyle = gr; g.fillRect(0, 0, s, s); const r = rng(7); for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(60,85,50,${0.4 + r() * 0.4})`; g.beginPath(); g.arc(r() * s, s * 0.55 + r() * 40, 20 + r() * 50, 0, Math.PI * 2); g.fill(); } }) }),
  leaf: new THREE.MeshStandardMaterial({ color: 0x3f6a3a, roughness: 0.8 }),
  pot: new THREE.MeshStandardMaterial({ color: 0xd8d2c8, roughness: 0.7 }),
  glass: new THREE.MeshStandardMaterial({ color: 0x9fb0b8, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.18 }),
};
{
  const p = innParts;
  box(14, 0.05, 10, imat.floor, 0, -0.05, 0, p, { uv: [3, 2] });
  box(14, 0.05, 10, imat.ceiling, 0, 3.4, 0, p, { cast: false });
  box(14, 3.4, 0.2, imat.wall, 0, 0, -4.6, p);
  box(0.2, 3.4, 10, imat.wall, -7, 0, 0, p);
  // feature slat wall + TV console on the back wall
  for (let i = 0; i < 34; i++) box(0.06, 3.4, 0.08, imat.slat, -3.2 + i * 0.12, 0, -4.45, p, { uv: [0.2, 2] });
  box(3.6, 0.45, 0.5, imat.dark, -1.2, 0.25, -4.15, p);
  box(2.4, 1.35, 0.06, imat.dark, -1.2, 1.25, -4.38, p);
  box(4.4, 0.03, 0.06, imat.strip, -1.2, 3.3, -4.3, p, { cast: false });
  // window wall (right) with the garden beyond
  const out = new THREE.Mesh(new THREE.PlaneGeometry(30, 12), imat.outside); out.position.set(12, 2.5, 0); out.rotation.y = -Math.PI / 2; p.add(out);
  box(0.04, 3.3, 9.6, imat.glass, 6.9, 0.05, 0, p, { cast: false });
  for (let i = 0; i < 5; i++) box(0.08, 3.4, 0.08, imat.dark, 6.9, 0, -4 + i * 2, p);
  // sofa
  box(3.4, 0.42, 1.05, imat.fabric, -1.2, 0.1, -1.4, p); box(3.4, 0.5, 0.25, imat.fabric, -1.2, 0.5, -1.82, p);
  box(0.25, 0.3, 1.05, imat.fabric, -2.78, 0.5, -1.4, p); box(0.25, 0.3, 1.05, imat.fabric, 0.38, 0.5, -1.4, p);
  [-2.2, -1.2, -0.2].forEach((x) => box(0.9, 0.14, 0.85, imat.fabric, x, 0.52, -1.35, p));
  [-2.3, -0.1].forEach((x) => box(0.5, 0.42, 0.14, imat.cushion, x, 0.6, -1.62, p));
  // rug + coffee table
  box(4.2, 0.015, 3.0, imat.rug, -1.2, 0, 0.0, p, { cast: false });
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.05, 48), imat.marble); top.position.set(-1.2, 0.42, 0.25); top.castShadow = top.receiveShadow = true; p.add(top);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.32, 0.4, 32), imat.brass); base.position.set(-1.2, 0.2, 0.25); base.castShadow = true; p.add(base);
  // armchair
  const arm = new THREE.Group(); box(0.95, 0.42, 0.9, imat.cushion, 0, 0.1, 0, arm); box(0.95, 0.45, 0.2, imat.cushion, 0, 0.5, -0.36, arm); arm.position.set(1.7, 0, 0.6); arm.rotation.y = -0.9; p.add(arm);
  // dining + pendants
  box(2.4, 0.06, 1.0, imat.marble, 3.4, 0.74, -2.2, p); box(0.08, 0.74, 0.6, imat.dark, 2.5, 0, -2.2, p); box(0.08, 0.74, 0.6, imat.dark, 4.3, 0, -2.2, p);
  [2.7, 3.4, 4.1].forEach((x) => { const l = new THREE.Mesh(new THREE.SphereGeometry(0.16, 24, 16), imat.lamp); l.position.set(x, 1.85, -2.2); p.add(l); box(0.01, 1.4, 0.01, imat.dark, x, 2.0, -2.2, p, { cast: false }); });
  // kitchen island beyond
  box(3.0, 0.9, 0.9, imat.dark, -4.6, 0, -2.8, p); box(3.1, 0.05, 1.0, imat.marble, -4.6, 0.9, -2.8, p);
  // plant + floor lamp
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.22, 0.55, 24), imat.pot); pot.position.set(1.0, 0.27, -3.6); pot.castShadow = true; p.add(pot);
  const pr = rng(9); for (let i = 0; i < 9; i++) { const lf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28 + pr() * 0.2, 0), imat.leaf); lf.position.set(1.0 + (pr() - 0.5) * 0.7, 0.9 + pr() * 1.0, -3.6 + (pr() - 0.5) * 0.6); lf.castShadow = true; p.add(lf); }
  box(0.03, 1.6, 0.03, imat.brass, -3.25, 0, -1.5, p); const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.26, 0.3, 32, 1, true), imat.lamp); shade.position.set(-3.25, 1.7, -1.5); p.add(shade);
  // recessed ceiling coves
  box(0.04, 0.02, 8, imat.strip, -6.6, 3.36, 0, p, { cast: false }); box(12, 0.02, 0.04, imat.strip, 0, 3.36, 3.5, p, { cast: false });
}
const innSun = new THREE.DirectionalLight(0xffe2bd, 2.6); innSun.position.set(14, 6, 3); innSun.target.position.set(0, 0, -1); innSun.castShadow = true;
innSun.shadow.mapSize.set(2048, 2048); Object.assign(innSun.shadow.camera, { left: -9, right: 9, top: 6, bottom: -6, near: 1, far: 30 }); innSun.shadow.bias = -0.0004; innSun.shadow.radius = 4;
inn.add(innSun, innSun.target, new THREE.HemisphereLight(0xfff3e2, 0x5c4a3a, 0.9));
[[2.7, 1.6, -2.2], [3.4, 1.6, -2.2], [4.1, 1.6, -2.2], [-3.25, 1.6, -1.5], [-1.2, 3.2, -4.0]].forEach(([x, y, z]) => { const l = new THREE.PointLight(0xffb36b, 2.2, 6, 1.7); l.position.set(x, y, z); inn.add(l); });

// ======================================================== MATERIAL STUDIO
const studio = new THREE.Scene();
studio.background = new THREE.Color(0x0d0d0f);
studio.fog = new THREE.Fog(0x0d0d0f, 9, 22);
{
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshStandardMaterial({ color: 0x151517, roughness: 0.35, metalness: 0.2 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; studio.add(floor);
  const pedMat = new THREE.MeshStandardMaterial({ color: 0x1d1e21, roughness: 0.6 });
  const samples = [
    () => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 0.9), new THREE.MeshStandardMaterial({ map: T.wood(), roughness: 0.55 })); return m; },
    () => new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), new THREE.MeshStandardMaterial({ color: 0xb3b0ab, map: tex.concrete, roughness: 0.92 })),
    () => new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.12, 0.8), new THREE.MeshStandardMaterial({ map: tex.marble, roughness: 0.12 })),
    () => new THREE.Mesh(new THREE.SphereGeometry(0.45, 64, 32), new THREE.MeshStandardMaterial({ color: 0xc9a45c, map: tex.brushed, roughness: 0.32, metalness: 1 })),
    () => new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.35, 0.9), new THREE.MeshStandardMaterial({ map: tex.stone, roughness: 0.9 })),
  ];
  samples.forEach((mk, i) => {
    const x = (i - 2) * 2.3;
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.8, 1.0, 64), pedMat); ped.position.set(x, 0.5, 0); ped.castShadow = ped.receiveShadow = true; studio.add(ped);
    const s = mk(); s.castShadow = s.receiveShadow = true; s.geometry.computeBoundingBox(); const bb = s.geometry.boundingBox;
    s.position.set(x, 1.0 - bb.min.y + 0.001, 0); s.rotation.y = 0.5 + i * 0.3; s.userData.spin = true; studio.add(s);
    const sp = new THREE.SpotLight(0xffe7c4, 140, 12, 0.45, 0.6, 1.4); sp.position.set(x, 5.2, 1.6); sp.target.position.set(x, 1, 0); sp.castShadow = true; sp.shadow.mapSize.set(512, 512); studio.add(sp, sp.target);
  });
  const rim = new THREE.DirectionalLight(0x9db7ff, 0.9); rim.position.set(-6, 4, -8); studio.add(rim);
  studio.add(new THREE.HemisphereLight(0x5a5e68, 0x141416, 1.2));
  // soft light strips behind
  [-1, 1].forEach((s) => { const strip = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 6), new THREE.MeshBasicMaterial({ color: 0xffe6bf })); strip.position.set(s * 7, 3, -6); studio.add(strip); });
}

// ======================================================== ENVIRONMENT MAPS
const pmrem = new THREE.PMREMGenerator(renderer);
function envFrom(texture) { const s = new THREE.Scene(); const d = new THREE.Mesh(new THREE.SphereGeometry(100, 32, 16), new THREE.MeshBasicMaterial({ map: texture, side: THREE.BackSide })); s.add(d); return pmrem.fromScene(s, 0.02).texture; }
const envDay = envFrom(skyDay), envGold = envFrom(skyGold);
inn.environment = envFrom(skyGold); inn.environmentIntensity = 0.35;
studio.environment = envGold; studio.environmentIntensity = 0.45;

const camera = new THREE.PerspectiveCamera(35, W / H, 0.1, 900);

// ======================================================== SHOT CONTROL
function setTimeOfDay(k) {
  const a = SUN.day, b = SUN.gold;
  const dir = a.dir.clone().lerp(b.dir, k).normalize();
  sun.position.copy(dir.multiplyScalar(60)); sun.target.position.set(0, 0, 0);
  sun.color.copy(a.color).lerp(b.color, k); sun.intensity = lerp(a.I, b.I, k);
  hemi.color.copy(a.hemiSky).lerp(b.hemiSky, k); hemi.groundColor.copy(a.hemiGround).lerp(b.hemiGround, k); hemi.intensity = lerp(a.hemiI, b.hemiI, k);
  ext.fog.color.copy(a.fog).lerp(b.fog, k);
  skyDomeDay.visible = k < 0.5; skyDomeGold.visible = k >= 0.5;
  ext.environment = k < 0.5 ? envDay : envGold; ext.environmentIntensity = lerp(0.9, 0.7, k);
  renderer.toneMappingExposure = lerp(0.95, 0.88, k);
  const lit = sIO((k - 0.55) / 0.45);
  mats.glass.emissiveIntensity = 0.18 * lit; mats.interiorWarm.emissiveIntensity = 2.2 * lit; mats.downlight.emissiveIntensity = 3.5 * lit;
  warmLights.forEach((l) => (l.intensity = 10 * lit)); poolLight.intensity = 3 * lit; mats.water.emissiveIntensity = 0.25 + 0.5 * lit;
}
function setShadowBox(r, cx = 0, cz = 0) {
  const c = sun.shadow.camera; c.left = -r; c.right = r; c.top = r; c.bottom = -r; c.near = 1; c.far = 160; c.updateProjectionMatrix();
  sun.target.position.set(cx, 0, cz); sun.position.add(V(cx, 0, cz));
}
function setClip(solidX, lineY, lineX) { CLIP_SOLID[0].constant = solidX; CLIP_LINES[0].constant = lineY; CLIP_LINES[1].constant = -lineX; }
function look(pos, tgt, fov = 35) { camera.position.copy(pos); camera.lookAt(tgt); camera.fov = fov; camera.updateProjectionMatrix(); }
function path(u, a, b, ta, tb, fov = 35) { const k = easeIO(u); look(a.clone().lerp(b, k), ta.clone().lerp(tb, k), fov); }
function orbit(angle, radius, height, tgt, fov = 35) { look(V(tgt.x + Math.sin(angle) * radius, height, tgt.z + Math.cos(angle) * radius), tgt, fov); }

function showExt({ house: h = true, edgesOn = false, grid = false, old = false, scaf = false, landOn = true, streetOn = true, sky = true } = {}) {
  house.visible = h; edges.visible = edgesOn; bpGrid.visible = bpGridFine.visible = grid; oldHouse.visible = old; scaffold.visible = scaf; land.visible = landOn; street.visible = streetOn;
  if (!sky) { skyDomeDay.visible = skyDomeGold.visible = false; }
  scan.visible = scanGlow.visible = edgesOn;
  ext.background = new THREE.Color(0x0b1626);
}
function construction(p) {
  // parts rise into place in stage order; walls read as raw concrete until finishing
  for (const pt of houseParts) {
    const k = easeO((p - pt.stage) / 0.07);
    pt.mesh.visible = k > 0.002;
    pt.mesh.scale.y = Math.max(0.002, k);
  }
  const fin = sIO((p - 0.74) / 0.16);
  mats.render.color.set(0xa3a19c).lerp(new THREE.Color(0xf2f0eb), fin);
  mats.render.map = fin > 0.5 ? tex.render : tex.concrete;
  mats.slab.color.set(0xa8a6a1).lerp(new THREE.Color(0xdedbd4), fin);
}
function resetConstruction() { for (const pt of houseParts) { pt.mesh.visible = true; pt.mesh.scale.y = 1; } mats.render.color.set(0xf2f0eb); mats.render.map = tex.render; mats.slab.color.set(0xdedbd4); }

const HOUSE_C = V(-0.5, 3.0, 0.5);
let lastShot = "";
function renderAt(t) {
  renderer.setScissorTest(false);
  renderer.setViewport(0, 0, W, H);
  // ----- S1b: aerial reveal of the finished home (2.6 – 6.0)
  if (t < 6.0) {
    resetConstruction(); setTimeOfDay(0.32); showExt({ edgesOn: false }); setClip(1e5, 1e5, -1e5); setShadowBox(22);
    const u = span(t, 2.4, 6.0);
    path(u, V(34, 21, 40), V(19, 10.5, 27), V(-1, 1.5, 0), V(-1, 2.6, 0.5), 32);
    return draw(ext);
  }
  // ----- S2: blueprint → real home (6 – 15)
  if (t < 15.0) {
    resetConstruction(); setTimeOfDay(0.32); setShadowBox(22);
    const u = span(t, 6.0, 15.0);
    const lineH = lerp(-0.5, 9.0, easeIO(span(t, 6.2, 9.2)));
    const sweep = t < 9.4 ? -1e4 : lerp(-34, 30, easeIO(span(t, 9.4, 13.2)));
    showExt({ edgesOn: true, grid: true, streetOn: true });
    setClip(sweep, lineH, sweep);
    scan.position.set(sweep, 6, 0); scanGlow.position.set(sweep - 0.05, 6, 0);
    const vis = span(t, 9.4, 9.7) * (1 - span(t, 12.8, 13.2)); scanMat.opacity = 0.9 * vis; scanGlowMat.opacity = 0.06 * vis;
    orbit(lerp(0.95, 0.42, easeIO(u)), lerp(34, 25, easeIO(u)), lerp(15, 7.5, easeIO(u)), V(-0.5, lerp(2.2, 2.8, u), 0.5), 34);
    return draw(ext);
  }
  // ----- S3 services (15 – 26.2); 26.2 – 29 is a 2D board
  if (t < 17.8) { // Design & Build: half visualisation, half wireframe
    resetConstruction(); setTimeOfDay(0.25); setShadowBox(22);
    const u = span(t, 15.0, 17.8);
    showExt({ edgesOn: true, grid: true, streetOn: false });
    const s = lerp(2.5, -1.5, easeIO(u)); setClip(s, 1e5, s);
    scan.position.set(s, 6, 0); scanGlow.position.set(s - 0.05, 6, 0); scanMat.opacity = 0.85; scanGlowMat.opacity = 0.05;
    orbit(lerp(0.15, 0.5, u), 27, lerp(6.5, 8.0, u), V(-0.5, 2.8, 0.5), 33);
    return draw(ext);
  }
  if (t < 20.6) { // New house construction
    const u = span(t, 17.8, 20.6);
    setTimeOfDay(0.12); setShadowBox(22); showExt({ scaf: true, streetOn: false, landOn: true }); setClip(1e5, 1e5, -1e5);
    construction(lerp(0.18, 0.86, u));
    scaffold.visible = u < 0.93;
    path(u, V(17, 2.2, 19), V(13, 3.6, 16), V(-1, 3.2, 0), V(-1.5, 3.6, 0), 36);
    return draw(ext);
  }
  if (t < 23.4) { // Renovation & extension: before | after wipe
    resetConstruction(); setTimeOfDay(0.3); setShadowBox(22); setClip(1e5, 1e5, -1e5);
    const u = span(t, 20.6, 23.4);
    path(u, V(3, 4.6, 30), V(1.5, 4.4, 27), V(-1.5, 2.6, 0), V(-1.5, 2.9, 0), 34);
    const split = Math.round(window.__renoSplit(t) * W);
    renderer.setScissorTest(true);
    showExt({ house: false, old: true, streetOn: false, landOn: true });
    renderer.setScissor(0, 0, split, H); renderer.setViewport(0, 0, W, H); renderer.render(ext, camera);
    showExt({ house: true, old: false, streetOn: false, landOn: true });
    renderer.setScissor(split, 0, W - split, H); renderer.render(ext, camera);
    renderer.setScissorTest(false);
    return;
  }
  if (t < 26.2) { // Interior works
    const u = span(t, 23.4, 26.2);
    renderer.toneMappingExposure = 1.0;
    path(u, V(-4.6, 1.55, 4.6), V(-3.2, 1.35, 3.4), V(-0.6, 0.9, -2.0), V(-0.2, 0.95, -2.2), 40);
    return draw(inn);
  }
  if (t < 40.0) return; // 2D boards: consultation (26.2 – 29) and process (29 – 40)
  // ----- S5 craftsmanship (40 – 51)
  if (t < 43.5) { // timber slat facade close-up, raking golden light
    resetConstruction(); setTimeOfDay(0.62); setShadowBox(12, 2, 2); showExt({ streetOn: false }); setClip(1e5, 1e5, -1e5);
    const u = span(t, 40.0, 43.5);
    path(u, V(9.5, 4.6, 8.6), V(7.0, 5.0, 7.3), V(3.0, 5.6, 4.4), V(2.2, 5.5, 4.3), 30);
    return draw(ext);
  }
  if (t < 47.6) { // material selection studio
    const u = span(t, 43.5, 47.6);
    renderer.toneMappingExposure = 1.45;
    let i = 0; studio.children.forEach((c) => { if (c.userData.spin) { c.rotation.y = 0.5 + i * 0.3 + u * 0.6; i++; } });
    path(u, V(-5.8, 2.4, 5.2), V(3.8, 2.0, 4.4), V(-3.4, 1.15, 0), V(3.4, 1.15, 0), 34);
    return draw(studio);
  }
  if (t < 51.0) { // aerial over the street of completed homes
    resetConstruction(); setTimeOfDay(0.5); setShadowBox(70, 5, 10); showExt({}); setClip(1e5, 1e5, -1e5);
    const u = span(t, 47.6, 51.0);
    path(u, V(-58, 34, 52), V(-14, 30, 56), V(-30, 0, 8), V(8, 0, 6), 36);
    return draw(ext);
  }
  // ----- S6 golden hour close (51 – 60)
  resetConstruction(); setTimeOfDay(1.0); setShadowBox(30); showExt({}); setClip(1e5, 1e5, -1e5);
  const u = span(t, 51.0, 60.0);
  path(u, V(9.5, 1.7, 18.5), V(27, 9.5, 46), V(-1.5, 4.3, 1), V(-1.5, 4.0, 1), lerp(36, 38, u));
  return draw(ext);
}
function draw(scene) { renderer.render(scene, camera); }

// --------------------------------------------------------------- boot
window.__hf = window.__hf || {}; window.__hf.buildReady = window.__hf.buildReady || {};
window.__hf.buildReady.world = (async () => {
  look(V(20, 10, 26), HOUSE_C);
  await renderer.compileAsync(ext, camera);
  await renderer.compileAsync(inn, camera);
  await renderer.compileAsync(studio, camera);
  renderAt(window.__hfTime || 3);
})();
window.addEventListener("hf-seek", (e) => { window.__hfTime = e.detail.time; renderAt(e.detail.time); });
window.__renderWorld = renderAt;
