/* 录屏主程序：在工作目录（建议放在临时目录）里运行，读取 tts{61|62}_NN.mp3 的时长逐段推进画面，输出 m{61|62}/master.mp4 与 marks.json
   用法：cd <工作目录> && node <仓库>/deck/rec/master.mjs 61 */
import { chromium, URL0 } from './lib.mjs';
import { execFileSync } from 'child_process';
import fs from 'fs';
const which = process.argv[2];
const scenes = (await import(`./scenes${which}.mjs`)).default;
const durs = fs.readdirSync('.').filter(f => f.startsWith(`tts${which}_`)).sort()
  .map(f => parseFloat(execFileSync('ffprobe',['-v','error','-show_entries','format=duration','-of','csv=p=0',f]).toString()));
if (durs.length !== scenes.cues.length) throw new Error('cue count mismatch');
const out = `m${which}`; fs.rmSync(out,{recursive:true,force:true}); fs.mkdirSync(out);
const b = await chromium.launch({ executablePath:'/Users/liangpingxian/Library/Caches/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-mac-arm64/chrome-headless-shell' });
const ctx = await b.newContext({ viewport:{width:1600,height:900}, deviceScaleFactor:2 });
const page = await ctx.newPage(); const t0 = Date.now();
/* 2 倍像素采集：CDP screencast 逐帧落盘，记录时间戳 */
const cdp = await ctx.newCDPSession(page);
const frames = []; fs.mkdirSync(`${out}/f`);
cdp.on('Page.screencastFrame', async ({ data, sessionId }) => {
  const t = (Date.now() - t0) / 1000; const file = `${out}/f/${String(frames.length).padStart(6,'0')}.jpg`;
  fs.writeFileSync(file, Buffer.from(data, 'base64')); frames.push({ t, file });
  try { await cdp.send('Page.screencastFrameAck', { sessionId }); } catch {}
});
await cdp.send('Page.startScreencast', { format:'jpeg', quality:95, maxWidth:3200, maxHeight:1800, everyNthFrame:1 });
page.on('pageerror', e => console.log('PAGEERR', e.message));
const CUR = `(()=>{ if(document.getElementById('recCursor')) return; const st=document.createElement('style'); st.textContent='#recCursor{position:fixed;left:800px;top:450px;width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;background:rgba(73,93,255,.35);border:2px solid #495dff;z-index:2147483647;pointer-events:none;transition:left .38s ease,top .38s ease,transform .15s}#recCursor.down{transform:scale(.7);background:rgba(73,93,255,.6)}'; document.head.appendChild(st); const hide=document.createElement('style'); hide.textContent='[data-platform-nav]{display:none!important}'; document.head.appendChild(hide); const k=document.createElement('div'); k.id='recCursor'; document.body.appendChild(k); })()`;
const ensure = () => page.evaluate(CUR);
const wait = ms => page.waitForTimeout(ms);
async function moveTo(loc){ await loc.scrollIntoViewIfNeeded(); const box=await loc.boundingBox(); await ensure(); if(box){ await page.evaluate(([x,y])=>{const k=document.getElementById('recCursor');k.style.left=x+'px';k.style.top=y+'px';},[box.x+box.width/2,box.y+box.height/2]); await wait(420);} }
async function click(t){ const loc = typeof t==='string' ? page.locator(t).filter({visible:true}).first() : t; await moveTo(loc); await page.evaluate(()=>document.getElementById('recCursor').classList.add('down')); await wait(90); await page.evaluate(()=>document.getElementById('recCursor').classList.remove('down')); await loc.click(); await wait(180); await ensure(); }
async function hover(t){ const loc = typeof t==='string' ? page.locator(t).filter({visible:true}).first() : t; await moveTo(loc); await loc.hover(); await wait(150); }
/* cut：执行期间的画面从成片里剪掉（如换账号登录），时间轴整体前移 */
const cuts = []; let cutTotal = 0;
async function cut(fn){ const a=(Date.now()-t0)/1000; await fn(); await ensure(); const b=(Date.now()-t0)/1000; cuts.push([a,b]); cutTotal+=b-a; }
async function switchUser(name){
  await page.evaluate(() => { try { sessionStorage.clear(); } catch (e) {} });
  await page.goto(URL0); await wait(700);
  await page.fill('#loginUser', name); await page.fill('#loginPass','lingee520'); await page.click('#loginBtn'); await wait(1100);
  await ensure();
}
async function type(sel, text, delay){ const loc=page.locator(sel).filter({visible:true}).first(); await moveTo(loc); await loc.click(); await loc.pressSequentially(text,{delay:delay||70}); }
const ev = (action, detail) => page.evaluate(([a, d]) => document.dispatchEvent(new CustomEvent('lingee:team-run', { detail: Object.assign({ action: a }, d || {}) })), [action, detail || null]);
const api = { page, click, hover, wait, ensure, cut, switchUser, type, moveTo, ev, durs };
await page.goto(URL0); await wait(600);
await page.fill('#loginUser', scenes.user); await page.fill('#loginPass','lingee520'); await page.click('#loginBtn'); await wait(1200);
/* 画面人名替换：scenes.rename 为 [原名, 显示名] 列表，只改显示层，原型数据不变 */
if (scenes.rename) {
await page.evaluate((RT) => {
  const has=x=>RT.some(([a])=>x.includes(a));
  const rep=x=>RT.reduce((v,[a,b])=>v.split(a).join(b),x);
  const fix = n => { if (n.nodeType===3) { if (has(n.data) && !(n.parentElement&&n.parentElement.id==='userName')) n.data = rep(n.data); return; }
    if (n.nodeType!==1) return; for (const at of ['title','placeholder','aria-label','alt']) { const v=n.getAttribute&&n.getAttribute(at); if (v&&has(v)) n.setAttribute(at, rep(v)); }
    const w=document.createTreeWalker(n,4); let t; while((t=w.nextNode())) if (has(t.data) && !(t.parentElement&&t.parentElement.id==='userName')) t.data=rep(t.data); };
  new MutationObserver(ms => ms.forEach(m => { if (m.type==='characterData') fix(m.target); else if (m.type==='attributes') fix(m.target); else m.addedNodes.forEach(fix); }))
    .observe(document, { subtree:true, childList:true, characterData:true, attributes:true, attributeFilter:['title','placeholder','aria-label','alt'] });
  const un=document.getElementById('userName'); const col=getComputedStyle(un).color; const st=document.createElement('style'); st.textContent='#userName{position:relative;color:transparent!important}#userName::after{content:"'+rep(un.textContent.trim())+'";position:absolute;left:0;top:0;color:'+col+';white-space:nowrap}'; document.head.appendChild(st); fix(document.body); document.title=rep(document.title);
  /* 输入框、文本域的值不是文本节点，定时替换 */
  setInterval(() => document.querySelectorAll('textarea, input[type=text]').forEach(el => { if (has(el.value)) el.value = rep(el.value); }), 200); }, scenes.rename);
}
await ensure(); if (scenes.prepare) await scenes.prepare(api); await wait(600);
const marks=[];
for (let i=0;i<scenes.cues.length;i++){
  const s=(Date.now()-t0)/1000; marks.push(s); console.log("cue", i, s.toFixed(1));
  const minEnd = Date.now() + durs[i]*1000 + 400; const cutBefore = cutTotal;
  await scenes.cues[i](api);
  const left = minEnd + (cutTotal-cutBefore)*1000 - Date.now(); if (left>0) await wait(left);
}
await wait(500);
const tEnd=(Date.now()-t0)/1000;
await cdp.send('Page.stopScreencast'); await ctx.close(); await b.close();
const start = marks[0]-0.4;
/* 真实时间 → 剪辑后时间 */
const remap = t => t - cuts.reduce((acc,[a,b]) => acc + Math.max(0, Math.min(t,b)-a), 0);
const inCut = t => cuts.some(([a,b]) => t>=a && t<b);
/* 帧序列 → ffconcat（按时间戳给时长），从 start 起截取 */
const lines=['ffconcat version 1.0']; let prev=null;
const usable = frames.filter((f,i)=> !inCut(f.t) && (f.t>=start || (frames[i+1] && frames[i+1].t>start)));
usable.forEach((f,i)=>{ const st=Math.max(f.t,start); const en= i+1<usable.length ? usable[i+1].t : tEnd; const d=remap(en)-remap(st); if(d<=0.0005) return; lines.push(`file '${f.file.replace(out+'/','')}'`, `duration ${d.toFixed(4)}`); prev=f; });
lines.push(`file '${prev.file.replace(out+'/','')}'`);
fs.writeFileSync(`${out}/frames.ffconcat`, lines.join('\n'));
execFileSync('ffmpeg',['-v','error','-y','-f','concat','-safe','0','-i',`${out}/frames.ffconcat`,'-vf','fps=30,scale=2560:1440:flags=lanczos,format=yuv420p','-t',(remap(tEnd)-remap(start)).toFixed(2),'-c:v','libx264','-crf','12','-preset','medium',`${out}/master.mp4`]);
const rel = t => +(remap(t)-remap(start)).toFixed(3);
fs.writeFileSync(`${out}/marks.json`, JSON.stringify({ marks:marks.map(rel), durs, total:rel(tEnd) }));
console.log('master', which, rel(tEnd), marks.map(rel).join(','), 'cuts', cuts.map(c=>c.map(x=>x.toFixed(1)).join('-')).join(' '));
