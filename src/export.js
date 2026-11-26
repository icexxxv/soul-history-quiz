// 按内容测量并生成完整长图，所有分区共用网页报告的数据。
function drawFullReport(report){
 const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1;
 const measure=canvas.getContext('2d');if(!measure)throw new Error('当前环境暂不支持生成结果长图');
 const commands=[],font='"Microsoft YaHei","PingFang SC",sans-serif';let cursor=54;
 function textLines(text,size,width,weight='normal'){
  measure.font=`${weight} ${size}px ${font}`;const lines=[];let line='';
  for(const char of String(text)){if(char==='\n'){lines.push(line);line='';continue;}if(line&&measure.measureText(line+char).width>width){lines.push(line);line=char;}else line+=char;}if(line)lines.push(line);return lines;
 }
 function panel(title,blocks,kind='body'){
  const top=cursor,draw=[],left=96,width=888;let y=top+44;
  function text(text,size=29,color='#302653',weight='normal',gap=14){const lines=textLines(text,size,width,weight),lh=Math.ceil(size*1.65);for(const line of lines){const baseline=y+size;draw.push(ctx=>{ctx.font=`${weight} ${size}px ${font}`;ctx.textAlign='left';ctx.fillStyle=color;ctx.fillText(line,left,baseline);});y+=lh;}y+=gap;}
  if(title)text(title,32,'#302653','bold',24);
  if(kind==='cover'){
   text('与你遥相呼应的人',30,'#7864bd','normal',20);
   text(report.figure.name,report.figure.name.length>7?60:80,'#302653','bold',12);
   text(`${report.eraName} · ${report.figure.role}`,27,'#9187a9','normal',18);
   text(report.figure.tags.join('  ·  '),27,'#7864bd','normal',14);
   text(`主导维度：${report.dominant.name} · ${report.dominant.side}`,26,'#7864bd','normal',20);
   text('人物心声',26,'#7864bd','bold',6);text('“'+report.voice+'”',29);
  }else if(kind==='metrics'){
   text('数值为答题倾向指数，不代表能力高低或测评准确率。',24,'#9187a9','normal',22);
   for(const m of report.metrics){const baseline=y+27,barY=y+12;
    draw.push(ctx=>{ctx.textAlign='left';ctx.font=`27px ${font}`;ctx.fillStyle='#302653';ctx.fillText(m.name,left,baseline);ctx.fillStyle='#eee9f7';ctx.beginPath();ctx.roundRect(245,barY,650,14,7);ctx.fill();ctx.fillStyle='#7864bd';if(m.value>0){ctx.beginPath();ctx.roundRect(245,barY,650*m.value/100,14,7);ctx.fill();}ctx.textAlign='right';ctx.font=`26px ${font}`;ctx.fillText(String(m.value),984,baseline);});
    y+=60;
   }
  }else{
   for(const block of blocks){if(block.title)text(block.title,27,'#514273','bold',6);text(block.text,29,block.muted?'#9187a9':'#403556','normal',24);}
  }
  const height=y-top+18;
  commands.push(ctx=>{ctx.fillStyle='#fff';ctx.beginPath();ctx.roundRect(54,top,972,height,30);ctx.fill();});commands.push(...draw);cursor=top+height+26;
 }
 panel('',[],'cover');
 panel('01 · 人物自画像',[{text:report.portrait},{title:'历史中的'+report.figure.name,text:report.figure.history,muted:true}]);
 panel('02 · 八维能力结构',[],'metrics');
 panel('03 · 你与TA的共同底色',report.common);
 panel('04 · 现实中的你',report.reality);
 panel('05 · 性格盲点与风险提醒',report.risks);
 panel('06 · 你的三句人物台词',report.lines.map(line=>({text:'“'+line+'”'})).concat([{text:'人物心声与台词为测试原创代入表达，并非历史人物原话。',muted:true}]));
 panel('灵魂照面 · 趣味性自我探索',[{text:report.note,muted:true},...(report.rangeNotice?[{text:report.rangeNotice,muted:true}]:[])]);
 canvas.height=Math.ceil(cursor+28);const ctx=canvas.getContext('2d');ctx.fillStyle='#efebf8';ctx.fillRect(0,0,1080,canvas.height);for(const draw of commands)draw(ctx);
 return canvas;
}
