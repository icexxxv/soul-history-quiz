'use strict';
(()=>{
 const $=id=>document.getElementById(id),main=$('main'),KEY='soul-history-offline-v3';
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const chevron='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>';
 let config,screen='era',state={version:3,eraChoice:null,era:null,gender:null,answers:Array(26).fill(null),index:0,complete:false},questions=[],result=null,currentReport=null,busy=false,advanceTimer,noticeTimer,shareFocus;
 const validAnswer=a=>Number.isInteger(a)&&a>=0&&a<4;
 function notify(message){clearTimeout(noticeTimer);$('notice').textContent=message;$('notice').hidden=false;noticeTimer=setTimeout(()=>$('notice').hidden=true,4500);}
 function save(){try{localStorage.setItem(KEY,JSON.stringify(state));}catch{notify('当前环境无法暂存进度，请保持页面打开直至完成。');}}
 function restore(){try{const s=JSON.parse(localStorage.getItem(KEY));if(s?.version!==3||!config.eras.some(e=>e.id===s.era)||!['male','female','any'].includes(s.gender)||!Array.isArray(s.answers)||s.answers.length!==26||Array.from(s.answers).some(a=>a!==null&&!validAnswer(a))||!Number.isInteger(s.index)||s.index<0||s.index>25)return;state={version:3,eraChoice:s.eraChoice==='random'?'random':s.era,era:s.era,gender:s.gender,answers:s.answers,index:s.index,complete:!!s.complete&&s.answers.every(validAnswer)};}catch{}}
 function createTest(eraChoice,gender){
  const era=eraChoice==='random'?OfflineQuiz.eras[Math.floor(Math.random()*OfflineQuiz.eras.length)].id:eraChoice;
  return {era,gender,questions:OfflineQuiz.publicQuestions(era),candidateCount:OfflineQuiz.candidates(era,gender).length};
 }
 function render(html,view,title){
  clearTimeout(advanceTimer);busy=false;screen=view;main.innerHTML=html;main.setAttribute('aria-busy','false');main.classList.remove('enter');void main.offsetWidth;main.classList.add('enter');
  $('back').hidden=view==='era';$('brand').textContent=view==='quiz'?`${eraName(state.era)} · 灵魂照面`:'灵魂照面';
  document.title=title?`${title}｜灵魂照面`:'灵魂照面｜你像哪位历史人物';window.scrollTo({top:0,behavior:'instant'});
  main.querySelector('h1')?.focus({preventScroll:true});
 }
 const eraName=id=>config?.eras.find(e=>e.id===id)?.name||'';
 function eraPage(){
  const n=state.answers.filter(validAnswer).length;
  render(`<section class="paper selection"><h1 tabindex="-1">你想走进哪个时代？</h1><p class="subtext">选择一个朝代，遇见与你相似的历史人物。<br>每次26道题，依直觉作答，没有标准答案。</p>${n?`<div class="resume"><span>${esc(eraName(state.era))} · ${state.complete?'人物档案已生成':`已答 ${n} / 26 题`}</span><button id="resume">${state.complete?'查看档案':'继续上次测试'}</button></div>`:''}<div class="choice-list">${config.eras.map(e=>`<button class="choice" data-era="${e.id}"><span class="glyph" aria-hidden="true">${e.glyph}</span><span class="choice-copy"><strong>${e.name}</strong><small>${e.desc}</small></span>${chevron}</button>`).join('')}<button class="choice random" data-era="random"><span class="choice-copy"><strong>随机朝代</strong><small>不必选，让命运替你翻开一页</small></span>${chevron}</button></div><p class="footnote">秦朝含统一前后与秦末人物；三国按汉末三国文化时期归类。<br>人物取自历史记载，结果为文学化性格映射。</p></section>`,'era');
  main.querySelectorAll('[data-era]').forEach(button=>button.addEventListener('click',()=>{state.eraChoice=button.dataset.era;genderPage();}));
  $('resume')?.addEventListener('click',resume);
 }
 function genderPage(){
  const era=config.eras.find(e=>e.id===state.eraChoice);
  render(`<section class="paper selection gender"><h1 tabindex="-1">你希望遇见谁？</h1><p class="subtext">${era?`${esc(era.name)} · ${esc(era.period)}`:'随机朝代 · 开始时随机抽取一个朝代'}<br>选择希望匹配的历史人物性别。</p><div class="choice-list">${[['male','男','男性人物','只匹配男性历史人物'],['female','女','女性人物','只匹配女性历史人物'],['any','不限','不限性别','由你的性格倾向自由匹配']].map(([id,glyph,label,description])=>`<button class="choice" data-gender="${id}"><span class="glyph" aria-hidden="true">${glyph}</span><span class="choice-copy"><strong>${label}</strong><small>${description}</small></span>${chevron}</button>`).join('')}</div>${era?.id==='qin'?'<p class="candidate-note"><strong>秦朝女性方向说明</strong><br>为保证史料可靠，此方向固定对应巴寡妇清。若希望获得不同的人物结果，可选择“不限性别”或更换朝代。</p>':''}<p class="footnote">这里只筛选人物范围，不是询问你的生理性别，<br>也不会改变题目内容与计分方式。${era?`<br>${esc(era.note)}`:'<br>秦朝女性方向固定对应巴寡妇清；其余按抽中的朝代匹配。'}</p><p id="start-error" class="error" role="alert"></p></section>`,'gender');
  main.querySelectorAll('[data-gender]').forEach(button=>button.addEventListener('click',()=>start(button.dataset.gender)));
 }
 async function start(gender){
  if(busy)return;busy=true;main.querySelectorAll('button').forEach(b=>b.disabled=true);
  try{const data=createTest(state.eraChoice,gender);state={version:3,eraChoice:state.eraChoice,era:data.era,gender,answers:Array(26).fill(null),index:0,complete:false};questions=data.questions;result=null;currentReport=null;save();question();if(data.candidateCount===1)notify('当前人物方向固定对应巴寡妇清，详细解读仍由你的回答生成。');}
  catch(e){$('start-error').textContent=e.message;main.querySelectorAll('button').forEach(b=>b.disabled=false);busy=false;}
 }
 async function resume(){
  if(busy)return;busy=true;const button=$('resume');if(button)button.disabled=true;
  try{const data=createTest(state.era,state.gender);questions=data.questions;if(state.complete||state.answers.every(validAnswer))await finish();else question();}
  catch(e){{busy=false;if(button)button.disabled=false;notify(e.message);}}
 }
 function question(){
  const q=questions[state.index];if(!q){eraPage();return;}const answered=state.answers.filter(validAnswer).length;
  render(`<section class="paper progress-card" aria-label="答题进度"><div class="progress-label"><span>${esc(q.ability)}</span><span class="progress-count">${state.index+1} / 26 · 已答${answered}题</span></div><div class="progress-track" role="progressbar" aria-label="已完成题目" aria-valuemin="0" aria-valuemax="26" aria-valuenow="${answered}"><div class="progress-fill" style="width:${answered/26*100}%"></div></div></section><section class="paper question"><div class="ability-label">本题考察：${esc(q.ability)}</div><p class="ability-hint">${esc(q.hint)}</p><p class="context">${esc(q.type)}</p><h1 id="question-title" tabindex="-1">${esc(q.title)}</h1><div class="answers" role="group" aria-labelledby="question-title">${q.options.map((o,i)=>`<button class="answer" data-answer="${i}" aria-pressed="${state.answers[state.index]===i}"><span class="answer-letter" aria-hidden="true">${'ABCD'[i]}</span><span>${esc(o.text)}</span></button>`).join('')}</div><div class="question-nav"><button id="previous" class="secondary">${state.index?'上一题':'返回设置'}</button><span id="auto-note" class="auto-note">${state.index===25?'选择后生成人物档案':'选择后自动进入下一题'}</span></div><details><summary>关于这道题</summary><p>${esc(q.note)}</p><p>时代背景与延伸阅读：<a href="${esc(q.source.url)}" rel="noreferrer">${esc(q.source.title)}</a></p></details></section>`,'quiz');
  main.querySelectorAll('[data-answer]').forEach(b=>b.addEventListener('click',()=>choose(Number(b.dataset.answer))));
  $('previous').addEventListener('click',back);
 }
 function choose(answer){
  if(busy||!validAnswer(answer))return;busy=true;state.answers[state.index]=answer;state.complete=false;save();
  main.querySelectorAll('[data-answer]').forEach(b=>{b.setAttribute('aria-pressed',String(Number(b.dataset.answer)===answer));b.disabled=true;});
  const count=state.answers.filter(validAnswer).length;main.querySelector('.progress-fill').style.width=count/26*100+'%';main.querySelector('[role=progressbar]').setAttribute('aria-valuenow',count);
  $('auto-note').textContent=state.index===25?'正在生成人物档案…':'已选择，即将进入下一题…';
  advanceTimer=setTimeout(async()=>{if(state.index<25){state.index++;save();question();}else await finish();},window.matchMedia('(prefers-reduced-motion: reduce)').matches?120:380);
 }
 async function finish(){
  try{result=OfflineQuiz.match(state.era,state.gender,state.answers);state.complete=true;save();resultPage();}
  catch(e){{question();notify(e.message+' 可再次选择最后一题重试。');}}
 }
 function resultPage(){
  const r=currentReport=ReportBuilder.create(result),f=r.figure;r.eraName=eraName(f.era);
  const cards=items=>items.map(item=>`<div class="report-card"><h3>${esc(item.title)}</h3><p>${esc(item.text)}</p></div>`).join('');
  render(`<article class="result-report"><header class="paper result-cover"><p class="result-kicker">与你遥相呼应的人</p><h1 class="result-name" tabindex="-1">${esc(f.name)}</h1><p class="result-role">${eraName(f.era)} · ${esc(f.role)}</p><div class="tags">${f.tags.map(t=>`<span class="tag">${esc(t)}</span>`).join('')}</div><p class="dominant-label">主导维度：${esc(r.dominant.name)} · ${esc(r.dominant.side)}</p><div class="character-voice"><strong>人物心声</strong><p>“${esc(r.voice)}”</p></div></header><section class="paper report-block" data-report-section="portrait"><h2>01 · 人物自画像</h2><p>${esc(r.portrait)}</p><details class="history-detail"><summary>历史中的${esc(f.name)}</summary><p>${esc(f.history)}</p><a class="source-link" href="${esc(f.source)}" rel="noreferrer">史料与延伸阅读</a></details></section><section class="paper report-block" data-report-section="metrics"><h2>02 · 八维能力结构</h2><p class="report-caption">数值是本次答题的倾向指数，不代表能力高低或测评准确率。</p><div class="metric-list">${r.metrics.map(m=>`<div class="metric-row"><span>${esc(m.name)}</span><div class="metric-track" role="meter" aria-label="${esc(m.fullName)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${m.value}" aria-valuetext="${esc(m.side)}，倾向指数${m.value}"><span style="width:${m.value}%"></span></div><b>${m.value}</b></div>`).join('')}</div></section><section class="paper report-block" data-report-section="common"><h2>03 · 你与TA的共同底色</h2><div class="report-grid">${cards(r.common)}</div></section><section class="paper report-block" data-report-section="reality"><h2>04 · 现实中的你</h2><div class="reality-list">${cards(r.reality)}</div></section><section class="paper report-block" data-report-section="risks"><h2>05 · 性格盲点与风险提醒</h2><div class="report-grid">${cards(r.risks)}</div></section><section class="paper report-block" data-report-section="lines"><h2>06 · 你的三句人物台词</h2><div class="report-grid quote-grid">${r.lines.map(line=>`<blockquote class="report-card">“${esc(line)}”</blockquote>`).join('')}</div><p class="report-caption">人物心声与台词均为本测试原创代入文案，并非历史人物原话。</p></section><p class="report-disclaimer">${esc(r.note)}${r.rangeNotice?`<br>${esc(r.rangeNotice)}`:''}</p><div class="result-actions"><button class="primary" id="share">保存完整结果</button><button class="secondary" id="restart">再测一次</button></div><button class="text-button review-button" id="review">回看并修改答案</button></article>`,'result',`我遇见了${f.name}`);
  $('share').addEventListener('click',share);$('restart').addEventListener('click',eraPage);$('review').addEventListener('click',()=>{state.index=0;question();});
 }
 function back(){clearTimeout(advanceTimer);busy=false;if(screen==='gender')eraPage();else if(screen==='quiz'){if(state.index){state.index--;save();question();}else genderPage();}else if(screen==='result')eraPage();}
 $('back').addEventListener('click',back);
 function wrap(ctx,text,x,y,width,lineHeight){let line='';for(const char of text){if(ctx.measureText(line+char).width>width){ctx.fillText(line,x,y);y+=lineHeight;line=char;}else line+=char;}if(line)ctx.fillText(line,x,y);return y+lineHeight;}
 async function share(){
  const button=$('share');button.disabled=true;button.textContent='正在制作…';
  try{await document.fonts?.ready;const canvas=drawFullReport(currentReport);
   $('share-image').src=canvas.toDataURL('image/png');$('download').href=$('share-image').src;
   $('download').download=`${currentReport.figure.name}-灵魂照面完整报告.png`;
   shareFocus=document.activeElement;$('share-overlay').hidden=false;document.body.style.overflow='hidden';$('close-share').focus();
  }catch(e){notify(e.message||'图片生成失败，请稍后重试。');}finally{button.disabled=false;button.textContent='保存完整结果';}
 }
 function closeShare(){$('share-overlay').hidden=true;document.body.style.overflow='';shareFocus?.focus();}
 $('close-share').addEventListener('click',closeShare);$('share-overlay').addEventListener('click',e=>{if(e.target===$('share-overlay'))closeShare();});
 document.addEventListener('keydown',e=>{if($('share-overlay').hidden)return;if(e.key==='Escape')closeShare();if(e.key==='Tab'){const focusables=[$('close-share'),$('download')],first=focusables[0],last=focusables[1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
 function boot(){
  config={eras:OfflineQuiz.eras,dimensions:OfflineQuiz.dimensions};
  restore();eraPage();
 }
 boot();
})();
