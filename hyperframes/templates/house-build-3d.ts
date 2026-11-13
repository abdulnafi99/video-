import {
  esc, hexA, isVertical, jsonForScript, overlayHtml, presetSpeed, scaler, safeColor, textCss,
  wordRevealScript, wordsAccentLast, exitScript, type SceneTemplate,
} from "./common";

/**
 * Three.js scene: a modern tiny house assembling itself — blueprint, steel
 * base, frame, walls, roof, glazing, deck, then the interior lights come on.
 *
 * variant "build"    → full construction sequence with a phase stepper.
 * variant "showcase" → finished house at dusk, slow camera orbit.
 *
 * Determinism: every frame is a pure function of seek time (hf-seek). No rAF
 * loop, no Math.random, no clocks.
 */
export const houseBuild3d: SceneTemplate = (ctx) => {
  const px = scaler(ctx);
  const sp = presetSpeed(ctx.scene.animationPreset);
  const v = isVertical(ctx);
  const accent = safeColor(ctx.brand.accentColor, "#C6A76B");
  const showcase = ctx.scene.variant === "showcase";
  const phases = (ctx.scene.bullets || []).filter(Boolean).slice(0, 5);
  const D = ctx.duration;
  // Build window: phases are evenly spaced over [0.3, D - 1.4].
  const b0 = 0.3;
  const b1 = Math.max(b0 + 2, D - 1.3);
  const phaseTimes = phases.map((_, i) => b0 + ((b1 - b0) * i) / Math.max(1, phases.length));
  const cfg = { W: ctx.width, H: ctx.height, D, showcase, vertical: v, b0, b1, accent };

  return {
    libs: ["three.module.js", "three.core.js"],
    css: `${textCss(ctx)}
    #stage { position:absolute; inset:0; background:#07080B; overflow:hidden; }
    #gl { position:absolute; inset:0; width:100%; height:100%; display:block; }
    .top-fade { position:absolute; left:0; right:0; top:0; height:42%; background:linear-gradient(180deg, rgba(7,8,11,.88), rgba(7,8,11,0)); }
    .bottom-fade { position:absolute; left:0; right:0; bottom:0; height:30%; background:linear-gradient(0deg, rgba(7,8,11,.9), rgba(7,8,11,0)); }
    .copy { position:absolute; left:${px(90)}; right:${px(90)}; top:${px(v ? 210 : 90)}; text-align:${v ? "left" : "left"}; }
    .headline { font-size:${px(v ? 96 : 78)}; max-width:${px(v ? 900 : 1100)}; }
    .eyebrow { margin-bottom:${px(26)}; }
    .subline { margin-top:${px(24)}; max-width:${px(820)}; }
    .stepper { position:absolute; left:${px(90)}; right:${px(90)}; bottom:${px(v ? 200 : 80)}; }
    .track { position:relative; height:${px(3)}; background:rgba(255,255,255,.12); border-radius:9px; }
    .fill { position:absolute; left:0; top:0; bottom:0; width:100%; background:linear-gradient(90deg, ${accent}, #fff3d6); transform-origin:0 50%; transform:scaleX(0); border-radius:9px; box-shadow:0 0 ${px(18)} ${hexA(accent, 0.7)}; }
    .steps { display:flex; justify-content:space-between; margin-top:${px(26)}; }
    .step { font-family:Inter,sans-serif; font-weight:600; font-size:${px(v ? 24 : 22)}; letter-spacing:.14em; text-transform:uppercase; color:rgba(245,245,247,.35); }
    .step b { display:block; font-family:"Space Grotesk",sans-serif; font-size:${px(v ? 30 : 26)}; letter-spacing:0; color:${accent}; margin-bottom:${px(6)}; opacity:.5; }
    .step.on { color:#F5F5F7; }
    `,
    html: `<canvas id="gl" width="${ctx.width}" height="${ctx.height}"></canvas>
      <div class="top-fade"></div><div class="bottom-fade"></div>
      <div class="copy" id="copy">
        ${ctx.scene.subline ? `<div class="eyebrow" id="eyebrow">${esc(ctx.scene.subline)}</div>` : ""}
        <h2 class="headline">${wordsAccentLast(ctx.scene.headline)}</h2>
      </div>
      ${
        !showcase && phases.length
          ? `<div class="stepper" id="stepper"><div class="track"><div class="fill" id="fill"></div></div>
        <div class="steps">${phases.map((p, i) => `<div class="step" id="st${i}"><b>0${i + 1}</b>${esc(p)}</div>`).join("")}</div></div>`
          : ""
      }
      ${overlayHtml()}`,
    script: `
      window.__hf = window.__hf || {}; window.__hf.buildReady = window.__hf.buildReady || {};
      window.__hf.buildReady.three = new Promise(function(r){ window.__threeReady = r; });
      tl.fromTo("#eyebrow",{opacity:0,y:10},{opacity:1,y:0,duration:.8,ease:"power2.out"},0.2);
      ${wordRevealScript(".headline .w-i", 0.35, sp, 0.08)}
      ${
        !showcase && phases.length
          ? `tl.fromTo("#stepper",{opacity:0,y:20},{opacity:1,y:0,duration:.7},0.3);
      tl.to("#fill",{scaleX:1,duration:${(b1 - b0).toFixed(2)},ease:"none"},${b0});
      ${phaseTimes
        .map(
          (t, i) => `tl.to("#st${i}",{color:"#F5F5F7",duration:.35},${t.toFixed(2)}); tl.to("#st${i} b",{opacity:1,duration:.35},${t.toFixed(2)});`,
        )
        .join("\n")}
      tl.to("#stepper",{opacity:0,duration:.5},${(D - 0.6).toFixed(2)});`
          : ""
      }
      ${exitScript("#copy", ctx, 0.5)}
    `,
    moduleScript: `
import * as THREE from "./lib/three.module.js";
const CFG = ${jsonForScript(cfg)};
const canvas = document.getElementById("gl");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, powerPreference: "high-performance" });
renderer.setPixelRatio(1);
renderer.setSize(CFG.W, CFG.H, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.3;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x07080b);
scene.fog = new THREE.Fog(0x07080b, 18, 42);
const camera = new THREE.PerspectiveCamera(CFG.vertical ? 46 : 32, CFG.W / CFG.H, 0.1, 200);

// ---------- helpers ----------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ease = (x) => { x = clamp(x); return 1 - Math.pow(1 - x, 3); };
const easeIO = (x) => { x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const lerp = (a, b, t) => a + (b - a) * t;
const B0 = CFG.b0, B1 = CFG.b1, BD = B1 - B0;
const at = (f) => B0 + BD * f; // fraction of build window -> seconds

function mat(color, rough = 0.7, metal = 0.0, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, transparent: true, ...extra });
}
const pieces = [];
function piece(mesh, start, dur, mode, from = {}) {
  mesh.castShadow = true; mesh.receiveShadow = true;
  mesh.userData.final = { p: mesh.position.clone(), r: mesh.rotation.clone(), s: mesh.scale.clone() };
  pieces.push({ mesh, start, dur, mode, from });
  scene.add(mesh);
  return mesh;
}
function box(w, h, d, m, x, y, z, anchorBottom = false) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (anchorBottom) g.translate(0, h / 2, 0);
  const mesh = new THREE.Mesh(g, m);
  mesh.position.set(x, y, z);
  return mesh;
}

// ---------- environment ----------
const hemi = new THREE.HemisphereLight(0xb7c6e6, 0x1a1712, 0.9); scene.add(hemi);
const key = new THREE.DirectionalLight(0xffd8a8, 2.4);
key.position.set(10, 13, 12); key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
Object.assign(key.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 40 });
key.shadow.radius = 4; key.shadow.bias = -0.0005;
scene.add(key);
const fill = new THREE.DirectionalLight(0xfff1dc, 0.7); fill.position.set(-6, 5, 14); scene.add(fill);
const rim = new THREE.DirectionalLight(0x7aa2ff, 1.1); rim.position.set(-9, 6, -10); scene.add(rim);
const interior = new THREE.PointLight(0xffb45e, 0, 14, 1.6); interior.position.set(0, 2.2, 0.2); scene.add(interior);
const porch = new THREE.PointLight(0xffc784, 0, 8, 1.8); porch.position.set(1.6, 2.9, 2.6); scene.add(porch);

// ground with soft spotlight falloff
const gtex = (() => {
  const c = document.createElement("canvas"); c.width = c.height = 512;
  const g = c.getContext("2d");
  const grd = g.createRadialGradient(256, 256, 10, 256, 256, 256);
  grd.addColorStop(0, "#2a2b2f"); grd.addColorStop(0.45, "#16171b"); grd.addColorStop(1, "#07080b");
  g.fillStyle = grd; g.fillRect(0, 0, 512, 512);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
})();
const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshStandardMaterial({ map: gtex, roughness: 0.95 }));
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);

// blueprint grid + footprint outline (fades out once the slab is down)
const grid = new THREE.GridHelper(24, 48, new THREE.Color(CFG.accent), new THREE.Color(CFG.accent));
grid.material.transparent = true; grid.material.opacity = 0; grid.position.y = 0.005; scene.add(grid);
const L = 7.2, Dp = 3.0, WH = 2.7, BASE = 0.55, RIDGE = 1.35;
const outlinePts = [[-L/2,-Dp/2],[L/2,-Dp/2],[L/2,Dp/2],[-L/2,Dp/2],[-L/2,-Dp/2]].map(([x,z]) => new THREE.Vector3(x, 0.02, z));
const outlineGeo = new THREE.BufferGeometry().setFromPoints(outlinePts);
const outline = new THREE.Line(outlineGeo, new THREE.LineBasicMaterial({ color: CFG.accent, transparent: true, opacity: 0 }));
scene.add(outline);

// ---------- materials ----------
const steel = mat(0x2d3036, 0.45, 0.8);
const concrete = mat(0x8d8a84, 0.95);
const timber = mat(0xb07a45, 0.65);
const timberDark = mat(0x6e4a2b, 0.7);
const cladding = mat(0x4a4f57, 0.55, 0.15);
const roofMat = mat(0x34373d, 0.42, 0.55);
const trim = mat(0xc9a86a, 0.4, 0.7);
const glass = new THREE.MeshStandardMaterial({ color: 0x1c2733, roughness: 0.08, metalness: 0.2, emissive: new THREE.Color(0xffb15c), emissiveIntensity: 0, transparent: true, opacity: 0.92 });

// ---------- house pieces ----------
// 1. footings / steel base (0.00 – 0.18)
const postsX = [-L/2+0.3, -L/6, L/6, L/2-0.3];
postsX.forEach((x, i) => [-Dp/2+0.25, Dp/2-0.25].forEach((z, j) => {
  piece(box(0.22, BASE, 0.22, concrete, x, 0, z, true), at(0.0 + (i*2+j)*0.012), 0.5, "rise");
}));
piece(box(L, 0.16, 0.18, steel, 0, BASE - 0.16, -Dp/2+0.2, false), at(0.1), 0.5, "drop", { y: 2.5 });
piece(box(L, 0.16, 0.18, steel, 0, BASE - 0.16, Dp/2-0.2, false), at(0.12), 0.5, "drop", { y: 2.5 });

// 2. floor slab (0.18 – 0.26)
piece(box(L, 0.14, Dp, timberDark, 0, BASE, 0, true), at(0.18), 0.55, "drop", { y: 3 });

// 3. wall frame studs (0.24 – 0.42)
const studs = [];
const FY = BASE + 0.14;
for (let k = 0; k <= 12; k++) {
  const x = -L/2 + 0.05 + k * (L - 0.1) / 12;
  studs.push([x, -Dp/2 + 0.05]); studs.push([x, Dp/2 - 0.05]);
}
for (let k = 1; k < 5; k++) { const z = -Dp/2 + k * Dp / 5; studs.push([-L/2+0.05, z]); studs.push([L/2-0.05, z]); }
studs.forEach(([x, z], i) => piece(box(0.07, WH, 0.09, timber, x, FY, z, true), at(0.24 + (i / studs.length) * 0.16), 0.45, "rise"));
piece(box(L, 0.09, 0.1, timber, 0, FY + WH, -Dp/2+0.05), at(0.4), 0.4, "drop", { y: 1.5 });
piece(box(L, 0.09, 0.1, timber, 0, FY + WH, Dp/2-0.05), at(0.41), 0.4, "drop", { y: 1.5 });

// 4. wall panels (0.42 – 0.62). Front (+z) gets a big glazed opening.
const wallT = 0.08;
// back wall full
piece(box(L, WH, wallT, cladding, 0, FY, -Dp/2, true), at(0.42), 0.6, "slideUp");
// side walls
piece(box(wallT, WH, Dp, cladding, -L/2, FY, 0, true), at(0.46), 0.6, "slideUp");
piece(box(wallT, WH, Dp, timber, L/2, FY, 0, true), at(0.48), 0.6, "slideUp");
// front wall: left solid part, header above glazing, right timber accent
piece(box(2.1, WH, wallT, cladding, -L/2 + 1.05, FY, Dp/2, true), at(0.5), 0.6, "slideUp");
piece(box(L - 2.1, 0.5, wallT, cladding, 1.05, FY + WH - 0.5, Dp/2, true), at(0.53), 0.5, "drop", { y: 2 });
piece(box(0.9, WH - 0.5, wallT, timber, L/2 - 0.45, FY, Dp/2, true), at(0.55), 0.5, "slideUp");
// gable triangles
const gableShape = new THREE.Shape(); gableShape.moveTo(-Dp/2, 0); gableShape.lineTo(Dp/2, 0); gableShape.lineTo(0, RIDGE); gableShape.lineTo(-Dp/2, 0);
const gableGeo = new THREE.ExtrudeGeometry(gableShape, { depth: wallT, bevelEnabled: false });
[-L/2, L/2].forEach((x, i) => {
  const g = new THREE.Mesh(gableGeo, i ? timber : cladding);
  g.rotation.y = Math.PI / 2; g.position.set(x - wallT / 2, FY + WH, 0);
  piece(g, at(0.58 + i * 0.02), 0.5, "drop", { y: 2 });
});

// 5. roof (0.62 – 0.74)
const slope = Math.hypot(Dp / 2 + 0.35, RIDGE + 0.12);
const roofAngle = Math.atan2(RIDGE + 0.12, Dp / 2 + 0.35);
[-1, 1].forEach((s, i) => {
  const r = box(L + 0.7, 0.09, slope, roofMat, 0, 0, 0);
  r.rotation.x = s * roofAngle;
  r.position.set(0, FY + WH + RIDGE / 2 + 0.02, s * (Dp / 4 + 0.15));
  piece(r, at(0.62 + i * 0.04), 0.6, "drop", { y: 3.5 });
});
piece(box(L + 0.75, 0.07, 0.14, trim, 0, FY + WH + RIDGE + 0.1, 0), at(0.72), 0.4, "drop", { y: 1 });

// 6. glazing + door (0.72 – 0.82)
const glazeW = L - 2.1 - 0.9, glazeH = WH - 0.5;
const glazing = piece(box(glazeW, glazeH, 0.04, glass, -L/2 + 2.1 + glazeW / 2, FY, Dp/2 + 0.01, true), at(0.72), 0.5, "fade");
for (let k = 1; k < 3; k++) piece(box(0.05, glazeH, 0.07, trim, -L/2 + 2.1 + (glazeW * k) / 3, FY, Dp/2 + 0.03, true), at(0.74), 0.4, "rise");
piece(box(1.4, 0.9, 0.04, glass, -L/2 + 1.05, FY + 1.2, Dp/2 + 0.01, true), at(0.75), 0.4, "fade");
piece(box(0.04, 0.9, 1.6, glass, -L/2 - 0.01, FY + 1.2, 0, true), at(0.76), 0.4, "fade");
piece(box(0.9, 1.2, 0.04, glass, 1.0, FY + 1.1, -Dp/2 - 0.01, true), at(0.77), 0.4, "fade");

// 7. deck + steps (0.80 – 0.92)
const deckY = BASE;
for (let k = 0; k < 9; k++) {
  piece(box(0.18, 0.06, 1.7, timber, -L/2 + 2.2 + k * 0.42, deckY, Dp/2 + 0.9, true), at(0.8 + k * 0.01), 0.4, "drop", { y: 1.2 });
}
piece(box(3.8, 0.18, 0.35, timberDark, -L/2 + 3.9, 0, Dp/2 + 1.95, true), at(0.9), 0.4, "rise");
piece(box(3.8, 0.36, 0.35, timberDark, -L/2 + 3.9, 0, Dp/2 + 1.6, true), at(0.89), 0.4, "rise");
// planter / tree hints
const leaf = mat(0x2f4a35, 0.9);
const tree = new THREE.Mesh(new THREE.ConeGeometry(0.75, 2.6, 7), leaf); tree.position.set(L/2 + 1.6, 1.3, -0.6);
piece(tree, at(0.86), 0.6, "rise");
const tree2 = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.9, 7), leaf); tree2.position.set(-L/2 - 1.3, 0.95, 1.1);
piece(tree2, at(0.88), 0.6, "rise");

// ---------- animation ----------
function applyPiece(pc, t) {
  const f = pc.mesh.userData.final;
  const k = CFG.showcase ? 1 : ease((t - pc.start) / pc.dur);
  const m = pc.mesh;
  m.visible = k > 0.001;
  m.position.copy(f.p); m.scale.copy(f.s);
  if (pc.mode === "rise" || pc.mode === "fade") { m.scale.y = Math.max(0.0001, f.s.y * k); }
  if (pc.mode === "drop") { m.position.y = f.p.y + (pc.from.y || 2) * (1 - k); }
  if (pc.mode === "slideUp") { m.position.y = f.p.y - WH * 0.35 * (1 - k); m.scale.y = Math.max(0.0001, lerp(0.6, 1, k)); }
  m.userData.k = k;
}
function renderAt(t) {
  // camera path
  const T = clamp(t / CFG.D);
  let radius, height, angle, lookY;
  if (CFG.showcase) {
    angle = lerp(0.95, 0.15, easeIO(T));
    radius = CFG.vertical ? lerp(25, 23, easeIO(T)) : lerp(15, 12.5, easeIO(T));
    height = lerp(4.2, 2.6, easeIO(T)); lookY = CFG.vertical ? 2.6 : 1.6;
  } else {
    angle = lerp(1.25, 0.42, easeIO(T));
    radius = CFG.vertical ? lerp(30, 20, easeIO(T)) : lerp(18, 13.5, easeIO(T));
    height = lerp(12, 4.0, easeIO(T)); lookY = lerp(0.8, 1.7, easeIO(T));
  }
  camera.position.set(Math.sin(angle) * radius, height, Math.cos(angle) * radius);
  if (CFG.showcase) camera.lookAt(-0.9, CFG.vertical ? lookY + 0.4 : lookY, 0.4);
  else camera.lookAt(-0.3, CFG.vertical ? lookY + 0.4 : lookY, 0.6);

  for (const pc of pieces) applyPiece(pc, t);

  // blueprint
  const bp = CFG.showcase ? 0 : ease((t + 0.6) / 0.8) * (1 - ease((t - at(0.3)) / 0.8));
  grid.material.opacity = 0.22 * bp; outline.material.opacity = 0.9 * bp;

  // lights on
  const lit = CFG.showcase ? 1 : ease((t - at(0.88)) / 0.9);
  glass.emissiveIntensity = 1.6 * lit;
  interior.intensity = 9 * lit; porch.intensity = 5 * lit;
  // dusk grade: key light cools and dims as interior warms
  const dusk = CFG.showcase ? 1 : lit;
  key.intensity = lerp(2.8, 1.6, dusk);
  key.color.setHSL(lerp(0.085, 0.6, dusk * 0.6), 0.6, lerp(0.8, 0.7, dusk));
  hemi.intensity = lerp(0.9, 0.55, dusk);
  renderer.render(scene, camera);
}

window.addEventListener("hf-seek", (e) => renderAt(e.detail.time));
// Local preview driver also emits hf-seek; first frame:
renderer.compileAsync(scene, camera).then(() => {
  renderAt(0);
  const px = new Uint8Array(4);
  const gl = renderer.getContext(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
  window.__threeReady && window.__threeReady();
});
`,
  };
};
