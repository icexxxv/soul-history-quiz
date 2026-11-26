import {spawn} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const qa=path.resolve(root,'../static-qa');fs.mkdirSync(qa,{recursive:true});
const child=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--no-sandbox','--disable-gpu','--no-first-run','--disable-extensions','--remote-debugging-pipe',`--user-data-dir=${path.join(qa,'chrome-profile')}`],{windowsHide:true,stdio:['ignore','ignore','ignore','pipe','pipe']});
let seq=0,buffer='',session;const pending=new Map();
child.stdio[4].on('data',chunk=>{buffer+=chunk.toString();let end;while((end=buffer.indexOf('\0'))>=0){const part=buffer.slice(0,end);buffer=buffer.slice(end+1);if(!part)continue;const message=JSON.parse(part);if(message.id){const handler=pending.get(message.id);pending.delete(message.id);message.error?handler?.reject(new Error(JSON.stringify(message.error))):handler?.resolve(message.result);}}});
const send=(method,params={},sid=session)=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});child.stdio[3].write(JSON.stringify({id,method,params,...(sid?{sessionId:sid}:{})})+'\0');});
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const deadline=setTimeout(()=>{child.kill();for(const h of pending.values())h.reject(new Error('Browser QA timeout'));},55000);
async function evaluate(expression){const value=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(value.exceptionDetails)throw new Error(JSON.stringify(value.exceptionDetails));return value.result.value;}
async function wait(expression){for(let n=0;n<90;n++){if(await evaluate(expression))return;await delay(80);}throw new Error('Timeout: '+expression);}
async function check(expression,label){if(!await evaluate(expression))throw new Error('FAILED: '+label);console.log('PASS '+label);}
async function screenshot(name){await delay(120);const {data}=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(path.join(qa,name+'.png'),Buffer.from(data,'base64'));}
async function answerAll(){for(let n=0;n<26;n++){if(await evaluate('!!document.querySelector("#share")'))return;const before=await evaluate('document.querySelector(".progress-count")?.textContent');await evaluate('document.querySelector("[data-answer=\\"0\\"]")?.click()');await wait(`!!document.querySelector('#share')||document.querySelector('.progress-count')?.textContent!==${JSON.stringify(before)}`);}await wait('!!document.querySelector("#share")');}
try{
 const {targetId}=await send('Target.createTarget',{url:'about:blank'},null);session=(await send('Target.attachToTarget',{targetId,flatten:true},null)).sessionId;
 await send('Page.enable');await send('Network.enable');await send('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 await send('Page.navigate',{url:pathToFileURL(path.join(root,'index.html')).href});
 await wait('!!document.querySelector("[data-era=tang]")');
 await evaluate('localStorage.clear(); location.reload()');await wait('!!document.querySelector("[data-era=tang]")');
 await check('location.protocol==="file:"&&!document.querySelector("#access-form")','real file:// entry without access gate or server');
 await check('document.querySelectorAll("[data-era]").length===6','five dynasties and random choice');await screenshot('mobile-eras');
 await check('!(/收录|候选|共\\d+位/.test(document.querySelector("#main").textContent))','no catalogue count on dynasty page');
 await evaluate('document.querySelector("[data-era=tang]").click()');
 await check('document.querySelectorAll("[data-gender]").length===3','independent gender page');
 await check('!(/收录|候选|\\d+\\s*位历史人物/.test(document.querySelector("#main").textContent))','no catalogue count on gender page');
 await evaluate('document.querySelector("[data-gender=any]").click()');await wait('!!document.querySelector("[data-answer]")');
 await check('document.querySelector(".ability-label").textContent.includes("本题考察")&&!document.querySelector("#next")','ability label and no next button');
 await screenshot('mobile-question');
 await evaluate('document.querySelector("[data-answer=\\"2\\"]").click()');await wait('document.querySelector(".progress-count").textContent.startsWith("2 / 26")');
 await evaluate('document.querySelector("#previous").click()');await check('document.querySelector("[data-answer=\\"2\\"]").getAttribute("aria-pressed")==="true"','back preserves selection');
 await evaluate('document.querySelector("[data-answer=\\"1\\"]").click()');await wait('document.querySelector(".progress-count").textContent.startsWith("2 / 26")');
 await evaluate('location.reload()');await wait('!!document.querySelector("#resume")');await evaluate('document.querySelector("#resume").click()');
 await wait('!!document.querySelector("[data-answer]")');await check('document.querySelector(".progress-count").textContent.startsWith("2 / 26")','save and restore from real localStorage');
 await answerAll();await check('document.querySelectorAll("[role=meter]").length===8','26 auto advancing questions and eight result dimensions offline');
 await check('document.querySelectorAll("[data-report-section]").length===6&&document.querySelectorAll(".quote-grid blockquote").length===3','six complete report sections and three lines');
 await check('!(/收录|候选|共\\d+位/.test(document.querySelector("#main").textContent))','no catalogue count on result page');
 await screenshot('mobile-result');
 const metrics=await send('Page.getLayoutMetrics');const full=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:0,y:0,width:390,height:Math.ceil(metrics.cssContentSize.height),scale:1}});fs.writeFileSync(path.join(qa,'mobile-result-full.png'),Buffer.from(full.data,'base64'));
 await evaluate('window.__exportTexts=[];const originalFillText=CanvasRenderingContext2D.prototype.fillText;CanvasRenderingContext2D.prototype.fillText=function(text,...args){window.__exportTexts.push(String(text));return originalFillText.call(this,text,...args)}');
 await evaluate('document.querySelector("#share").click()');await wait('document.querySelector("#share-image").src.startsWith("data:image/png")');
 await check('document.querySelector("#share-image").naturalWidth===1080&&document.querySelector("#share-image").naturalHeight>3000','actual full-length PNG generated and decoded offline');
 await check('["01 · 人物自画像","02 · 八维能力结构","03 · 你与TA的共同底色","04 · 现实中的你","05 · 性格盲点与风险提醒","06 · 你的三句人物台词"].every(title=>window.__exportTexts.includes(title))','export draws all six sections, including final lines');
 await evaluate('window.__savedPNG=document.querySelector("#share-image").src');const png=await evaluate('window.__savedPNG');fs.writeFileSync(path.join(qa,'full-report.png'),Buffer.from(png.split(',')[1],'base64'));await screenshot('mobile-share');
 await evaluate('document.querySelector("#close-share").click(); location.reload()');await wait('!!document.querySelector("#resume")');await evaluate('document.querySelector("#resume").click()');await wait('!!document.querySelector("#share")');
 await check('document.querySelector(".result-role").textContent.includes("唐朝")','completed result reload stays in chosen dynasty');
 await evaluate('document.querySelector("#restart").click(); document.querySelector("[data-era=qin]").click()');await check('document.querySelector(".candidate-note").textContent.includes("固定对应")','Qin female fixed direction warning');
 await evaluate('document.querySelector("[data-gender=female]").click()');await answerAll();
 await check('document.querySelector(".result-name").textContent==="巴寡妇清"&&document.querySelector(".report-disclaimer").textContent.includes("固定匹配")','Qin female filter and fixed-result disclosure');
 await evaluate('document.querySelector("#restart").click();document.querySelector("[data-era=random]").click();document.querySelector("[data-gender=male]").click()');await wait('!!document.querySelector("[data-answer]")');
 await check('JSON.parse(localStorage.getItem("soul-history-offline-v3")).eraChoice==="random"','random dynasty stored');
 const chosen=await evaluate('JSON.parse(localStorage.getItem("soul-history-offline-v3")).era');
 await evaluate('document.querySelector("[data-answer=\\"0\\"]").click()');await wait('document.querySelector(".progress-count").textContent.startsWith("2 / 26")');
 await evaluate('location.reload()');await wait('!!document.querySelector("#resume")');await evaluate('document.querySelector("#resume").click()');await wait('!!document.querySelector("[data-answer]")');
 await check(`JSON.parse(localStorage.getItem('soul-history-offline-v3')).era===${JSON.stringify(chosen)}`,'resume does not reroll random dynasty');
 await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});await screenshot('desktop-question');
 await check('document.documentElement.scrollWidth<=innerWidth','desktop horizontal layout');
 await send('Emulation.setDeviceMetricsOverride',{width:320,height:740,deviceScaleFactor:1,mobile:true});await delay(100);await check('document.documentElement.scrollWidth<=innerWidth','320px horizontal layout');await screenshot('narrow-question');
 console.log('ALL PASS: actual standalone HTML, offline network emulation, no API mocks.');
}finally{clearTimeout(deadline);try{await send('Browser.close',{},null);}catch{}child.kill();}
