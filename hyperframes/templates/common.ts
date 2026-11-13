import type { AnimationPreset, BrandKit, Project, Scene } from "../../shared/types";

/** Everything a template needs to produce one HyperFrames composition. */
export interface TemplateContext {
  scene: Scene;
  project: Pick<Project, "id" | "name" | "brandName" | "productName" | "style" | "language">;
  brand: BrandKit;
  width: number;
  height: number;
  fps: number;
  duration: number;
  /** Paths relative to the scene folder. */
  assets: {
    logo?: string;
    images: string[];
    videos: string[];
  };
}

export interface TemplateOutput {
  css: string;
  html: string;
  /** Classic script body. Must build `tl` (already declared, paused). */
  script: string;
  /** Optional ES-module script (e.g. Three.js). */
  moduleScript?: string;
  /** Extra library files to copy from the shared assets folder. */
  libs?: string[];
}

export type SceneTemplate = (ctx: TemplateContext) => TemplateOutput;

/** HTML-escape user supplied text. Templates must never interpolate raw input. */
export function esc(input: unknown): string {
  return String(input ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** JSON for embedding inside a <script> block (prevents </script> breakouts). */
export function jsonForScript(v: unknown): string {
  return JSON.stringify(v).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
}

/** Only allow plain hex/rgb colours through to CSS. */
export function safeColor(c: string | undefined, fallback: string): string {
  if (!c) return fallback;
  return /^#[0-9a-fA-F]{3,8}$/.test(c) || /^rgba?\([\d\s.,%]+\)$/.test(c) ? c : fallback;
}

export function presetSpeed(p: AnimationPreset): number {
  return p === "gentle" ? 1.25 : p === "dynamic" ? 0.78 : 1;
}

/** Scaled pixel helper: designs are authored against a 1080px short edge. */
export function scaler(ctx: TemplateContext) {
  const base = Math.min(ctx.width, ctx.height) / 1080;
  return (n: number) => `${Math.round(n * base * 100) / 100}px`;
}

export function isVertical(ctx: TemplateContext) {
  return ctx.height > ctx.width * 1.2;
}

/** Split a headline into word spans for staggered reveals. */
export function words(text: string, cls = "w"): string {
  return esc(text)
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => `<span class="${cls}"><span class="${cls}-i">${w}</span></span>`)
    .join(" ");
}

/** Highlight the last word of a headline with the accent colour. */
export function wordsAccentLast(text: string, cls = "w"): string {
  const parts = String(text ?? "").split(/\s+/).filter(Boolean);
  return parts
    .map((w, i) => {
      const inner = esc(w);
      const accent = i === parts.length - 1 && parts.length > 1 ? " accent" : "";
      return `<span class="${cls}"><span class="${cls}-i${accent}">${inner}</span></span>`;
    })
    .join(" ");
}

const GRAIN =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .55 0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`,
  );

/** Shared cinematic backdrop: vignette, grain and an optional light sweep. */
export function backdropCss(ctx: TemplateContext, opts: { light?: boolean } = {}) {
  const bg = opts.light ? "#F4F2EE" : safeColor(ctx.brand.backgroundColor, "#08090C");
  const accent = safeColor(ctx.brand.accentColor, "#C6A76B");
  return `
  #stage { position:absolute; inset:0; overflow:hidden; background:${bg}; }
  .bg-glow { position:absolute; inset:-20%; background:
      radial-gradient(50% 40% at 50% 42%, ${opts.light ? "rgba(255,255,255,1)" : hexA(accent, 0.16)} 0%, transparent 70%),
      radial-gradient(80% 60% at 50% 120%, ${opts.light ? "rgba(198,167,107,.18)" : "rgba(255,255,255,.05)"} 0%, transparent 70%); }
  .vignette { position:absolute; inset:0; pointer-events:none;
      background: radial-gradient(120% 90% at 50% 45%, transparent 55%, ${opts.light ? "rgba(120,100,70,.18)" : "rgba(0,0,0,.72)"} 100%); }
  .grain { position:absolute; inset:0; pointer-events:none; opacity:${opts.light ? 0.05 : 0.07}; background-image:url("${GRAIN}"); mix-blend-mode:${opts.light ? "multiply" : "overlay"}; }
  .sweep { position:absolute; top:-30%; bottom:-30%; width:28%; left:0;
      background: linear-gradient(90deg, transparent, ${opts.light ? "rgba(255,255,255,.85)" : "rgba(255,255,255,.10)"}, transparent); opacity:0; }
  .particles { position:absolute; inset:0; pointer-events:none; }
  .particle { position:absolute; border-radius:50%; background:${accent}; filter: blur(.4px); opacity:0; }
  `;
}

export function backdropHtml(withParticles = true) {
  return `<div class="bg-glow" id="bgGlow"></div>${withParticles ? '<div class="particles" id="particles"></div>' : ""}<div class="sweep" id="sweep"></div>`;
}

export function overlayHtml() {
  return `<div class="vignette"></div><div class="grain"></div>`;
}

/** Seeded particles; generated once at load, animated with finite tweens. */
export function particlesScript(ctx: TemplateContext, count = 26) {
  const s = Math.min(ctx.width, ctx.height) / 1080;
  return `
  (function(){
    function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;}}
    var rnd = mulberry32(${hashSeed(ctx.scene.id)});
    var host = document.getElementById("particles"); if(!host) return;
    for (var i=0;i<${count};i++){
      var p=document.createElement("div"); p.className="particle";
      var size=(1.5+rnd()*4.5)*${s};
      p.style.width=size+"px"; p.style.height=size+"px";
      p.style.left=(rnd()*100)+"%"; p.style.top=(rnd()*100)+"%";
      host.appendChild(p);
      var o=0.15+rnd()*0.55, d=${ctx.duration};
      tl.fromTo(p,{opacity:0,y:0},{opacity:o,duration:1.2,ease:"sine.out"},rnd()*0.8);
      tl.to(p,{y:-(40+rnd()*120)*${s},x:(rnd()-0.5)*60*${s},duration:d,ease:"none"},0);
      tl.to(p,{opacity:0,duration:0.8,ease:"sine.in"},Math.max(0.5,d-0.9));
    }
  })();`;
}

export function sweepScript(at: number, dur = 1.6) {
  return `tl.fromTo("#sweep",{xPercent:-160,skewX:-18,opacity:0},{xPercent:420,skewX:-18,opacity:1,duration:${dur},ease:"power2.inOut"},${at});
  tl.fromTo("#sweep",{opacity:1},{opacity:0,duration:.3,immediateRender:false},${(at + dur).toFixed(2)});`;
}

/** Slow "camera" push on the whole stage. */
export function cameraScript(ctx: TemplateContext, from = 1, to = 1.06) {
  return `tl.fromTo("#camera",{scale:${from}},{scale:${to},duration:${ctx.duration},ease:"none"},0);`;
}

export function hashSeed(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function hexA(hex: string, a: number) {
  const m = hex.replace("#", "");
  const full = m.length === 3 ? m.split("").map((c) => c + c).join("") : m.slice(0, 6);
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return `rgba(198,167,107,${a})`;
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/** Standard word reveal: words rise from a mask with a subtle blur. */
export function wordRevealScript(selector: string, at: number, speed: number, stagger = 0.08) {
  return `tl.fromTo("${selector}",{yPercent:110,opacity:0,filter:"blur(10px)"},{yPercent:0,opacity:1,filter:"blur(0px)",duration:${(0.9 * speed).toFixed(2)},ease:"power3.out",stagger:${(stagger * speed).toFixed(3)}},${at});`;
}

export function exitScript(selector: string, ctx: TemplateContext, lead = 0.55) {
  return `tl.to("${selector}",{opacity:0,y:-12,filter:"blur(6px)",duration:${lead},ease:"power2.in"},${Math.max(0, ctx.duration - lead - 0.05).toFixed(2)});`;
}

export function textCss(ctx: TemplateContext) {
  const px = scaler(ctx);
  const text = safeColor(ctx.brand.textColor, "#F5F5F7");
  const accent = safeColor(ctx.brand.accentColor, "#C6A76B");
  return `
  .w { display:inline-block; overflow:hidden; vertical-align:bottom; padding-bottom:.08em; margin-bottom:-.08em; }
  .w-i { display:inline-block; will-change:transform; }
  .accent { color:${accent}; }
  .headline { font-family:"Space Grotesk", "Inter", sans-serif; font-weight:600; color:${text}; letter-spacing:-0.035em; line-height:1.02; }
  .subline { font-family:"Inter", sans-serif; font-weight:400; color:${hexA(text.startsWith("#") ? text : "#F5F5F7", 0.66)}; letter-spacing:-0.005em; line-height:1.35; font-size:${px(34)}; }
  .eyebrow { font-family:"Inter", sans-serif; font-weight:600; letter-spacing:.32em; text-transform:uppercase; font-size:${px(20)}; color:${accent}; }
  `;
}
