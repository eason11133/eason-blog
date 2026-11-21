// Self-contained staging administration UI. No GitHub or Vercel requests when saving.
export const adminHtml = `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Eason｜內容管理</title>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/codemirror.min.css">
<style>
:root{color-scheme:dark;font-family:system-ui,-apple-system,"Noto Sans TC",sans-serif;background:#111823;color:#e9edf5}
*{box-sizing:border-box}body{margin:0;min-height:100vh}main{max-width:1380px;margin:auto;padding:26px 20px 80px}
header{display:flex;justify-content:space-between;align-items:center;gap:16px;border-bottom:1px solid #39465a;padding-bottom:18px;margin-bottom:22px}
h1{font-size:1.5rem;margin:0}h2{font-size:1.18rem;margin:0 0 12px}p{line-height:1.65;color:#b8c7df}
button{background:#4d89d8;color:white;border:1px solid transparent;border-radius:10px;padding:11px 17px;font:inherit;cursor:pointer}
button:hover{filter:brightness(1.1)}button:disabled{opacity:.55;cursor:not-allowed}
button.secondary{background:#273446;border-color:#52667e}
button.ghost{background:transparent;border:1px solid #50637d}
input,textarea,select{font:inherit;background:#1b2636;border:1px solid #4b5b70;border-radius:9px;color:#e9edf5;padding:11px;width:100%}
input:focus-visible,textarea:focus-visible,select:focus-visible,button:focus-visible{outline:2px solid #9accff;outline-offset:2px}
label{display:block;font-size:.86rem;color:#bbc9da;margin-bottom:7px}
.card{background:#192331;border:1px solid #39485e;border-radius:16px;padding:22px;margin:16px 0}
.two{display:grid;grid-template-columns:1fr 1fr;gap:15px}.fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
.field{min-width:0}.span-2{grid-column:1/-1}.check{display:flex;align-items:center;gap:9px;margin:10px 0}.check input{width:auto}
nav{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:16px}nav button[aria-current="page"]{background:#4d89d8}
.notice{min-height:24px;color:#a7dcaa;margin:9px 0 18px}small{color:#9fb0c5}.hidden{display:none!important}

/* HackMD-style split editor: Markdown stays the sole source of truth in D1. */
#editor{border:1px solid #46556e;border-radius:12px;overflow:hidden;background:#141e2a}
.md-head{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;padding:12px 14px;border-bottom:1px solid #3b4e64}
.md-head strong{font-size:.9rem;font-weight:600}.md-modes{display:flex;gap:4px;background:#0e1724;border-radius:9px;padding:4px}
.md-modes button{font-size:.83rem;padding:7px 12px;background:transparent;color:#b7c9df;border-radius:7px}
.md-modes button[aria-pressed="true"]{background:#416fa8;color:#fff}
.md-toolbar{display:flex;align-items:center;gap:6px;flex-wrap:wrap;padding:9px 12px;border-bottom:1px solid #3b4e64}
.md-toolbar button{font-size:.84rem;background:#25364b;color:#e7edf5;border:1px solid #4c6179;padding:7px 10px;border-radius:7px}
.md-toolbar button:hover{background:#365372}
.md-toolbar select{width:auto;min-height:35px;padding:6px 9px;border-radius:7px;font-size:.84rem}
.md-toolbar .tool-separator{width:1px;height:24px;background:#46566b;margin:0 2px}
.md-toolbar .image-controls{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
.md-workspace{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);min-height:550px}
.md-pane{min-width:0;overflow:hidden}
.md-pane:first-child{border-right:1px solid #42536b}
.md-pane-label{padding:9px 15px;font-size:.78rem;color:#a3bbd4;background:#172334;border-bottom:1px solid #35465a}
#markdown-input{display:block;width:100%;height:520px;resize:vertical;min-height:400px;border:0;border-radius:0;background:#141e2a;color:#ecf2ff;font:14px/1.8 Consolas,'Cascadia Code',monospace;padding:18px;outline:none}
#markdown-input:focus-visible{outline:2px solid #7eb7ee;outline-offset:-2px}
#markdown-preview{height:520px;min-height:400px;overflow:auto;padding:22px 26px;color:#e4edf9;line-height:1.8;overflow-wrap:anywhere}
#markdown-preview :is(h1,h2,h3,h4){line-height:1.4;color:#edf4ff;margin:1.3em 0 .65em}
#markdown-preview h1{font-size:1.75rem;border-bottom:1px solid #38536b;padding-bottom:.25em}
#markdown-preview h2{font-size:1.4rem}#markdown-preview h3{font-size:1.15rem}
#markdown-preview p{color:inherit;margin:.6em 0 1.1em}
#markdown-preview a{color:#9ecaff}
#markdown-preview img{max-width:100%;height:auto;border-radius:7px}
#markdown-preview :is(pre,code){font-family:Consolas,'Cascadia Code',monospace}
#markdown-preview pre{background:#0d1623;padding:14px;border-radius:8px;overflow:auto}
#markdown-preview :not(pre)>code{background:#29384a;padding:.15em .35em;border-radius:4px}
#markdown-preview blockquote{margin:1em 0;border-left:3px solid #78a9e1;padding:2px 16px;color:#b8c9e3}
#markdown-preview table{width:100%;border-collapse:collapse;display:block;overflow:auto}
#markdown-preview th,#markdown-preview td{border:1px solid #40536a;padding:7px 10px}
#markdown-preview hr{border:0;border-top:1px solid #40536a}
#markdown-preview .preview-error{color:#ffbaba}
.CodeMirror{height:520px;background:#141e2a;color:#e6edf7;font:14px/1.8 Consolas,'Cascadia Code',monospace}
.CodeMirror-gutters{background:#142033;border-right:1px solid #33475e}
.CodeMirror-linenumber{color:#728ba8}.CodeMirror-cursor{border-left:1px solid #e6edf7}
.CodeMirror-selected,.CodeMirror-focused .CodeMirror-selected{background:#365371!important}
.cm-header{color:#b5d7fb!important}.cm-strong{color:#e5d0a3!important}.cm-link{color:#a2d4ff!important}
.md-mode-edit #preview-pane,.md-mode-preview #source-pane{display:none}
.md-mode-edit .md-workspace,.md-mode-preview .md-workspace{grid-template-columns:minmax(0,1fr)}
.md-mode-preview #preview-pane{display:block}
.md-status{font-size:.78rem;color:#a5b8d1;min-height:20px;margin:8px 0 0}
.md-status[data-dirty="true"]{color:#ffdb99}
#editor[data-drop="true"]{outline:2px dashed #8dbef6;outline-offset:3px}
@media(max-width:760px){
 .md-workspace{grid-template-columns:minmax(0,1fr)}
 #source-pane{border-right:0;border-bottom:1px solid #40536a}
 #markdown-preview{height:360px;min-height:220px;padding:16px}
 #markdown-input,.CodeMirror{height:360px;min-height:220px}
 .md-head{align-items:flex-start}
}
.editor-actions{display:flex;gap:10px;align-items:center;margin-top:20px}
.comment{border-bottom:1px solid #36445a;padding:14px 0}.comment:last-child{border:0}
.comment p{white-space:pre-wrap;color:#e0e7f1}.actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}
.home-field{margin-bottom:12px}.tags-grid{display:grid;grid-template-columns:1fr 160px;gap:10px;margin:8px 0}
@media(max-width:720px){.two,.fields{grid-template-columns:1fr}main{padding:15px}.card{padding:16px}.span-2{grid-column:auto}.md-toolbar{padding:9px}.md-toolbar button{padding:7px}.md-toolbar select{max-width:130px}}
</style>
</head>
<body>
<main>
<header><div><h1>Eason｜內容管理</h1><small>Cloudflare + D1 測試版｜儲存不經 GitHub</small></div><button id="logout" class="secondary hidden" type="button">登出</button></header>
<div id="notice" class="notice" role="status" aria-live="polite"></div>
<section id="login-card" class="card">
<h2>管理員登入</h2><p>請使用 Cloudflare Secret 中設定的管理密碼。測試版後台獨立於 Sveltia，請勿使用 GitHub Token。</p>
<form id="login-form"><label for="password">管理密碼</label><input id="password" type="password" autocomplete="current-password" required><p><button type="submit">登入</button></p></form>
</section>
<section id="workspace" class="hidden">
<nav aria-label="管理內容">
<button type="button" class="secondary" data-tab="post" aria-current="page">文章</button>
<button type="button" class="secondary" data-tab="work">作品</button>
<button type="button" class="secondary" data-tab="homepage">首頁</button>
<button type="button" class="secondary" data-tab="about">關於我</button>
<button type="button" class="secondary" data-tab="comments">留言審核</button>
</nav>
<section id="documents" class="card">
<div class="two"><div><label for="documents-list">選擇已有內容</label><select id="documents-list"></select></div><div style="display:flex;align-items:end"><button class="secondary" id="new-doc" type="button">新增一篇</button></div></div>
<form id="document-form" class="fields" style="margin-top:18px">
<div class="field"><label for="doc-title">標題</label><input id="doc-title" required maxlength="200"></div>
<div class="field"><label for="doc-slug">網址代碼／slug（建立後請勿隨意改）</label><input id="doc-slug" required maxlength="120"></div>
<div class="field"><label for="doc-date">日期</label><input id="doc-date" type="datetime-local" required></div>
<div class="field"><label for="doc-description">簡介</label><input id="doc-description" maxlength="1200"></div>
<div class="field"><label for="doc-categories">分類（文章限一個）</label><input id="doc-categories" placeholder="心得"></div>
<div class="field"><label for="doc-tags">標籤，用逗號分隔</label><input id="doc-tags" placeholder="特選,上機考"></div>
<div class="field check"><label class="check"><input id="doc-draft" type="checkbox" checked> 儲存為草稿</label></div>
<div class="field check"><label class="check"><input id="doc-pinned" type="checkbox"> 首頁置頂</label></div>
<div class="span-2">
<label for="markdown-input">文章內容</label>
<div id="editor" class="md-mode-split">
  <div class="md-head">
    <strong>Markdown 編輯器</strong>
    <div class="md-modes" role="group" aria-label="文章編輯模式">
      <button type="button" data-md-mode="edit" aria-pressed="false">編輯</button>
      <button type="button" data-md-mode="split" aria-pressed="true">雙欄</button>
      <button type="button" data-md-mode="preview" aria-pressed="false">預覽</button>
    </div>
  </div>
  <div class="md-toolbar" role="toolbar" aria-label="Markdown 格式工具">
    <button type="button" data-md-tool="heading" title="標題">H2</button>
    <button type="button" data-md-tool="bold" title="粗體">B</button>
    <button type="button" data-md-tool="italic" title="斜體"><i>I</i></button>
    <button type="button" data-md-tool="link" title="超連結">連結</button>
    <button type="button" data-md-tool="list" title="項目清單">清單</button>
    <button type="button" data-md-tool="quote" title="引言">引言</button>
    <button type="button" data-md-tool="code" title="程式碼">程式碼</button>
    <span class="tool-separator" aria-hidden="true"></span>
    <button type="button" data-md-tool="left">靠左</button>
    <button type="button" data-md-tool="center">置中</button>
    <button type="button" data-md-tool="right">靠右</button>
    <span class="tool-separator" aria-hidden="true"></span>
    <div class="image-controls">
      <button type="button" id="upload-image">上傳圖片</button>
      <input id="image-file" class="hidden" type="file" accept="image/png,image/jpeg,image/webp,image/gif" aria-label="選擇圖片">
      <select id="image-width" aria-label="圖片寬度">
        <option value="100%">寬度 100%</option>
        <option value="75%">寬度 75%</option>
        <option value="50%">寬度 50%</option>
        <option value="25%">寬度 25%</option>
        <option value="320px">寬度 320px</option>
        <option value="480px">寬度 480px</option>
        <option value="640px">寬度 640px</option>
      </select>
      <select id="image-align" aria-label="圖片對齊">
        <option value="center">圖片置中</option>
        <option value="left">圖片靠左</option>
        <option value="right">圖片靠右</option>
      </select>
      <button type="button" id="apply-image">套用圖片設定</button>
    </div>
  </div>
  <div class="md-workspace">
    <div class="md-pane" id="source-pane">
      <div class="md-pane-label">Markdown</div>
      <textarea id="markdown-input" spellcheck="false" placeholder="開始寫文章，可以使用 Markdown，也可以用上方工具列。"></textarea>
    </div>
    <div class="md-pane" id="preview-pane">
      <div class="md-pane-label">即時預覽</div>
      <div id="markdown-preview" aria-live="off">開始輸入後，這裡會顯示預覽。</div>
    </div>
  </div>
</div>
<p class="md-status" id="markdown-status" role="status" aria-live="polite"></p>
<small>內容仍儲存為 Markdown。圖片與文字對齊使用 HTML 標記，正式文章也會保留。預覽的字體與網站主題可能略有不同。</small>
</div>
<div class="span-2 editor-actions"><button id="save-doc" type="submit">儲存到 D1</button><small>正式發布會立即更新資料庫，不經 GitHub 或 Vercel</small></div>
</form></section>
<section id="settings-panel" class="card hidden"><h2 id="settings-heading"></h2><form id="settings-form"><div id="settings-fields"></div><div class="editor-actions"><button type="submit">儲存設定到 D1</button></div></form></section>
<section id="comments-panel" class="card hidden"><h2>留言審核</h2><p>訪客送出的留言預設不公開，你按核准後才會顯示。</p><div id="comments-list"></div></section>
</section>
</main>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/codemirror.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/markdown/markdown.min.js"></script>
<script src="https://unpkg.com/markdown-it@14.3.2/dist/browser/markdown-it.umd.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.4.17/purify.min.js"></script>
<script>
(function(){
'use strict';
const el=id=>document.getElementById(id);
const say=(msg,error=false)=>{el('notice').textContent=msg;el('notice').style.color=error?'#ffacac':'#a7dcaa';};
async function api(path,method='GET',body){
 const args={method,credentials:'same-origin',headers:{}};
 if(body!==undefined){args.headers['Content-Type']='application/json';args.body=JSON.stringify(body);}
 const res=await fetch(path,args);
 let data={};try{data=await res.json();}catch{}
 if(!res.ok)throw new Error(data.error||'HTTP '+res.status);
 return data;
}
const fields=['hero_title','hero_subtitle','hero_background','status_title','status_description','pinned_title','pinned_empty','recent_title','recent_empty','blog_link_label'];
const labels=['首頁問候文字','副標題','首頁主視覺圖片路徑','目前狀態區標題','目前狀態說明','置頂文章標題','沒有置頂文章時','最近更新標題','沒有文章時','全部文章連結文字'];
let tab='post',docs=[],homeData={},editor=null,cm=null,mdParser=null,renderTimer=null,savedText='';
const mdStatus=(message,dirty=false)=>{const target=el('markdown-status');target.textContent=message;target.dataset.dirty=dirty?'true':'false';};
function renderPreview(){
 const target=el('markdown-preview');
 const content=getEditor().getMarkdown();
 if(!window.markdownit || !window.DOMPurify){
  target.textContent='預覽套件未載入，仍可正常編輯及儲存 Markdown。';
  return;
 }
 try{
  if(!mdParser)mdParser=window.markdownit({html:true,breaks:true,linkify:true,typographer:false});
  target.innerHTML=window.DOMPurify.sanitize(mdParser.render(content),{ADD_ATTR:['style','width','height','align']});
  target.querySelectorAll('a').forEach(a=>{a.target='_blank';a.rel='noopener noreferrer';});
 }catch(err){
  target.textContent='預覽失敗，文章內容沒有受到影響。';
 }
}
function schedulePreview(){
 if(renderTimer)clearTimeout(renderTimer);
 renderTimer=setTimeout(renderPreview,170);
 if(editor && editor.getMarkdown()!==savedText)mdStatus('尚未儲存的修改',true);
 else mdStatus('已載入文章');
}
function setEditorMode(mode){
 if(!['edit','split','preview'].includes(mode))return;
 const root=el('editor');
 root.classList.remove('md-mode-edit','md-mode-split','md-mode-preview');
 root.classList.add('md-mode-'+mode);
 root.querySelectorAll('[data-md-mode]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.mdMode===mode?'true':'false'));
 if(cm)requestAnimationFrame(()=>cm.refresh());
 if(mode!=='edit')renderPreview();
}
function editSelection(before,after,placeholder){
 const field=el('markdown-input');
 if(cm){
  cm.focus();
  const selected=cm.getSelection()||placeholder||'';
  cm.replaceSelection(before+selected+after,'around');
 }else{
  field.focus();
  const start=field.selectionStart,end=field.selectionEnd;
  const selected=field.value.slice(start,end)||placeholder||'';
  const out=before+selected+after;
  field.setRangeText(out,start,end,'select');
  field.dispatchEvent(new Event('input',{bubbles:true}));
 }
 schedulePreview();
}
function selectedMarkdown(){
 if(cm)return cm.getSelection();
 const field=el('markdown-input');
 return field.value.slice(field.selectionStart,field.selectionEnd);
}
function replaceSelectedMarkdown(value){
 const field=el('markdown-input');
 if(cm){
  cm.focus();
  cm.replaceSelection(value,'around');
 }else{
  field.focus();
  field.setRangeText(value,field.selectionStart,field.selectionEnd,'select');
  field.dispatchEvent(new Event('input',{bubbles:true}));
 }
 schedulePreview();
}
const htmlEsc=s=>String(s).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
function alignText(alignment){
 const chosen=selectedMarkdown()||'這裡輸入文字';
 const style=alignment==='center'?'center':alignment==='right'?'right':'left';
 replaceSelectedMarkdown('<div style="text-align:'+style+';">\n\n'+chosen+'\n\n</div>');
}
function imageHtml(url,alt){
 const sizes=['100%','75%','50%','25%','320px','480px','640px'];
 const width=sizes.includes(el('image-width').value)?el('image-width').value:'100%';
 const align=el('image-align').value;
 const offset=align==='right'?'auto 0 auto auto':align==='left'?'0 auto 0 0':'0 auto';
 return '<img src="'+htmlEsc(url)+'" alt="'+htmlEsc(alt)+'" style="width:'+width+';max-width:100%;height:auto;display:block;margin:'+offset+';">';
}
function configureImage(){
 const selected=selectedMarkdown().trim();
 const markdownImage=/^!\[([^\]]*)\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)$/.exec(selected);
 const htmlImage=/^<img\s[^>]*src=["']([^"']+)["'][^>]*>$/i.exec(selected);
 if(markdownImage){replaceSelectedMarkdown(imageHtml(markdownImage[2],markdownImage[1]));return;}
 if(htmlImage){
  const alt=/\balt=["']([^"']*)["']/i.exec(selected);
  replaceSelectedMarkdown(imageHtml(htmlImage[1],alt?alt[1]:'圖片'));
  return;
 }
 mdStatus('請先選取整段圖片 Markdown 或 <img> 標記，再按「套用圖片設定」。',true);
}
async function uploadImage(file){
 if(!file || !['image/png','image/jpeg','image/webp','image/gif'].includes(file.type))throw new Error('只支援 PNG、JPG、WebP、GIF');
 if(file.size>4500000)throw new Error('圖片不能超過 4.5MB');
 mdStatus('圖片上傳中…');
 const response=await fetch('/api/admin/media',{method:'POST',credentials:'same-origin',headers:{'Content-Type':file.type},body:file});
 const result=await response.json();
 if(!response.ok)throw new Error(result.error||'圖片上傳失敗');
 if(typeof result.url!=='string'||!result.url.startsWith('https://'))throw new Error('上傳沒有回傳正確圖片網址');
 replaceSelectedMarkdown('\n'+imageHtml(result.url,file.name.replace(/\.[^.]*$/,''))+'\n');
 say('圖片已上傳並插入文章');
 mdStatus('圖片已插入，文章尚未儲存',true);
}
function applyFormat(kind){
 const value=selectedMarkdown();
 if(kind==='bold')return editSelection('**','**','粗體文字');
 if(kind==='italic')return editSelection('*','*','斜體文字');
 if(kind==='heading')return editSelection('\n## ','\n', '小標題');
 if(kind==='link')return editSelection('[','](https://example.com)','連結文字');
 if(kind==='quote')return editSelection('\n> ','\n','引用文字');
 if(kind==='list')return editSelection('\n- ','\n','清單項目');
 if(kind==='code')return editSelection('\n'+String.fromCharCode(96).repeat(3)+'\n','\n'+String.fromCharCode(96).repeat(3)+'\n',value||'程式碼');
 if(['center','left','right'].includes(kind))return alignText(kind);
}
function getEditor(){
 if(editor)return editor;
 const field=el('markdown-input');
 if(window.CodeMirror){
  cm=window.CodeMirror.fromTextArea(field,{
   mode:'markdown',lineNumbers:true,lineWrapping:true,indentUnit:2,tabSize:2,
   extraKeys:{'Ctrl-S':()=>el('document-form').requestSubmit(),'Cmd-S':()=>el('document-form').requestSubmit()},
  });
  cm.on('change',schedulePreview);
  cm.on('paste',(_instance,event)=>{
   const list=Array.from(event.clipboardData?.files||[]);
   const file=list.find(f=>f.type.startsWith('image/'));
   if(file){event.preventDefault();uploadImage(file).catch(err=>say(err.message,true));}
  });
  cm.on('drop',(_instance,event)=>{
   const file=Array.from(event.dataTransfer?.files||[]).find(f=>f.type.startsWith('image/'));
   if(file){event.preventDefault();uploadImage(file).catch(err=>say(err.message,true));}
  });
 }else{
  field.addEventListener('input',schedulePreview);
 }
 editor={
  getMarkdown:()=>cm?cm.getValue():field.value,
  setMarkdown:(value)=>{
   if(cm){cm.setValue(value);cm.clearHistory();cm.refresh();}
   else field.value=value;
   savedText=value;mdStatus('已載入文章');renderPreview();
  },
 };
 document.querySelectorAll('[data-md-mode]').forEach(b=>b.onclick=()=>setEditorMode(b.dataset.mdMode));
 document.querySelectorAll('[data-md-tool]').forEach(b=>b.onclick=()=>applyFormat(b.dataset.mdTool));
 el('apply-image').onclick=configureImage;
 el('upload-image').onclick=()=>el('image-file').click();
 el('image-file').onchange=async event=>{
  const file=event.target.files?.[0];
  if(file)try{await uploadImage(file);}catch(err){say(err.message,true);}
  event.target.value='';
 };
 const root=el('editor');
 root.addEventListener('dragover',event=>{if(event.dataTransfer?.types.includes('Files')){event.preventDefault();root.dataset.drop='true';}});
 root.addEventListener('dragleave',()=>{delete root.dataset.drop;});
 root.addEventListener('drop',event=>{
  delete root.dataset.drop;
  const file=Array.from(event.dataTransfer?.files||[]).find(f=>f.type.startsWith('image/'));
  if(file){event.preventDefault();uploadImage(file).catch(err=>say(err.message,true));}
 });
 setEditorMode('split');
 return editor;
}
const parseList=s=>s.replaceAll(String.fromCharCode(10),',').split(/[，,]/).map(x=>x.trim()).filter(Boolean);
const dateInput=v=>v?String(v).slice(0,16):new Date().toISOString().slice(0,16);
function showDoc(d){
 const data=d||{};
 el('doc-title').value=data.title||'';
 el('doc-slug').value=data.slug||'';
 el('doc-date').value=dateInput(data.date);
 el('doc-description').value=data.description||'';
 el('doc-categories').value=(data.categories||[]).join(',');
 el('doc-tags').value=(data.tags||[]).join(',');
 el('doc-draft').checked=data.draft!==false;
 el('doc-pinned').checked=data.pinned===true;
 getEditor().setMarkdown(data.body_markdown||'');
}
async function loadDocs(){
 const items=(await api('/api/admin/content?kind='+tab)).items||[];
 docs=items;
 const select=el('documents-list');select.replaceChildren();
 const opt=document.createElement('option');opt.value='';opt.textContent='＋ 新增';select.appendChild(opt);
 for(const doc of docs){const o=document.createElement('option');o.value=doc.slug;o.textContent=(doc.draft?'[草稿] ':'')+doc.title;select.appendChild(o);}
 if(docs.length){select.value=docs[0].slug;showDoc(docs[0]);}else showDoc(null);
}
function showPanel(next){
 tab=next;
 for(const b of document.querySelectorAll('nav [data-tab]'))b.setAttribute('aria-current',b.dataset.tab===tab?'page':'false');
 el('documents').classList.toggle('hidden',!['post','work'].includes(tab));
 el('settings-panel').classList.toggle('hidden',!['homepage','about'].includes(tab));
 el('comments-panel').classList.toggle('hidden',tab!=='comments');
 if(['post','work'].includes(tab))loadDocs().catch(e=>say(e.message,true));
 if(['homepage','about'].includes(tab))loadSettings().catch(e=>say(e.message,true));
 if(tab==='comments')loadComments().catch(e=>say(e.message,true));
}
async function loadSettings(){
 const data=await api('/api/admin/settings/'+tab);
 homeData=data;
 el('settings-heading').textContent=tab==='homepage'?'首頁管理':'關於我內容';
 const target=el('settings-fields');target.replaceChildren();
 if(tab==='about'){
  const p=document.createElement('p');p.textContent='第一階段先以 JSON 保留「關於我」完整資料，後續會換成表單欄位。';target.appendChild(p);
  const a=document.createElement('textarea');a.id='about-json';a.rows=22;a.value=JSON.stringify(data,null,2);target.appendChild(a);
  return;
 }
 fields.forEach((key,i)=>{
  const wrap=document.createElement('div');wrap.className='home-field';
  const label=document.createElement('label');label.textContent=labels[i];label.htmlFor='setting-'+key;
  const control=key==='status_description'?document.createElement('textarea'):document.createElement('input');
  control.id='setting-'+key;control.value=data[key]||'';
  wrap.append(label,control);target.appendChild(wrap);
 });
 const p=document.createElement('p');p.textContent='標籤（每行「文字,顏色代碼」，顏色代碼可用 admissions、website、learning）';target.appendChild(p);
 const tagInput=document.createElement('textarea');tagInput.id='setting-tags';tagInput.rows=5;
 tagInput.value=(data.status_tags||[]).map(t=>(t.text||'')+','+(t.style||'admissions')).join(String.fromCharCode(10));target.appendChild(tagInput);
}
async function loadComments(){
 const data=await api('/api/admin/comments');const target=el('comments-list');target.replaceChildren();
 for(const c of (data.comments||[])){
  const box=document.createElement('div');box.className='comment';
  const title=document.createElement('strong');title.textContent=(c.status==='pending'?'[待審] ':'['+c.status+'] ')+c.nickname+' · '+c.kind+'/'+c.slug;
  const msg=document.createElement('p');msg.textContent=c.body;
  const actions=document.createElement('div');actions.className='actions';
  for(const status of ['approved','hidden']){
   const b=document.createElement('button');b.type='button';b.className='secondary';b.textContent=status==='approved'?'核准':'隱藏';
   b.onclick=async()=>{try{await api('/api/admin/comments','PUT',{id:c.id,status});say('留言狀態已更新');loadComments();}catch(e){say(e.message,true);}};
   actions.appendChild(b);
  }
  box.append(title,msg,actions);target.appendChild(box);
 }
 if(!target.children.length)target.textContent='目前沒有留言。';
}
el('login-form').addEventListener('submit',async e=>{
 e.preventDefault();
 try{await api('/api/admin/login','POST',{password:el('password').value});el('password').value='';await loggedIn();}
 catch(err){say(err.message,true);}
});
async function loggedIn(){
 el('login-card').classList.add('hidden');el('workspace').classList.remove('hidden');
 el('logout').classList.remove('hidden');say('已登入 Cloudflare 內容後台');
 showPanel('post');
}
el('logout').onclick=async()=>{
 try{await api('/api/admin/logout','POST');location.reload();}catch(e){say(e.message,true);}
};
document.querySelectorAll('nav [data-tab]').forEach(b=>b.onclick=()=>showPanel(b.dataset.tab));
el('documents-list').onchange=e=>showDoc(docs.find(d=>d.slug===e.target.value)||null);
el('new-doc').onclick=()=>{el('documents-list').value='';showDoc(null);};
el('document-form').onsubmit=async e=>{
 e.preventDefault();
 try{
  const payload={
   kind:tab,slug:el('doc-slug').value.trim(),title:el('doc-title').value.trim(),
   date:new Date(el('doc-date').value).toISOString(),
   description:el('doc-description').value,
   categories:parseList(el('doc-categories').value),
   tags:parseList(el('doc-tags').value),
   body_markdown:getEditor().getMarkdown(),
   draft:el('doc-draft').checked,pinned:el('doc-pinned').checked,
  };
  await api('/api/admin/content','PUT',payload);
  say('已儲存至 Cloudflare D1，不需 GitHub / Vercel');
  await loadDocs();el('documents-list').value=payload.slug;showDoc(docs.find(d=>d.slug===payload.slug));
 }catch(err){say(err.message,true);}
};
el('settings-form').onsubmit=async e=>{
 e.preventDefault();
 try{
  let data;
  if(tab==='about')data=JSON.parse(el('about-json').value);
  else {
   data={...homeData};
   for(const key of fields)data[key]=el('setting-'+key).value;
   data.status_tags=el('setting-tags').value.split(String.fromCharCode(10)).filter(s=>s.trim()).map(s=>{
    const pair=s.split(',');return {text:(pair[0]||'').trim(),style:(pair[1]||'admissions').trim()};
   });
  }
  await api('/api/admin/settings/'+tab,'PUT',data);
  say('設定已直接儲存至 D1');
 }catch(err){say(err.message,true);}
};
api('/api/admin/me').then(loggedIn).catch(()=>{});
})();
</script>
</body></html>`;
