import {
  backdropCss, backdropHtml, cameraScript, esc, exitScript, hexA, isVertical, overlayHtml, particlesScript,
  presetSpeed, scaler, safeColor, sweepScript, textCss, wordRevealScript, wordsAccentLast, type SceneTemplate,
  type TemplateContext,
} from "./common";

function heroMedia(ctx: TemplateContext, cls: string) {
  const vid = ctx.assets.videos[0];
  const img = ctx.assets.images[0];
  if (vid) {
    return `<video class="${cls}" id="hero" src="${esc(vid)}" muted playsinline data-start="0" data-duration="${ctx.duration}" data-track-index="1"></video>`;
  }
  if (img) return `<img class="${cls}" id="hero" src="${esc(img)}" alt=""/>`;
  return `<div class="${cls} placeholder" id="hero"></div>`;
}

/** Full-bleed hero image/video with slow Ken Burns move and lower-third copy. */
export const productShowcase: SceneTemplate = (ctx) => {
  const px = scaler(ctx);
  const sp = presetSpeed(ctx.scene.animationPreset);
  const v = isVertical(ctx);
  const accent = safeColor(ctx.brand.accentColor, "#C6A76B");
  return {
    css: `${backdropCss(ctx)}${textCss(ctx)}
    #camera { position:absolute; inset:0; }
    .hero { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
    .placeholder { background: radial-gradient(60% 50% at 50% 40%, ${hexA(accent, 0.35)}, transparent 70%), linear-gradient(160deg,#1b1e26,#08090C); }
    .shade { position:absolute; inset:0; background:linear-gradient(180deg, rgba(8,9,12,.15) 0%, rgba(8,9,12,.05) 40%, rgba(8,9,12,.92) 100%); }
    .copy { position:absolute; left:${px(90)}; right:${px(90)}; bottom:${px(v ? 260 : 120)}; }
    .headline { font-size:${px(v ? 104 : 92)}; }
    .subline { margin-top:${px(26)}; max-width:${px(900)}; }
    .eyebrow { margin-bottom:${px(24)}; }
    `,
    html: `<div id="camera">${backdropHtml(false)}${heroMedia(ctx, "hero")}<div class="shade"></div>
      <div class="copy" id="copy">
        <div class="eyebrow" id="eyebrow">${esc(ctx.project.productName)}</div>
        <h2 class="headline">${wordsAccentLast(ctx.scene.headline)}</h2>
        ${ctx.scene.subline ? `<p class="subline" id="sub">${esc(ctx.scene.subline)}</p>` : ""}
      </div></div>${overlayHtml()}`,
    script: `
      tl.fromTo("#hero",{scale:1.12,xPercent:-1.5},{scale:1.0,xPercent:1.5,duration:${ctx.duration},ease:"none"},0);
      tl.fromTo("#hero",{opacity:0},{opacity:1,duration:.8,ease:"sine.out"},0);
      tl.fromTo("#eyebrow",{opacity:0,y:10},{opacity:1,y:0,duration:.7},${(0.5 * sp).toFixed(2)});
      ${wordRevealScript(".headline .w-i", 0.7 * sp, sp)}
      tl.fromTo("#sub",{opacity:0,y:16},{opacity:1,y:0,duration:.8,ease:"power2.out"},${(1.3 * sp).toFixed(2)});
      ${sweepScript(1.0)}
      ${exitScript("#copy", ctx)}
    `,
  };
};

/** Product image floating in space with soft shadow and gentle bob. */
export const floatingProduct: SceneTemplate = (ctx) => {
  const px = scaler(ctx);
  const sp = presetSpeed(ctx.scene.animationPreset);
  const v = isVertical(ctx);
  const accent = safeColor(ctx.brand.accentColor, "#C6A76B");
  const img = ctx.assets.images[0];
  const cycles = Math.max(1, Math.floor(ctx.duration / 3));
  return {
    css: `${backdropCss(ctx)}${textCss(ctx)}
    #camera { position:absolute; inset:0; }
    .float { position:absolute; left:calc(50% - ${px(v ? 410 : 380)}); top:calc(${v ? "40%" : "46%"} - ${px(v ? 410 : 310)}); width:${px(v ? 820 : 760)}; height:${px(v ? 820 : 620)}; }
    .float img { width:100%; height:100%; object-fit:contain; filter: drop-shadow(0 ${px(40)} ${px(50)} rgba(0,0,0,.55)); }
    .float .ph { width:100%; height:100%; border-radius:${px(60)}; background:linear-gradient(145deg, ${hexA(accent, 0.6)}, #1b1e26); }
    .shadow { position:absolute; left:calc(50% - ${px(260)}); top:${v ? "62%" : "80%"}; width:${px(520)}; height:${px(60)}; border-radius:50%; background:radial-gradient(50% 50% at 50% 50%, rgba(0,0,0,.6), transparent 70%); }
    .copy { position:absolute; left:${px(90)}; right:${px(90)}; ${v ? `bottom:${px(220)}` : `bottom:${px(70)}`}; text-align:center; }
    .headline { font-size:${px(v ? 92 : 76)}; }
    .subline { margin-top:${px(20)}; }
    `,
    html: `<div id="camera">${backdropHtml()}<div class="shadow" id="shadow"></div>
      <div class="float" id="float">${img ? `<img src="${esc(img)}" alt=""/>` : `<div class="ph"></div>`}</div>
      <div class="copy" id="copy"><h2 class="headline">${wordsAccentLast(ctx.scene.headline)}</h2>
      ${ctx.scene.subline ? `<p class="subline" id="sub">${esc(ctx.scene.subline)}</p>` : ""}</div></div>${overlayHtml()}`,
    script: `
      tl.fromTo("#float",{opacity:0,y:80,rotation:-4,scale:.9},{opacity:1,y:0,rotation:0,scale:1,duration:${(1.4 * sp).toFixed(2)},ease:"expo.out"},0.1);
      tl.to("#float",{y:-22*${Math.min(ctx.width, ctx.height) / 1080},rotation:1.2,duration:1.5,ease:"sine.inOut",yoyo:true,repeat:${cycles * 2 - 1}},${(1.5 * sp).toFixed(2)});
      tl.fromTo("#shadow",{opacity:0,scaleX:.6},{opacity:1,scaleX:1,duration:1.2},0.3);
      ${wordRevealScript(".headline .w-i", 0.9 * sp, sp)}
      tl.fromTo("#sub",{opacity:0},{opacity:1,duration:.8},${(1.5 * sp).toFixed(2)});
      ${particlesScript(ctx, 30)}
      ${sweepScript(1.6)}
      ${exitScript("#copy, #float, #shadow", ctx)}
    `,
  };
};

/** Device mockup with a screenshot that scrolls like a live UI demo. */
export const uiDemonstration: SceneTemplate = (ctx) => {
  const px = scaler(ctx);
  const sp = presetSpeed(ctx.scene.animationPreset);
  const v = isVertical(ctx);
  const img = ctx.assets.images[0];
  return {
    css: `${backdropCss(ctx)}${textCss(ctx)}
    #camera { position:absolute; inset:0; perspective:${px(2400)}; }
    .device { position:absolute; left:calc(50% - ${px(v ? 320 : 550)}); top:calc(${v ? "54%" : "56%"} - ${px(v ? 610 : 330)}); width:${px(v ? 640 : 1100)}; height:${px(v ? 1220 : 660)}; border-radius:${px(v ? 80 : 32)}; padding:${px(18)}; background:linear-gradient(145deg,#2a2d35,#0e0f13);
      box-shadow:0 ${px(60)} ${px(120)} rgba(0,0,0,.6), inset 0 0 0 ${px(2)} rgba(255,255,255,.08); }
    .screen { width:100%; height:100%; border-radius:${px(v ? 64 : 18)}; overflow:hidden; background:#111318; position:relative; }
    .screen img { position:absolute; left:0; top:0; width:100%; height:auto; }
    .screen .ph { position:absolute; inset:0; background:repeating-linear-gradient(180deg,#171A21 0 ${px(120)},#1d212a ${px(120)} ${px(130)}); }
    .copy { position:absolute; left:${px(90)}; right:${px(90)}; top:${px(v ? 170 : 70)}; text-align:center; }
    .headline { font-size:${px(v ? 84 : 70)}; }
    `,
    html: `<div id="camera">${backdropHtml()}
      <div class="copy" id="copy"><h2 class="headline">${wordsAccentLast(ctx.scene.headline)}</h2>${ctx.scene.subline ? `<p class="subline">${esc(ctx.scene.subline)}</p>` : ""}</div>
      <div class="device" id="device"><div class="screen">${img ? `<img id="shot" src="${esc(img)}" alt=""/>` : `<div class="ph" id="shot"></div>`}</div></div>
    </div>${overlayHtml()}`,
    script: `
      tl.fromTo("#device",{opacity:0,y:120,rotationX:18},{opacity:1,y:0,rotationX:0,duration:${(1.4 * sp).toFixed(2)},ease:"expo.out"},0.2);
      tl.fromTo("#shot",{yPercent:0},{yPercent:-35,duration:${Math.max(1, ctx.duration - 2.2).toFixed(2)},ease:"power1.inOut"},1.4);
      ${wordRevealScript(".headline .w-i", 0.1, sp)}
      ${cameraScript(ctx, 1.0, 1.03)}
      ${exitScript("#copy", ctx)}
    `,
  };
};
