import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
assert.ok(!/\bfetch\s*\(|history-api|src="https?:|href="\/history-assets/.test(html));
assert.ok(html.includes("connect-src 'none'"));
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
assert.equal(scripts.length,2);for(const s of scripts)new vm.Script(s);
const ctx=vm.createContext({});vm.runInContext(scripts[0]+'\nthis.q=OfflineQuiz;this.reports=ReportBuilder;',ctx);const q=ctx.q,reports=ctx.reports;
assert.equal(q.eras.length,5);assert.equal(q.figures.length,100);assert.equal(new Set(q.figures.map(f=>f.id)).size,100);
for(const era of q.eras){assert.equal(q.banks[era.id].length,26);assert.equal(q.candidates(era.id).length,20);for(const gender of ['male','female','any'])for(let i=0;i<250;i++){
 const answers=Array.from({length:26},()=>Math.floor(Math.random()*4)),r=q.match(era.id,gender,answers);
 assert.equal(r.figure.era,era.id);if(gender!=='any')assert.equal(r.figure.gender,gender);assert.ok(r.profile.every(v=>Number.isFinite(v)&&v>=-1&&v<=1));
 assert.equal(r.figure.id,q.match(era.id,gender,answers).figure.id);
 const report=reports.create(r);assert.equal(report.common.length,3);assert.equal(report.reality.length,3);assert.equal(report.risks.length,3);assert.equal(report.lines.length,3);assert.equal(new Set(report.lines).size,3);assert.equal(report.metrics.length,8);assert.ok(report.metrics.every(m=>Number.isInteger(m.value)&&m.value>=0&&m.value<=100));assert.ok(report.portrait.includes(r.figure.name));
}}
assert.throws(()=>q.match('tang','any',[]));assert.throws(()=>q.match('tang','invalid',Array(26).fill(0)));
assert.equal(Object.keys(reports.voices).length,100);for(const f of q.figures)assert.ok(reports.voices[f.id]);
// 为每个人物寻找可真实作答的答卷，验证扩容后的候选并非只在名单中出现。
let seed=17;const random=()=>((seed=(seed*1664525+1013904223)>>>0)/2**32),unreachable=[];
for(const f of q.figures){
 const bank=q.banks[f.era],norm=Array(8).fill(0);for(const question of bank)for(let d=0;d<8;d++)norm[d]+=Math.max(...question.options.map(o=>Math.abs(o.scores[d])));
 const contributions=bank.map(question=>question.options.map(o=>o.scores.map((v,d)=>v/(norm[d]||1))));let found=false;
 for(let attempt=0;attempt<30&&!found;attempt++){
  const answers=Array.from({length:26},()=>Math.floor(random()*4));let profile=Array(8).fill(0);answers.forEach((a,i)=>contributions[i][a].forEach((v,d)=>profile[d]+=v));
  const dist=p=>p.reduce((sum,v,d)=>sum+(v-f.profile[d])**2,0);
  for(let round=0;round<14;round++){let changed=false;for(let i=0;i<26;i++){
   let winner=answers[i],best=dist(profile),next=profile;
   for(let a=0;a<4;a++){const candidate=profile.map((v,d)=>v-contributions[i][answers[i]][d]+contributions[i][a][d]),cost=dist(candidate);if(cost<best-1e-10){best=cost;winner=a;next=candidate;}}
   if(winner!==answers[i]){answers[i]=winner;profile=next;changed=true;}
  }if(!changed)break;}
  found=q.match(f.era,'any',answers).figure.id===f.id;
 }
 if(!found)unreachable.push(f.name);
}
assert.deepEqual(unreachable,[],'人物需要有合法答卷可匹配');
console.log('PASS no network dependencies; five eras x 20 figures; 3750 filtered reports; all 100 character results reachable; complete report fields.');
