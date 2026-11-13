import {
  backdropCss, backdropHtml, esc, exitScript, isVertical, overlayHtml, presetSpeed, scaler, safeColor,
  sweepScript, textCss, type SceneTemplate,
} from "./common";

/**
 * Elegant logo reveal: concentric arcs draw in, the mark resolves from blur,
 * then a light sweep travels across the logo only (masked by the logo alpha).
 * variant "light" (default) suits logos with dark elements; "dark" for light logos.
 */
export const logoReveal: SceneTemplate = (ctx) => {
  const px = scaler(ctx);
  const sp = presetSpeed(ctx.scene.animationPreset);
  const light = ctx.scene.variant !== "dark";
  const accent = safeColor(ctx.brand.accentColor, "#C6A76B");
  const primary = safeColor(ctx.brand.primaryColor, accent);
  const v = isVertical(ctx);
  const logoW = v ? 760 : 680;
  const textColor = light ? "#14161B" : safeColor(ctx.brand.textColor, "#F5F5F7");
  const R = v ? 470 : 420;
  const logo = ctx.assets.logo;
  return {
    css: `${backdropCss(ctx, { light })}${textCss(ctx)}
    #camera { position:absolute; inset:0; }
    .anchor { position:absolute; left:0; right:0; top:46%; height:0; display:flex; justify-content:center; align-items:center; }
    .rings { flex:none; width:${px(R * 2)}; height:${px(R * 2)}; }
    .rings circle { fill:none; stroke-linecap:round; }
    .logo-wrap { flex:none; position:relative; width:${px(logoW)}; }
    .logo-wrap img { display:block; width:100%; height:auto; }
    .shine { position:absolute; inset:0; -webkit-mask-image:url("${logo ?? ""}"); mask-image:url("${logo ?? ""}");
      -webkit-mask-size:100% 100%; mask-size:100% 100%;
      background: linear-gradient(105deg, transparent 35%, rgba(255,255,255,.95) 50%, transparent 65%);
      background-size:300% 100%; background-position:120% 0; mix-blend-mode:screen; }
    .wordmark { position:absolute; left:${px(60)}; right:${px(60)}; top:calc(46% + ${px(v ? 330 : 280)}); text-align:center; }
    .wordmark .name { font-family:"Space Grotesk",sans-serif; font-weight:600; font-size:${px(46)}; letter-spacing:.18em; color:${textColor}; text-transform:uppercase; }
    .wordmark .tag { margin-top:${px(18)}; font-family:Inter,sans-serif; font-size:${px(34)}; font-weight:500; color:${light ? "rgba(20,22,27,.6)" : "rgba(245,245,247,.62)"}; letter-spacing:.02em; }
    .rule { width:${px(120)}; height:${px(2)}; margin:${px(26)} auto 0; background:${accent}; transform-origin:50% 50%; }
    .fallback-mark { font-family:"Space Grotesk",sans-serif; font-weight:700; font-size:${px(180)}; color:${primary}; text-align:center; letter-spacing:-.04em; }
    `,
    html: `<div id="camera">${backdropHtml(!light)}
      <div class="anchor"><svg class="rings" viewBox="0 0 ${R * 2} ${R * 2}">
        <circle id="ring1" cx="${R}" cy="${R}" r="${R - 6}" stroke="${accent}" stroke-width="2.5" stroke-dasharray="${Math.round(2 * Math.PI * (R - 6))}" stroke-dashoffset="${Math.round(2 * Math.PI * (R - 6))}" opacity=".85"/>
        <circle id="ring2" cx="${R}" cy="${R}" r="${R - 46}" stroke="${light ? "#14161B" : "#ffffff"}" stroke-width="1.2" stroke-dasharray="${Math.round(2 * Math.PI * (R - 46))}" stroke-dashoffset="${Math.round(2 * Math.PI * (R - 46))}" opacity=".25"/>
      </svg></div>
      <div class="anchor"><div class="logo-wrap" id="logo">
        ${logo ? `<img src="${esc(logo)}" alt=""/><div class="shine" id="shine"></div>` : `<div class="fallback-mark">${esc(ctx.brand.brandName.slice(0, 3).toUpperCase())}</div>`}
      </div></div>
      <div class="wordmark" id="wordmark">
        <div class="name">${esc(ctx.scene.headline || ctx.brand.brandName)}</div>
        <div class="rule" id="rule"></div>
        ${ctx.scene.subline ? `<div class="tag">${esc(ctx.scene.subline)}</div>` : ""}
      </div>
    </div>${overlayHtml()}`,
    script: `
      tl.fromTo("#camera",{scale:1.04},{scale:1,duration:${ctx.duration},ease:"power1.out"},0);
      tl.to("#ring1",{strokeDashoffset:0,duration:${(1.8 * sp).toFixed(2)},ease:"power2.inOut"},0.1);
      tl.to("#ring2",{strokeDashoffset:0,duration:${(2.1 * sp).toFixed(2)},ease:"power2.inOut"},0.25);
      tl.fromTo(".rings",{rotation:-40},{rotation:0,duration:${ctx.duration},ease:"power1.out"},0);
      tl.fromTo("#logo",{opacity:0,scale:.86,filter:"blur(18px)"},{opacity:1,scale:1,filter:"blur(0px)",duration:${(1.3 * sp).toFixed(2)},ease:"expo.out"},${(0.45 * sp).toFixed(2)});
      tl.fromTo("#shine",{backgroundPosition:"120% 0"},{backgroundPosition:"-20% 0",duration:1.4,ease:"power2.inOut"},${(1.5 * sp).toFixed(2)});
      tl.fromTo("#wordmark .name",{opacity:0,y:18,filter:"blur(8px)"},{opacity:1,y:0,filter:"blur(0px)",duration:1.2,ease:"power3.out"},${(1.3 * sp).toFixed(2)});
      tl.fromTo("#rule",{scaleX:0},{scaleX:1,duration:.8,ease:"power3.out"},${(1.6 * sp).toFixed(2)});
      tl.fromTo("#wordmark .tag",{opacity:0,y:14},{opacity:1,y:0,duration:.8,ease:"power2.out"},${(1.85 * sp).toFixed(2)});
      ${light ? "" : sweepScript(1.6 * sp)}
      ${exitScript(".anchor, #wordmark", ctx, 0.5)}
    `,
  };
};
