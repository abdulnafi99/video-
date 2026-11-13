const { chromium } = require('playwright');(async()=>{
const times=process.argv.slice(2).map(Number);
const b=await chromium.launch();const p=await b.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
await p.goto('http://127.0.0.1:8765/index.html');await p.evaluate(()=>window.ready);
for(const t of times){await p.evaluate(t=>window.renderAt(t),t);await p.screenshot({path:`/tmp/claude-0/-home-user-video-/dddb85e4-6715-56da-8aa0-1885580d43c7/scratchpad/f_${t}.jpg`,type:'jpeg',quality:80});}
console.log(errs.join('\n')||'no errors');await b.close();})();
