import {
  backdropCss, backdropHtml, cameraScript, esc, exitScript, isVertical, overlayHtml, particlesScript,
  presetSpeed, scaler, safeColor, sweepScript, textCss, wordRevealScript, wordsAccentLast, type SceneTemplate,
} from "./common";

/** Dark opening: a line of light opens the frame, the headline rises out of it. */
export const cinematicIntro: SceneTemplate = (ctx) => {
  const px = scaler(ctx);
  const sp = presetSpeed(ctx.scene.animationPreset);
  const accent = safeColor(ctx.brand.accentColor, "#C6A76B");
  const v = isVertical(ctx);
  return {
    css: `${backdropCss(ctx)}${textCss(ctx)}
    #camera { position:absolute; inset:0; transform-origin:50% 50%; }
    .center { position:absolute; left:${px(80)}; right:${px(80)}; top:0; bottom:0; display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center; }
    .headline { font-size:${px(v ? 118 : 104)}; }
    .subline { margin-top:${px(34)}; }
    .eyebrow { margin-bottom:${px(36)}; opacity:0; }
    .beam { position:absolute; left:50%; top:50%; height:${px(2)}; width:${px(900)}; margin-left:${px(-450)};
      background:linear-gradient(90deg, transparent, ${accent}, #fff, ${accent}, transparent); transform-origin:50% 50%;
      box-shadow:0 0 ${px(30)} ${accent}; }
    .beam-glow { position:absolute; left:50%; top:50%; width:${px(1200)}; height:${px(500)}; margin:${px(-250)} 0 0 ${px(-600)};
      background: radial-gradient(50% 50% at 50% 50%, rgba(255,230,180,.22), transparent 70%); opacity:0; }
    `,
    html: `<div id="camera">${backdropHtml()}
      <div class="beam-glow" id="beamGlow"></div>
      <div class="beam" id="beam"></div>
      <div class="center" id="copy">
        ${ctx.brand.brandName ? `<div class="eyebrow" id="eyebrow">${esc(ctx.project.productName || ctx.brand.brandName)}</div>` : ""}
        <h1 class="headline">${wordsAccentLast(ctx.scene.headline)}</h1>
        ${ctx.scene.subline ? `<p class="subline" id="sub">${esc(ctx.scene.subline)}</p>` : ""}
      </div></div>${overlayHtml()}`,
    script: `
      ${cameraScript(ctx, 1.0, 1.07)}
      tl.fromTo("#beam",{scaleX:0,opacity:0},{scaleX:1,opacity:1,duration:${(1.1 * sp).toFixed(2)},ease:"expo.out"},0.15);
      tl.fromTo("#beamGlow",{opacity:0,scale:.6},{opacity:1,scale:1,duration:1.2,ease:"sine.out"},0.2);
      tl.to("#beam",{overwrite:"auto",y:${v ? 200 : 140}*${Math.min(ctx.width, ctx.height) / 1080},opacity:0.0,scaleX:1.4,duration:${(1.0 * sp).toFixed(2)},ease:"power2.inOut"},${(0.95 * sp).toFixed(2)});
      tl.to("#beamGlow",{opacity:.35,duration:1,overwrite:"auto"},${(1.1 * sp).toFixed(2)});
      tl.fromTo("#eyebrow",{opacity:0,y:14,filter:"blur(6px)"},{opacity:1,y:0,filter:"blur(0px)",duration:1.2,ease:"power2.out"},${(0.9 * sp).toFixed(2)});
      ${wordRevealScript(".headline .w-i", 1.05 * sp, sp, 0.1)}
      tl.fromTo("#sub",{opacity:0,y:18},{opacity:1,y:0,duration:.9,ease:"power2.out"},${(1.7 * sp).toFixed(2)});
      ${sweepScript(Math.min(ctx.duration - 1.8, 2.0 * sp))}
      ${particlesScript(ctx, 22)}
      ${exitScript("#copy", ctx)}
    `,
  };
};
