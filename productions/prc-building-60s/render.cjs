// Usage: node render.cjs <startFrame> <endFrame(excl)> <out.mp4>
const { chromium } = require('playwright');
const { spawn } = require('child_process');
(async()=>{
  const [s,e,out]=[+process.argv[2],+process.argv[3],process.argv[4]];
  const FPS=30;
  const ff=spawn('ffmpeg',['-y','-loglevel','error','-f','image2pipe','-framerate',String(FPS),'-c:v','mjpeg','-i','-',
    '-c:v','libx264','-preset','medium','-crf','17','-pix_fmt','yuv420p','-threads','2','-r',String(FPS),out],{stdio:['pipe','inherit','inherit']});
  const b=await chromium.launch();
  const p=await b.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:2});
  await p.goto('http://127.0.0.1:8765/index.html');await p.evaluate(()=>window.ready);
  const t0=Date.now();
  for(let f=s;f<e;f++){
    await p.evaluate(t=>window.renderAt(t),f/FPS);
    const buf=await p.screenshot({type:'jpeg',quality:95});
    if(!ff.stdin.write(buf))await new Promise(r=>ff.stdin.once('drain',r));
    if((f-s)%60===0)console.log(`[${out}] frame ${f} (${((Date.now()-t0)/1000/(f-s+1)).toFixed(2)}s/f)`);
  }
  ff.stdin.end();await new Promise(r=>ff.on('close',r));await b.close();console.log('done',out);
})();
