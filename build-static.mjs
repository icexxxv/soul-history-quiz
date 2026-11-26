import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const read=file=>fs.readFileSync(path.join(root,'src',file),'utf8');
const templatePath=path.join(root,'src/template.html');
if(!fs.existsSync(templatePath)){
 let template=fs.readFileSync(path.join(root,'index.html'),'utf8')
  .replace(/<style>[\s\S]*?<\/style>/,'<style>/*__STYLES__*/</style>')
  .replace(/<script>[\s\S]*?<\/script>/g,'')
  .replace('保存你的人物卡','保存完整人物档案')
  .replace('长按图片，保存到手机相册后即可分享。','图片包含人物自画像、八维结构、共同底色、现实互动、盲点建议与三句台词，可长按保存。')
  .replace('历史人物匹配结果卡片','包含六部分解读的历史人物完整档案')
  .replace('下载人物卡','下载完整结果长图')
  .replace('</body>','<script>/*__DATA__*/</script>\n<script>/*__APP__*/</script>\n</body>');
 fs.writeFileSync(templatePath,template);
}
const data=[read('data.js'),read('figures-extra.js'),read('report.js')].join('\n');
const app=[read('export.js'),read('app.js')].join('\n');
let html=fs.readFileSync(templatePath,'utf8');
for(const [token,value]of [['STYLES',read('styles.css')],['DATA',data],['APP',app]])html=html.replace('/*__'+token+'__*/',()=>value);
if(/<script[^>]+src=|<link[^>]+stylesheet|\bfetch\s*\(|history-api/.test(html))throw new Error('Network dependency in standalone build');
fs.writeFileSync(path.join(root,'index.html'),html);console.log('Built expanded standalone report:',Buffer.byteLength(html),'bytes.');
