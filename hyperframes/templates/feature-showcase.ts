import {
  backdropCss, backdropHtml, cameraScript, esc, hexA, isVertical, overlayHtml, particlesScript,
  presetSpeed, scaler, safeColor, sweepScript, textCss, wordRevealScript, wordsAccentLast, type SceneTemplate,
} from "./common";
import { iconFor, iconSvg } from "./icons";

/**
 * Headline plus up to six feature cards. Each card's line icon draws itself on
 * (stroke reveal), the card rises with a soft blur and a gold shine passes over.
 *
 * variant "list"   (default) → stacked rows: icon chip + text
 * variant "grid"   → 2-column tiles: large icon, gold rule, title
 * variant "checks" → compact 2-column pills with drawn check marks
 */
export const featureShowcase: SceneTemplate = (ctx) => {
  const px = scaler(ctx);
  const sp = presetSpeed(ctx.scene.animationPreset);
  const accent = safeColor(ctx.brand.accentColor, "#C6A76B");
  const v = isVertical(ctx);
  const bullets = (ctx.scene.bullets || []).filter(Boolean).slice(0, 6);
  const variant = ctx.scene.variant === "grid" || ctx.scene.variant === "checks" ? ctx.scene.variant : "list";
  const compact = bullets.length > 4;
  const bg = ctx.assets.images[0];
  const cardStart = 1.0 * sp;
  const gap = Math.min(0.32, (ctx.duration - cardStart - 2.2) / Math.max(1, bullets.length)) * sp;
  const cols = variant === "list" ? (v ? 1 : compact ? 3 : 2) : v ? 2 : compact ? 3 : 4;
  const D = ctx.duration;

  const card = (b: string, i: number) => {
    const icon = variant === "checks" ? "check" : iconFor(b);
    if (variant === "grid") {
      return `<div class="card grid-card" id="card${i}">
        <div class="ring" id="ring${i}">${iconSvg(icon, "ico", accent, 1.4)}</div>
        <div class="rule" id="rule${i}"></div>
        <div class="card-text">${esc(b)}</div></div>`;
    }
    if (variant === "checks") {
      return `<div class="card check-card" id="card${i}"><div class="dot" id="ring${i}">${iconSvg(icon, "ico", "#0B0B0D", 2.6)}</div><div class="card-text">${esc(b)}</div></div>`;
    }
    return `<div class="card" id="card${i}"><div class="chip" id="ring${i}">${iconSvg(icon, "ico", accent, 1.6)}</div><div class="card-text">${esc(b)}</div><div class="idx">0${i + 1}</div></div>`;
  };

  return {
    css: `${backdropCss(ctx)}${textCss(ctx)}
    #camera { position:absolute; inset:0; }
    .photo { position:absolute; inset:0; background-size:cover; background-position:center; opacity:.28; filter:saturate(.9); }
    .photo-fade { position:absolute; inset:0; background:linear-gradient(180deg, rgba(8,9,12,.4), rgba(8,9,12,.92)); }
    .wrap { position:absolute; left:${px(80)}; right:${px(80)}; top:${px(v ? 120 : 60)}; bottom:${px(v ? 200 : 60)}; display:flex; flex-direction:column; justify-content:center; }
    .headline { font-size:${px(v ? 96 : 76)}; max-width:${px(v ? 920 : 1500)}; }
    .eyebrow { margin-bottom:${px(26)}; display:flex; align-items:center; gap:${px(16)}; }
    .eyebrow .bar { display:inline-block; width:${px(46)}; height:${px(2)}; background:${accent}; transform-origin:0 50%; }
    .underline { margin-top:${px(28)}; width:${px(140)}; height:${px(3)}; border-radius:9px; background:linear-gradient(90deg, ${accent}, transparent); transform-origin:0 50%; }
    .cards { margin-top:${px(v ? 70 : 44)}; display:grid; grid-template-columns:repeat(${cols}, minmax(0,1fr)); gap:${px(variant === "list" ? (compact ? 20 : 26) : 22)}; }
    .card { position:relative; display:flex; align-items:center; gap:${px(30)}; padding:${px(compact ? 30 : 40)} ${px(36)};
      border-radius:${px(30)}; background:linear-gradient(135deg, rgba(255,255,255,.08), rgba(255,255,255,.02));
      border:1px solid rgba(255,255,255,.10); box-shadow:0 ${px(26)} ${px(56)} rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.08); overflow:hidden; }
    .card::after { content:""; position:absolute; inset:0; pointer-events:none; background:linear-gradient(100deg, transparent 30%, ${hexA(accent, 0.2)} 50%, transparent 70%); background-size:250% 100%; background-position:var(--shine,150%) 0; }
    .chip { flex:none; width:${px(compact ? 84 : 96)}; height:${px(compact ? 84 : 96)}; border-radius:${px(22)}; display:grid; place-items:center;
      background:${hexA(accent, 0.1)}; border:1px solid ${hexA(accent, 0.35)}; }
    .chip .ico { width:58%; height:58%; }
    .idx { margin-left:auto; font-family:"Space Grotesk",sans-serif; font-weight:600; font-size:${px(24)}; color:${hexA(accent, 0.55)}; }
    .card-text { font-family:Inter,sans-serif; font-weight:500; font-size:${px(v ? (compact ? 38 : 40) : compact ? 29 : 34)}; color:#F5F5F7; letter-spacing:-.01em; line-height:1.22; }
    .grid-card { flex-direction:column; align-items:flex-start; gap:0; padding:${px(40)} ${px(34)} ${px(38)}; min-height:${px(v ? 400 : 300)}; }
    .grid-card .ring { width:${px(v ? 136 : 110)}; height:${px(v ? 136 : 110)}; border-radius:50%; display:grid; place-items:center; background:radial-gradient(circle, ${hexA(accent, 0.16)}, ${hexA(accent, 0.04)}); border:1px solid ${hexA(accent, 0.4)}; }
    .grid-card .ico { width:56%; height:56%; }
    .grid-card .rule { width:${px(46)}; height:${px(3)}; background:${accent}; margin:${px(30)} 0 ${px(20)}; transform-origin:0 50%; border-radius:4px; }
    .grid-card .card-text { font-family:"Space Grotesk",sans-serif; font-weight:600; font-size:${px(v ? 40 : 32)}; letter-spacing:-.02em; }
    .check-card { padding:${px(34)} ${px(30)}; gap:${px(22)}; align-items:flex-start; min-height:${px(v ? 200 : 150)}; }
    .check-card .dot { flex:none; width:${px(54)}; height:${px(54)}; border-radius:50%; background:${accent}; display:grid; place-items:center; box-shadow:0 0 ${px(24)} ${hexA(accent, 0.45)}; }
    .check-card .ico { width:62%; height:62%; }
    .check-card .card-text { font-size:${px(v ? 35 : 28)}; line-height:1.25; padding-top:${px(4)}; }
    `,
    html: `<div id="camera">${bg ? `<div class="photo" style="background-image:url('${esc(bg)}')"></div><div class="photo-fade"></div>` : ""}${backdropHtml()}
      <div class="wrap" id="copy">
        <div class="eyebrow" id="eyebrow"><span class="bar" id="ebar"></span>${esc(ctx.scene.subline || "Kelebihan")}</div>
        <h2 class="headline">${wordsAccentLast(ctx.scene.headline)}</h2>
        <div class="underline" id="uline"></div>
        <div class="cards">${bullets.map(card).join("")}</div>
      </div></div>${overlayHtml()}`,
    script: `
      ${cameraScript(ctx, 1.0, 1.035)}
      tl.fromTo("#ebar",{scaleX:0},{scaleX:1,duration:.7,ease:"expo.out"},0.1);
      tl.fromTo("#eyebrow",{opacity:0,x:-16},{opacity:1,x:0,duration:.7,ease:"power2.out"},0.15);
      ${wordRevealScript(".headline .w-i", 0.28, sp, 0.07)}
      tl.fromTo("#uline",{scaleX:0},{scaleX:1,duration:.9,ease:"expo.out"},${(0.75 * sp).toFixed(2)});
      ${bullets
        .map((_, i) => {
          const t = cardStart + i * gap;
          const fromX = variant === "list" ? (i % 2 ? 40 : -40) : 0;
          return `tl.fromTo("#card${i}",{opacity:0,x:${fromX},y:${variant === "list" ? 24 : 50},scale:.97,filter:"blur(8px)"},{opacity:1,x:0,y:0,scale:1,filter:"blur(0px)",duration:${(0.85 * sp).toFixed(2)},ease:"power3.out"},${t.toFixed(2)});
      tl.fromTo("#ring${i}",{scale:.6,rotation:-12},{scale:1,rotation:0,duration:.8,ease:"back.out(2)"},${(t + 0.1).toFixed(2)});
      tl.fromTo("#ring${i} path",{strokeDashoffset:1},{strokeDashoffset:0,duration:${variant === "checks" ? 0.45 : 0.9},ease:"power2.inOut",stagger:.06},${(t + 0.25).toFixed(2)});
      ${variant === "grid" ? `tl.fromTo("#rule${i}",{scaleX:0},{scaleX:1,duration:.6,ease:"expo.out"},${(t + 0.4).toFixed(2)});` : ""}
      tl.fromTo("#card${i}",{"--shine":"150%"},{"--shine":"-50%",duration:1.1,ease:"power2.inOut"},${(t + 0.45).toFixed(2)});`;
        })
        .join("\n")}
      ${sweepScript(Math.max(0.4, D - 2.6))}
      ${particlesScript(ctx, 14)}
      // staggered exit: cards fall away, then the heading
      tl.to(".card",{opacity:0,y:-18,filter:"blur(6px)",duration:.45,ease:"power2.in",stagger:.04},${Math.max(0, D - 0.75).toFixed(2)});
      tl.to("#eyebrow, .headline, #uline",{opacity:0,y:-14,duration:.45,ease:"power2.in"},${Math.max(0, D - 0.55).toFixed(2)});
    `,
  };
};
