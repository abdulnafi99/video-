import type { TemplateContext, TemplateOutput } from "./common";
import { esc } from "./common";

export const COMPOSITION_ID = "scene";

/**
 * Wraps a template's output in the HyperFrames composition contract:
 *  - root element with data-composition-id / data-width / data-height / data-duration
 *  - a paused GSAP timeline registered on window.__timelines[COMPOSITION_ID] (registered last)
 *  - fonts and libraries loaded from local files only (no network during render)
 */
export function buildDocument(ctx: TemplateContext, out: TemplateOutput): string {
  const { width, height, duration } = ctx;
  return `<!doctype html>
<html lang="${ctx.project.language === "ms" ? "ms" : "en"}">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=${width}, height=${height}" />
<title>${esc(ctx.project.name)} — scene ${ctx.scene.order + 1}</title>
<script src="./lib/gsap.min.js"></script>
<style>
@font-face { font-family:"Inter"; font-weight:400; src:url("./lib/fonts/inter-400.woff2") format("woff2"); }
@font-face { font-family:"Inter"; font-weight:500; src:url("./lib/fonts/inter-500.woff2") format("woff2"); }
@font-face { font-family:"Inter"; font-weight:600; src:url("./lib/fonts/inter-600.woff2") format("woff2"); }
@font-face { font-family:"Inter"; font-weight:700; src:url("./lib/fonts/inter-700.woff2") format("woff2"); }
@font-face { font-family:"Space Grotesk"; font-weight:500; src:url("./lib/fonts/space-grotesk-500.woff2") format("woff2"); }
@font-face { font-family:"Space Grotesk"; font-weight:600; src:url("./lib/fonts/space-grotesk-600.woff2") format("woff2"); }
@font-face { font-family:"Space Grotesk"; font-weight:700; src:url("./lib/fonts/space-grotesk-700.woff2") format("woff2"); }
* { margin:0; padding:0; box-sizing:border-box; }
html, body { width:${width}px; height:${height}px; overflow:hidden; background:#08090C; -webkit-font-smoothing:antialiased; }
#root { position:relative; width:${width}px; height:${height}px; overflow:hidden; font-family:Inter, sans-serif; }
${out.css}
</style>
</head>
<body>
<div id="root" data-composition-id="${COMPOSITION_ID}" data-start="0" data-duration="${duration}" data-width="${width}" data-height="${height}" data-fps="${ctx.fps}">
  <div id="stage">
    ${out.html}
  </div>
</div>
<script>
(function(){
  var tl = gsap.timeline({ paused: true });
  ${out.script}
  // keep the timeline exactly as long as the scene
  tl.set({}, {}, ${duration});
  window.__timelines = window.__timelines || {};
  window.__timelines["${COMPOSITION_ID}"] = tl;
})();
</script>
${out.moduleScript ? `<script type="module">\n${out.moduleScript}\n</script>` : ""}
</body>
</html>
`;
}

/**
 * Injected ONLY into the dashboard's live preview (never into render files).
 * Plays the paused timeline in a loop and emits the same hf-seek events the
 * HyperFrames runtime emits, so GSAP and Three.js scenes preview identically.
 */
export const PREVIEW_DRIVER = `<script>
(function(){
  var start=null, D=parseFloat(document.getElementById("root").getAttribute("data-duration"))||5, paused=false, last=0;
  window.addEventListener("message", function(e){
    if(!e.data||e.data.source!=="cinemotion") return;
    if(e.data.type==="pause"){paused=true;} if(e.data.type==="play"){paused=false;start=null;}
    if(e.data.type==="seek"){paused=true;seek(e.data.time||0);}
  });
  function seek(t){ last=t; var tl=window.__timelines&&window.__timelines.scene; if(tl) tl.seek(t,false);
    window.dispatchEvent(new CustomEvent("hf-seek",{detail:{time:t,waitUntil:function(){}}}));
    try{ parent.postMessage({source:"cinemotion-scene",type:"time",time:t,duration:D},"*"); }catch(_){} }
  function loop(ts){ if(!paused){ if(start===null) start=ts-last*1000; var t=((ts-start)/1000)%D; seek(t);} requestAnimationFrame(loop); }
  window.addEventListener("load", function(){ var br=(window.__hf&&window.__hf.buildReady)||{}; Promise.all(Object.values(br)).then(function(){ requestAnimationFrame(loop); }); });
})();
</script>`;
