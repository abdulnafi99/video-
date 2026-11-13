import {
  backdropCss, backdropHtml, cameraScript, esc, exitScript, hexA, isVertical, overlayHtml, particlesScript,
  presetSpeed, scaler, safeColor, sweepScript, textCss, wordRevealScript, wordsAccentLast, type SceneTemplate,
} from "./common";

/** Headline plus up to four glass feature cards revealed in sequence. */
export const featureShowcase: SceneTemplate = (ctx) => {
  const px = scaler(ctx);
  const sp = presetSpeed(ctx.scene.animationPreset);
  const accent = safeColor(ctx.brand.accentColor, "#C6A76B");
  const v = isVertical(ctx);
  const bullets = (ctx.scene.bullets || []).filter(Boolean).slice(0, 6);
  const compact = bullets.length > 4;
  const bg = ctx.assets.images[0];
  const cardStart = 1.1 * sp;
  const gap = Math.min(0.55, (ctx.duration - cardStart - 1.4) / Math.max(1, bullets.length)) * sp;
  return {
    css: `${backdropCss(ctx)}${textCss(ctx)}
    #camera { position:absolute; inset:0; }
    .photo { position:absolute; inset:0; background-size:cover; background-position:center; opacity:.28; filter:saturate(.9); }
    .photo-fade { position:absolute; inset:0; background:linear-gradient(180deg, rgba(8,9,12,.4), rgba(8,9,12,.92)); }
    .wrap { position:absolute; left:${px(90)}; right:${px(90)}; top:${v ? px(compact ? 250 : 330) : px(compact ? 90 : 150)}; }
    .headline { font-size:${px(v ? 92 : 80)}; max-width:${px(v ? 900 : 1500)}; }
    .eyebrow { margin-bottom:${px(30)}; }
    .cards { margin-top:${px(v ? (compact ? 64 : 90) : compact ? 44 : 70)}; display:grid; grid-template-columns:${v ? "1fr" : compact ? "1fr 1fr 1fr" : "1fr 1fr"}; gap:${px(v ? (compact ? 22 : 30) : compact ? 24 : 34)}; }
    .card { position:relative; display:flex; align-items:center; gap:${px(34)}; padding:${px(v ? (compact ? 28 : 40) : compact ? 28 : 36)} ${px(44)};
      border-radius:${px(34)}; background:linear-gradient(135deg, rgba(255,255,255,.085), rgba(255,255,255,.025));
      border:1px solid rgba(255,255,255,.10); box-shadow:0 ${px(30)} ${px(60)} rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.08); overflow:hidden; }
    .card::after { content:""; position:absolute; inset:0; background:linear-gradient(100deg, transparent 30%, ${hexA(accent, 0.18)} 50%, transparent 70%); background-size:250% 100%; background-position:var(--shine,150%) 0; }
    .num { flex:none; width:${px(compact ? 70 : 84)}; height:${px(compact ? 70 : 84)}; border-radius:50%; display:grid; place-items:center;
      font-family:"Space Grotesk",sans-serif; font-weight:600; font-size:${px(30)}; color:#08090C; background:${accent}; box-shadow:0 0 ${px(30)} ${hexA(accent, 0.45)}; }
    .card-text { font-family:Inter,sans-serif; font-weight:500; font-size:${px(v ? (compact ? 36 : 40) : compact ? 30 : 36)}; color:#F5F5F7; letter-spacing:-.01em; line-height:1.2; }
    `,
    html: `<div id="camera">${bg ? `<div class="photo" style="background-image:url('${esc(bg)}')"></div><div class="photo-fade"></div>` : ""}${backdropHtml()}
      <div class="wrap" id="copy">
        <div class="eyebrow" id="eyebrow">${esc(ctx.scene.subline || "Kelebihan")}</div>
        <h2 class="headline">${wordsAccentLast(ctx.scene.headline)}</h2>
        <div class="cards">
          ${bullets.map((b, i) => `<div class="card" id="card${i}"><div class="num">0${i + 1}</div><div class="card-text">${esc(b)}</div></div>`).join("")}
        </div>
      </div></div>${overlayHtml()}`,
    script: `
      ${cameraScript(ctx, 1.0, 1.04)}
      tl.fromTo("#eyebrow",{opacity:0,x:-20},{opacity:1,x:0,duration:.8,ease:"power2.out"},0.15);
      ${wordRevealScript(".headline .w-i", 0.3, sp, 0.07)}
      ${bullets
        .map(
          (_, i) => `tl.fromTo("#card${i}",{opacity:0,y:60,scale:.96,filter:"blur(8px)"},{opacity:1,y:0,scale:1,filter:"blur(0px)",duration:${(0.9 * sp).toFixed(2)},ease:"power3.out"},${(cardStart + i * gap).toFixed(2)});
      tl.fromTo("#card${i}",{"--shine":"150%"},{"--shine":"-50%",duration:1.2,ease:"power2.inOut"},${(cardStart + i * gap + 0.5).toFixed(2)});`,
        )
        .join("\n")}
      ${sweepScript(Math.max(0.4, ctx.duration - 2.4))}
      ${particlesScript(ctx, 16)}
      ${exitScript("#copy", ctx)}
    `,
  };
};
