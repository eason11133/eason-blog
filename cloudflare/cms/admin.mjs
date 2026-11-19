// Self-contained staging administration UI. No GitHub or Vercel requests when saving.
export const adminHtml = `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Eason｜內容管理測試版</title>
<link rel="stylesheet" href="https://uicdn.toast.com/editor/latest/toastui-editor.min.css">
<link rel="stylesheet" href="https://uicdn.toast.com/editor/latest/theme/toastui-editor-dark.min.css">
<style>
:root{color-scheme:dark;font-family:system-ui,-apple-system,"Noto Sans TC",sans-serif;background:#111823;color:#e9edf5}
*{box-sizing:border-box}body{margin:0;min-height:100vh}main{max-width:1160px;margin:auto;padding:26px 20px 80px}
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
#editor{min-height:450px}.toastui-editor-defaultUI{border-color:#46556e!important}
.editor-actions{display:flex;gap:10px;align-items:center;margin-top:20px}
.comment{border-bottom:1px solid #36445a;padding:14px 0}.comment:last-child{border:0}
.comment p{white-space:pre-wrap;color:#e0e7f1}.actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}
.home-field{margin-bottom:12px}.tags-grid{display:grid;grid-template-columns:1fr 160px;gap:10px;margin:8px 0}
@media(max-width:720px){.two,.fields{grid-template-columns:1fr}main{padding:15px}.card{padding:16px}.span-2{grid-column:auto}}
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
<div class="span-2"><label>文章內容（可切換所見即所得／Markdown）</label><div id="editor"></div></div>
<div class="span-2 editor-actions"><button id="save-doc" type="submit">儲存到 D1</button><small>正式發布會立即更新資料庫，不經 GitHub 或 Vercel</small></div>
</form></section>
<section id="settings-panel" class="card hidden"><h2 id="settings-heading"></h2><form id="settings-form"><div id="settings-fields"></div><div class="editor-actions"><button type="submit">儲存設定到 D1</button></div></form></section>
<section id="comments-panel" class="card hidden"><h2>留言審核</h2><p>訪客送出的留言預設不公開，你按核准後才會顯示。</p><div id="comments-list"></div></section>
</section>
</main>
<script src="https://uicdn.toast.com/editor/latest/toastui-editor-all.min.js"></script>
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
let tab='post',docs=[],homeData={},editor=null;
function getEditor(){
 if(!editor){
  if(!window.toastui?.Editor){say('編輯器未載入，請檢查網路。',true);throw new Error('Editor unavailable');}
  editor=new toastui.Editor({
   el:el('editor'),height:'500px',initialEditType:'wysiwyg',previewStyle:'vertical',
   theme:'dark',usageStatistics:false,initialValue:'',
   hooks:{addImageBlobHook:async(blob,callback)=>{
    try{
     const res=await fetch('/api/admin/media',{method:'POST',credentials:'same-origin',headers:{'Content-Type':blob.type},body:blob});
     const data=await res.json();
     if(!res.ok)throw new Error(data.error||'Upload failed');
     callback(data.url,blob.name||'image');
     say('圖片已上傳');
    }catch(err){say('圖片上傳失敗：'+err.message,true);}
    return false;
   }},
  });
 }
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
