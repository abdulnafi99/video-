import {
  backdropCss, backdropHtml, esc, hexA, isVertical, overlayHtml, particlesScript, presetSpeed, scaler,
  safeColor, sweepScript, textCss, wordRevealScript, wordsAccentLast, type SceneTemplate,
} from "./common";

/** Closing call-to-action: headline, shimmering pill button and contact row. */
export const finalCta: SceneTemplate = (ctx) => {
  const px = scaler(ctx);
  const sp = presetSpeed(ctx.scene.animationPreset);
  const v = isVertical(ctx);
  const accent = safeColor(ctx.brand.accentColor, "#C6A76B");
  const contacts = [ctx.brand.handle, ctx.brand.website, ctx.brand.location].filter(Boolean) as string[];
  const button = ctx.scene.bullets?.[0] || "Hubungi kami";
  const logo = ctx.assets.logo;
  return {
    css: `${backdropCss(ctx)}${textCss(ctx)}
    #camera { position:absolute; inset:0; }
    .wrap { position:absolute; left:${px(80)}; right:${px(80)}; top:0; bottom:${px(v ? 140 : 60)}; display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center; }
    .headline { font-size:${px(v ? 104 : 92)}; }
    .subline { margin:${px(34)} auto 0; max-width:${px(860)}; }
    .btn { position:relative; display:inline-flex; align-items:center; gap:${px(18)}; margin-top:${px(70)}; padding:${px(34)} ${px(64)};
      border-radius:999px; background:${accent}; color:#0B0B0D; font-family:Inter,sans-serif; font-weight:600; font-size:${px(38)};
      box-shadow:0 ${px(24)} ${px(60)} ${hexA(accent, 0.35)}; overflow:hidden; }
    .btn::after { content:""; position:absolute; inset:0; background:linear-gradient(100deg, transparent 30%, rgba(255,255,255,.7) 50%, transparent 70%); background-size:250% 100%; background-position:var(--shine,150%) 0; }
    .arrow { display:inline-block; width:${px(22)}; height:${px(22)}; border-top:${px(4)} solid #0B0B0D; border-right:${px(4)} solid #0B0B0D; transform:rotate(45deg); margin-left:${px(4)}; }
    .contacts { margin-top:${px(64)}; display:flex; flex-direction:${v ? "column" : "row"}; justify-content:center; align-items:center; gap:${px(v ? 18 : 48)}; }
    .contact { font-family:Inter,sans-serif; font-size:${px(36)}; color:rgba(245,245,247,.78); letter-spacing:.01em; }
    .contact b { color:#F5F5F7; font-weight:600; }
    .dot { display:inline-block; width:${px(10)}; height:${px(10)}; border-radius:50%; background:${accent}; margin-right:${px(16)}; vertical-align:middle; }
    .chip-row { position:absolute; left:0; right:0; bottom:${px(v ? 150 : 70)}; display:flex; justify-content:center; }
    .logo-chip { padding:${px(22)} ${px(36)}; border-radius:${px(28)}; background:rgba(244,242,238,.96); box-shadow:0 ${px(20)} ${px(50)} rgba(0,0,0,.4); }
    .logo-chip img { display:block; height:${px(v ? 170 : 110)}; width:auto; }
    `,
    html: `<div id="camera">${backdropHtml()}
      <div class="wrap" id="copy">
        <h2 class="headline">${wordsAccentLast(ctx.scene.headline)}</h2>
        ${ctx.scene.subline ? `<p class="subline" id="sub">${esc(ctx.scene.subline)}</p>` : ""}
        <div class="btn" id="btn">${esc(button)}<span class="arrow"></span></div>
        <div class="contacts">${contacts.map((c, i) => `<div class="contact" id="c${i}"><span class="dot"></span><b>${esc(c)}</b></div>`).join("")}</div>
      </div>
      ${logo ? `<div class="chip-row"><div class="logo-chip" id="chip"><img src="${esc(logo)}" alt=""/></div></div>` : ""}
    </div>${overlayHtml()}`,
    script: `
      tl.fromTo("#camera",{scale:1.05},{scale:1,duration:${ctx.duration},ease:"power2.out"},0);
      ${wordRevealScript(".headline .w-i", 0.2, sp, 0.08)}
      tl.fromTo("#sub",{opacity:0,y:18},{opacity:1,y:0,duration:.9,ease:"power2.out"},${(0.8 * sp).toFixed(2)});
      tl.fromTo("#btn",{opacity:0,y:40,scale:.92},{opacity:1,y:0,scale:1,duration:${(1.0 * sp).toFixed(2)},ease:"back.out(1.6)"},${(1.15 * sp).toFixed(2)});
      tl.fromTo("#btn",{"--shine":"150%"},{"--shine":"-50%",duration:1.3,ease:"power2.inOut"},${(1.9 * sp).toFixed(2)});
      tl.fromTo("#btn",{"--shine":"150%"},{"--shine":"-50%",duration:1.3,ease:"power2.inOut",immediateRender:false},${Math.max(2.0 * sp + 1.4, ctx.duration - 1.6).toFixed(2)});
      ${contacts.map((_, i) => `tl.fromTo("#c${i}",{opacity:0,y:16},{opacity:1,y:0,duration:.7,ease:"power2.out"},${(1.6 * sp + i * 0.18).toFixed(2)});`).join("\n")}
      tl.fromTo("#chip",{opacity:0,y:30},{opacity:1,y:0,duration:.9,ease:"power3.out"},${(2.0 * sp).toFixed(2)});
      ${sweepScript(0.6, 1.8)}
      ${particlesScript(ctx, 26)}
    `,
  };
};
