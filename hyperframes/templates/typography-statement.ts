import {
  backdropCss, backdropHtml, cameraScript, esc, exitScript, isVertical, overlayHtml, particlesScript,
  presetSpeed, scaler, safeColor, sweepScript, textCss, type SceneTemplate,
} from "./common";

/**
 * Big statement typography. Lines are split on "|" or "." — each line rises
 * from its own mask; the final line is set in the accent colour.
 */
export const typographyStatement: SceneTemplate = (ctx) => {
  const px = scaler(ctx);
  const sp = presetSpeed(ctx.scene.animationPreset);
  const v = isVertical(ctx);
  const accent = safeColor(ctx.brand.accentColor, "#C6A76B");
  const raw = ctx.scene.headline || "";
  const lines = (raw.includes("|") ? raw.split("|") : raw.split(/(?<=\.)\s+/)).map((l) => l.trim()).filter(Boolean);
  const step = Math.min(0.75, (ctx.duration - 2) / Math.max(1, lines.length)) * sp;
  return {
    css: `${backdropCss(ctx)}${textCss(ctx)}
    #camera { position:absolute; inset:0; }
    .stack { position:absolute; left:${px(90)}; right:${px(90)}; top:0; bottom:0; display:flex; flex-direction:column; justify-content:center; text-align:${v ? "left" : "center"}; }
    .line { display:block; overflow:hidden; padding-bottom:.06em; }
    .line-i { display:block; font-family:"Space Grotesk",sans-serif; font-weight:600; font-size:${px(v ? 118 : 120)}; letter-spacing:-.045em; line-height:1.0; color:#F5F5F7; }
    .line.last .line-i { color:${accent}; }
    .subline { margin-top:${px(48)}; font-size:${px(36)}; }
    .bar { width:${px(6)}; height:${px(140)}; background:${accent}; position:absolute; left:${px(50)}; top:calc(50% - ${px(70)}); transform-origin:50% 0; display:${v ? "block" : "none"}; }
    `,
    html: `<div id="camera">${backdropHtml()}
      <div class="bar" id="bar"></div>
      <div class="stack" id="copy">
        ${lines.map((l, i) => `<span class="line${i === lines.length - 1 && lines.length > 1 ? " last" : ""}"><span class="line-i">${esc(l)}</span></span>`).join("")}
        ${ctx.scene.subline ? `<p class="subline" id="sub">${esc(ctx.scene.subline)}</p>` : ""}
      </div></div>${overlayHtml()}`,
    script: `
      ${cameraScript(ctx, 1.06, 1.0)}
      tl.fromTo("#bar",{scaleY:0},{scaleY:1,duration:.9,ease:"expo.out"},0.2);
      ${lines
        .map(
          (_, i) =>
            `tl.fromTo(".line:nth-child(${i + 1}) .line-i",{yPercent:105,rotation:2.5,opacity:0},{yPercent:0,rotation:0,opacity:1,duration:${(1.0 * sp).toFixed(2)},ease:"expo.out"},${(0.35 + i * step).toFixed(2)});`,
        )
        .join("\n")}
      tl.fromTo("#sub",{opacity:0,y:16},{opacity:1,y:0,duration:.9,ease:"power2.out"},${(0.5 + lines.length * step).toFixed(2)});
      ${sweepScript(Math.max(0.6, 0.4 + lines.length * step))}
      ${particlesScript(ctx, 14)}
      ${exitScript("#copy, #bar", ctx)}
    `,
  };
};
