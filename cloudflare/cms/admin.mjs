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
.friend-entry{padding:16px 0 18px;border-bottom:1px solid #39465a;margin-bottom:14px}
.friend-entry .friend-fields{display:grid;grid-template-columns:1fr 1.5fr;gap:12px}
.friend-entry .friend-fields label{display:block;margin-bottom:7px}
.friend-entry .friend-description{margin-top:12px}
.friend-avatar-controls{display:flex;align-items:center;gap:14px;margin:0 0 14px;flex-wrap:wrap}
.friend-avatar-preview{width:64px;height:64px;border-radius:50%;background:#26374c;display:grid;place-items:center;overflow:hidden;flex:none;font-weight:700;font-size:1.3rem}
.friend-avatar-preview img{width:100%;height:100%;object-fit:cover;display:block}
.friend-avatar-controls input[type=file]{max-width:100%;width:auto;padding:6px;font-size:.85rem}
.friend-avatar-controls button{padding:6px 11px;font-size:.85rem}
.friend-entry .friend-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
.friend-entry .friend-actions button{padding:6px 11px;font-size:.9rem}
@media(max-width:720px){.friend-entry .friend-fields{grid-template-columns:1fr}}
:root{color-scheme:dark;font-family:system-ui,-apple-system,"Noto Sans TC",sans-serif;background:#111823;color:#e9edf5}
*{box-sizing:border-box}body{margin:0;min-height:100vh}main{max-width:1380px;margin:auto;padding:26px 20px 80px}
header{display:flex;justify-content:space-between;align-items:center;gap:16px;border-bottom:1px solid #39465a;padding-bottom:18px;margin-bottom:22px}
h1{font-size:1.5rem;margin:0}h2{font-size:1.18rem;margin:0 0 12px}p{line-height:1.65;color:#b8c7df}
button{background:#4d89d8;color:white;border:1px solid transparent;border-radius:10px;padding:11px 17px;font:inherit;cursor:pointer}
button:hover{filter:brightness(1.1)}button:disabled{opacity:.55;cursor:not-allowed}
button.secondary{background:#273446;border-color:#52667e}
button.ghost{background:transparent;border:1px solid #50637d}
button.danger{background:transparent;border:1px solid #a45d66;color:#ffb1b7}button.danger:hover:not(:disabled){background:#572b37;color:#fff}
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
.inbox-heading,.inbox-account,.inbox-owner-actions,.inbox-notification-controls,.inbox-compose-actions,.inbox-toolbar,.inbox-pagination{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.inbox-heading{justify-content:space-between;margin-bottom:12px}.inbox-heading h2{margin:0}
.inbox-account{justify-content:space-between;padding:12px 0 16px;border-bottom:1px solid #39485e}.inbox-account a{color:#9accff}.inbox-person{display:flex;align-items:center;gap:10px;min-width:0}.inbox-person small{display:block}.inbox-avatar{width:38px;height:38px;flex:none;object-fit:cover;border-radius:50%;background:#34465f;display:grid;place-items:center;color:#c6d4e7;font-size:.85rem}
.inbox-notification{padding:14px 0;border-bottom:1px solid #39485e;color:#b8c7df}.inbox-notification summary{cursor:pointer}.inbox-notification p{font-size:.9rem;margin:.6rem 0}.inbox-notification select{width:auto;min-width:140px}.inbox-notification small{display:block;margin:8px 0}.inbox-notification code{overflow-wrap:anywhere}
.inbox-summary{display:flex;gap:24px;flex-wrap:wrap;padding:20px 0;color:#aebfd5;font-size:.88rem}.inbox-summary strong{font-size:1.3rem;color:#edf3fc;margin-right:5px}
.inbox-layout{display:grid;grid-template-columns:minmax(190px,260px) minmax(0,1fr);gap:22px}.inbox-sidebar{border-right:1px solid #39485e;padding-right:16px;min-width:0}.inbox-sidebar input{margin-bottom:10px}.inbox-main{min-width:0}
#inbox-articles{max-height:680px;overflow:auto;display:grid;gap:4px}.inbox-article{display:flex;gap:9px;text-align:left;justify-content:space-between;align-items:center;background:transparent;border:0;color:#c7d5e8;font-size:.87rem;border-radius:7px;padding:10px 8px;width:100%}.inbox-article span{overflow-wrap:anywhere;min-width:0}.inbox-article small{white-space:nowrap}.inbox-article[aria-current="true"]{background:#304563;color:white}.inbox-article:hover{background:#26374c}
.inbox-toolbar{margin:0 0 14px}.inbox-toolbar select{width:auto;min-width:135px}.inbox-toolbar input{flex:1;min-width:150px}
.inbox-compose{padding:14px;border:1px solid #39485e;border-radius:10px;margin-bottom:12px}.inbox-compose select,.inbox-compose textarea{margin-bottom:9px}.inbox-compose-actions{justify-content:space-between}.inbox-compose-actions button{padding:8px 14px}#inbox-reply-target{display:flex;align-items:center;justify-content:space-between;color:#9accff;font-size:.88rem;gap:6px;margin-bottom:8px}#inbox-reply-target button{padding:4px 8px}
.inbox-comment{padding:16px 0;border-bottom:1px solid #39485e;min-width:0}.inbox-comment:last-child{border-bottom:0}.inbox-comment-head{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}.inbox-comment-meta{display:flex;gap:8px;align-items:center;flex-wrap:wrap;font-size:.78rem;color:#a7bad3}.inbox-unread{color:#9accff}.inbox-comment-article{display:block;color:#a8c7e9;font-size:.84rem;margin:10px 0;overflow-wrap:anywhere;text-decoration:none}.inbox-comment-article:hover{text-decoration:underline}.inbox-comment p{white-space:pre-wrap;overflow-wrap:anywhere;margin:9px 0;color:#e0e7f1}.inbox-parent{border-left:2px solid #52667e;padding:6px 10px;color:#a7bad3;font-size:.82rem;overflow-wrap:anywhere}.inbox-comment .actions button{padding:6px 10px;font-size:.82rem}.inbox-pagination{justify-content:flex-end;margin-top:12px}.inbox-pagination button{padding:6px 10px;font-size:.85rem}
@media(max-width:720px){.inbox-layout{grid-template-columns:1fr}.inbox-sidebar{border:0;border-bottom:1px solid #39485e;padding:0 0 10px}#inbox-articles{max-height:200px}.inbox-summary{gap:14px}}
.about-form-section{padding:18px 0;border-bottom:1px solid #39485e}
.about-form-section h3{margin:0 0 14px;font-size:1.04rem}
.about-repeat-row{padding:12px 14px;margin:8px 0;border:1px solid #39485e;border-radius:9px}
.about-repeat-row .home-field:last-child{margin-bottom:0}
.about-repeat-actions{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.about-repeat-actions button,.about-add{padding:6px 10px;font-size:.86rem}
.about-avatar-preview{width:96px;height:96px;object-fit:cover;border-radius:12px;display:block;margin:10px 0}
.doc-date-controls{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.doc-date-controls #doc-date{flex:1 1 125px;min-width:0;width:auto;font-variant-numeric:tabular-nums}
.doc-date-controls #doc-time{flex:0 1 82px;min-width:72px;width:auto;font-variant-numeric:tabular-nums}
.doc-date-controls button{padding:10px 12px;white-space:nowrap;font-size:.86rem}
.doc-date-help{display:block;margin-top:6px;line-height:1.4}
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
<button type="button" class="secondary" data-tab="friends">友站</button>
<button type="button" class="secondary" data-tab="footer">頁尾連結</button>
<button type="button" class="secondary" data-tab="comments">留言管理</button>
</nav>
<section id="documents" class="card">
<div class="two"><div><label for="documents-list">選擇已有內容</label><select id="documents-list"></select></div><div style="display:flex;align-items:end"><button class="secondary" id="new-doc" type="button">新增一篇</button><button class="danger" id="delete-doc" type="button" disabled style="margin-left:8px">刪除這篇</button></div></div>
<form id="document-form" class="fields" style="margin-top:18px">
<div class="field"><label for="doc-title">標題</label><input id="doc-title" required maxlength="200"></div>
<div class="field"><label for="doc-slug">網址代碼／slug（建立後請勿隨意改）</label><input id="doc-slug" required maxlength="120"></div>
<div class="field"><label for="doc-date">建立日期（台灣時間）</label>
<div class="doc-date-controls">
<input id="doc-date" type="text" placeholder="2026/11/25" aria-label="建立日期，年/月/日" autocomplete="off" required>
<input id="doc-time" type="text" placeholder="01:30" aria-label="建立時間，24 小時制" autocomplete="off" required>
<button id="doc-date-today" class="secondary" type="button">今天</button>
<button id="doc-date-now" class="secondary" type="button">現在</button>
</div><small class="doc-date-help">直接輸入年月日與 24 小時制時間，例如 2026/11/25、01:30。最新更新時間會自動記錄。</small></div>
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
<section id="friends-panel" class="card hidden">
<h2>友站管理</h2>
<details style="margin:0 0 22px"><summary style="cursor:pointer">申請友站設定</summary><form id="friend-form-settings" class="fields" style="margin-top:16px">
<div class="field"><label for="friend-form-heading">申請區標題</label><input id="friend-form-heading" type="text" maxlength="100" required></div>
<div class="field span-2"><label for="friend-form-intro">申請說明</label><textarea id="friend-form-intro" rows="3" maxlength="2000"></textarea></div>
<div class="field"><label for="friend-form-infoLabel">本站資訊標題</label><input id="friend-form-infoLabel" type="text" maxlength="100" required></div>
<div class="field"><label for="friend-form-siteName">本站名稱</label><input id="friend-form-siteName" type="text" maxlength="100" required></div>
<div class="field"><label for="friend-form-siteUrl">本站網址（留空使用目前網站網址）</label><input id="friend-form-siteUrl" type="url" maxlength="1500"></div>
<div class="field span-2"><label for="friend-form-siteDescription">本站簡介</label><textarea id="friend-form-siteDescription" rows="3" maxlength="500"></textarea></div>
<div class="field"><label for="friend-form-siteImage">本站頭像圖片網址</label><input id="friend-form-siteImage" type="url" maxlength="1500"></div>
<div class="field"><label for="friend-form-nameLabel">名稱欄位名稱</label><input id="friend-form-nameLabel" type="text" maxlength="100" required></div>
<div class="field"><label for="friend-form-namePlaceholder">名稱欄位提示</label><input id="friend-form-namePlaceholder" type="text" maxlength="200"></div>
<div class="field"><label for="friend-form-urlLabel">網址欄位名稱</label><input id="friend-form-urlLabel" type="text" maxlength="100" required></div>
<div class="field"><label for="friend-form-urlPlaceholder">網址欄位提示</label><input id="friend-form-urlPlaceholder" type="text" maxlength="200"></div>
<div class="field"><label for="friend-form-descriptionLabel">介紹欄位名稱</label><input id="friend-form-descriptionLabel" type="text" maxlength="100" required></div>
<div class="field"><label for="friend-form-descriptionPlaceholder">介紹欄位提示</label><input id="friend-form-descriptionPlaceholder" type="text" maxlength="200"></div>
<div class="field"><label for="friend-form-avatarLabel">圖片欄位名稱（選填）</label><input id="friend-form-avatarLabel" type="text" maxlength="100" required></div>
<div class="field"><label for="friend-form-avatarPlaceholder">圖片欄位提示</label><input id="friend-form-avatarPlaceholder" type="text" maxlength="200"></div>
<div class="field"><label for="friend-form-submitLabel">送出按鈕文字</label><input id="friend-form-submitLabel" type="text" maxlength="100" required></div>
<div class="field"><label for="friend-form-successMessage">成功送出提示</label><input id="friend-form-successMessage" type="text" maxlength="500" required></div>
<div class="span-2 editor-actions"><button id="save-friend-form" type="submit" disabled>儲存申請設定</button></div></form></details>
<h3>待審核申請</h3><p>核准後才會公開，聯絡方式不會出現在前台。</p><div id="friend-requests-list"></div><h3>已公開友站</h3>
<p>可自行上傳友站頭像（選填），再填名稱、網址和介紹。儲存後立即更新前台。</p>
<form id="friends-form">
<div id="friends-list"></div>
<div class="editor-actions"><button id="add-friend" type="button" class="secondary">＋ 新增友站</button><button type="submit">儲存友站到 D1</button></div>
</form>
</section>
<section id="footer-panel" class="card hidden">
<h2>頁尾連結</h2>
<p>設定全站頁尾的四個社群圖示。未填寫的圖示會維持灰色、不可點擊。Email 可直接填信箱地址，其他欄位請填完整網址。</p>
<form id="footer-form">
<div class="home-field"><label for="footer-github">GitHub</label><input id="footer-github" type="url" placeholder="https://github.com/你的帳號" maxlength="1500"></div>
<div class="home-field"><label for="footer-email">Email（公開聯絡信箱）</label><input id="footer-email" type="text" inputmode="email" placeholder="你的信箱地址" maxlength="254"></div>
<div class="home-field"><label for="footer-instagram">Instagram</label><input id="footer-instagram" type="url" placeholder="https://www.instagram.com/你的帳號/" maxlength="1500"></div>
<div class="home-field"><label for="footer-discord">Discord</label><input id="footer-discord" type="url" placeholder="https://discord.com/users/..." maxlength="1500"></div>
<div class="editor-actions"><button id="save-footer" type="submit" disabled>儲存頁尾連結到 D1</button></div>
</form>
</section>
<section id="comments-panel" class="card hidden">
<div class="inbox-heading"><h2>留言管理</h2><button class="secondary" type="button" id="inbox-refresh">重新整理</button></div>
<div class="inbox-account"><div id="inbox-owner"></div><div class="inbox-owner-actions"><button class="secondary" id="inbox-pair" type="button">連結我的留言帳號</button><button class="ghost hidden" id="inbox-unpair" type="button">解除連結</button></div><a class="hidden" id="inbox-pair-link" target="_blank" rel="noopener noreferrer">開啟帳號連結頁面 ↗</a></div>
<details class="inbox-notification"><summary>手機通知設定</summary><p>有人留言時傳送文章名稱及網址，不包含訪客的帳號或留言內容。請先設定所選服務的 Cloudflare Secrets。</p>
<div class="inbox-notification-controls"><select id="inbox-channel" aria-label="通知方式"><option value="off">關閉通知</option><option value="line">LINE</option><option value="discord">Discord</option></select><button type="button" id="inbox-save-channel">儲存</button><button class="secondary" type="button" id="inbox-test-channel">傳送測試通知</button></div><small id="inbox-notification-state"></small><p id="inbox-notification-result" role="status" aria-live="polite" style="overflow-wrap:anywhere"></p>
<details><summary>所需 Secrets</summary><p>LINE：<code>COMMENT_LINE_ACCESS_TOKEN</code>、<code>COMMENT_LINE_USER_ID</code><br>Discord：<code>COMMENT_DISCORD_WEBHOOK</code></p></details></details>
<div class="inbox-summary" id="inbox-summary"></div>
<div class="inbox-layout">
<aside class="inbox-sidebar"><label for="inbox-article-search">文章／作品</label><input id="inbox-article-search" placeholder="搜尋文章名稱"><div id="inbox-articles"></div></aside>
<div class="inbox-main">
<div class="inbox-toolbar"><select id="inbox-status" aria-label="留言篩選"><option value="">全部留言</option><option value="unread">未讀</option><option value="unanswered">未回覆</option><option value="approved">已公開</option><option value="hidden">已隱藏</option><option value="pending">待審核</option></select><input id="inbox-search" placeholder="搜尋作者、留言或文章"></div>
<div class="inbox-compose"><form id="inbox-compose-form"><label for="inbox-compose-article">以我的帳號留言</label><select id="inbox-compose-article" required></select><div class="hidden" id="inbox-reply-target"><span id="inbox-reply-label"></span><button class="ghost" id="inbox-reply-cancel" type="button">取消回覆</button></div><textarea id="inbox-compose-body" maxlength="1600" minlength="2" rows="3" placeholder="寫下留言或回覆…" required></textarea><div class="inbox-compose-actions"><small id="inbox-compose-help">先連結自己的留言帳號</small><button id="inbox-compose-send" type="submit" disabled>送出留言</button></div></form></div>
<div id="comments-list" aria-live="polite"></div>
<div class="inbox-pagination"><button class="secondary" id="inbox-prev" type="button">上一頁</button><span id="inbox-page"></span><button class="secondary" id="inbox-next" type="button">下一頁</button></div>
</div></div></section>
</section>
</main>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/codemirror.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/markdown/markdown.min.js"></script>
<script src="https://unpkg.com/markdown-it@14.3.2/dist/markdown-it.min.js"></script>
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
 replaceSelectedMarkdown('<div style="text-align:'+style+';">\\n\\n'+chosen+'\\n\\n</div>');
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
 const markdownImage=/^!\\[([^\\]]*)\\]\\(([^)\\s]+)(?:\\s+["'][^"']*["'])?\\)$/.exec(selected);
 const htmlImage=/^<img\\s[^>]*src=["']([^"']+)["'][^>]*>$/i.exec(selected);
 if(markdownImage){replaceSelectedMarkdown(imageHtml(markdownImage[2],markdownImage[1]));return;}
 if(htmlImage){
  const alt=/\\balt=["']([^"']*)["']/i.exec(selected);
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
 replaceSelectedMarkdown('\\n'+imageHtml(result.url,file.name.replace(/\\.[^.]*$/,''))+'\\n');
 say('圖片已上傳並插入文章');
 mdStatus('圖片已插入，文章尚未儲存',true);
}
function applyFormat(kind){
 const value=selectedMarkdown();
 if(kind==='bold')return editSelection('**','**','粗體文字');
 if(kind==='italic')return editSelection('*','*','斜體文字');
 if(kind==='heading')return editSelection('\\n## ','\\n', '小標題');
 if(kind==='link')return editSelection('[','](https://example.com)','連結文字');
 if(kind==='quote')return editSelection('\\n> ','\\n','引用文字');
 if(kind==='list')return editSelection('\\n- ','\\n','清單項目');
 if(kind==='code')return editSelection('\\n'+String.fromCharCode(96).repeat(3)+'\\n','\\n'+String.fromCharCode(96).repeat(3)+'\\n',value||'程式碼');
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
  if(event.defaultPrevented)return;
  const file=Array.from(event.dataTransfer?.files||[]).find(f=>f.type.startsWith('image/'));
  if(file){event.preventDefault();uploadImage(file).catch(err=>say(err.message,true));}
 });
 setEditorMode('split');
 return editor;
}
const parseList=s=>s.replaceAll(String.fromCharCode(10),',').split(/[，,]/).map(x=>x.trim()).filter(Boolean);
const taipeiDateFormatter=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
function dateInput(value){
 const date=value?new Date(value):new Date();
 if(!Number.isFinite(date.getTime()))return '';
 const parts=Object.fromEntries(taipeiDateFormatter.formatToParts(date).map(p=>[p.type,p.value]));
 return parts.year+'-'+parts.month+'-'+parts.day+'T'+parts.hour+':'+parts.minute;
}
function dateForSave(value,original){
 // Keep the original instant, including seconds, if the field is unchanged.
 if(original&&value===dateInput(original))return original;
 if(!value)throw new Error('請填寫日期');
 const date=new Date(value+'+08:00');
 if(!Number.isFinite(date.getTime())||dateInput(date.toISOString())!==value)throw new Error('日期格式不正確');
 return date.toISOString();
}
function normalizeDateFields(day,clock){
 const d=String(day).trim().match(/^(\\d{4})[-/.](\\d{1,2})[-/.](\\d{1,2})$/)||String(day).trim().match(/^(\\d{4})(\\d{2})(\\d{2})$/);
 const t=String(clock).trim().match(/^(\\d{1,2}):(\\d{1,2})$/)||String(clock).trim().match(/^(\\d{2})(\\d{2})$/);
 if(!d||!t)throw new Error('請輸入正確日期和時間，例如 2026/11/25、01:30');
 const pad=x=>x.padStart(2,'0');
 return d[1]+'-'+pad(d[2])+'-'+pad(d[3])+'T'+pad(t[1])+':'+pad(t[2]);
}
let originalDocDate='';
function fillDateFields(value){
 const parts=dateInput(value).split('T');
 el('doc-date').value=(parts[0]||'').replaceAll('-','/');
 el('doc-time').value=parts[1]||'';
}
el('doc-date-now').onclick=()=>fillDateFields();
el('doc-date-today').onclick=()=>{el('doc-date').value=dateInput().split('T')[0].replaceAll('-','/');};

let docBusy=false,docLoadSeq=0;
function showDoc(d){
 el('delete-doc').disabled=docBusy||!d;
 el('delete-doc').textContent='刪除'+(tab==='work'?'作品':'文章');
 const data=d||{};
 el('doc-title').value=data.title||'';
 el('doc-slug').value=data.slug||'';
 originalDocDate=data.date||'';
 fillDateFields(data.date);
 el('doc-description').value=data.description||'';
 el('doc-categories').value=(data.categories||[]).join(',');
 el('doc-tags').value=(data.tags||[]).join(',');
 el('doc-draft').checked=data.draft!==false;
 el('doc-pinned').checked=data.pinned===true;
 getEditor().setMarkdown(data.body_markdown||'');
}
async function loadDocs(){
 const kind=tab,seq=++docLoadSeq;
 el('delete-doc').disabled=true;
 const items=(await api('/api/admin/content?kind='+kind)).items||[];
 if(tab!==kind||seq!==docLoadSeq)return;
 docs=items;
 const select=el('documents-list');select.replaceChildren();
 const opt=document.createElement('option');opt.value='';opt.textContent='＋ 新增';select.appendChild(opt);
 for(const doc of docs){const o=document.createElement('option');o.value=doc.slug;o.textContent=(doc.draft?'[草稿] ':'')+doc.title;select.appendChild(o);}
 if(docs.length){select.value=docs[0].slug;showDoc(docs[0]);}else showDoc(null);
}
function currentFriendRows(){
 return Array.from(el('friends-list').querySelectorAll('.friend-entry')).map(row=>({
  name:row.querySelector('[data-friend-field=name]').value,
  url:row.querySelector('[data-friend-field=url]').value,
  description:row.querySelector('[data-friend-field=description]').value,
  avatar:row.querySelector('[data-friend-field=avatar]').value,
 }));
}
let friendUploads=0;
function renderFriendRows(items){
 const target=el('friends-list');target.replaceChildren();
 if(!items.length){const note=document.createElement('p');note.textContent='還沒有友站，按下方「新增友站」即可。';target.appendChild(note);return;}
 const createField=(container,field,labelText,value,multiline=false)=>{
  const wrap=document.createElement('div');wrap.className='field'+(field==='description'?' friend-description':'');
  const label=document.createElement('label');label.textContent=labelText;
  const control=document.createElement(multiline?'textarea':'input');
  control.dataset.friendField=field;
  control.value=value||'';
  if(!multiline){control.required=true;control.maxLength=field==='url'?1500:100;}
  else{control.rows=2;control.maxLength=300;}
  if(field==='url'){control.type='url';control.placeholder='https://example.com';}
  if(field==='name')control.placeholder='網站名稱';
  wrap.append(label,control);container.appendChild(wrap);
 };
 items.forEach((item,index)=>{
  const row=document.createElement('div');row.className='friend-entry';
  const cols=document.createElement('div');cols.className='friend-fields';
  createField(cols,'name','友站名稱',item.name);
  createField(cols,'url','網站網址',item.url);
  const avatarControls=document.createElement('div');avatarControls.className='friend-avatar-controls';
  const avatar=document.createElement('input');avatar.type='hidden';avatar.dataset.friendField='avatar';avatar.value=item.avatar||'';
  const preview=document.createElement('div');preview.className='friend-avatar-preview';
  const picker=document.createElement('input');picker.type='file';picker.accept='image/png,image/jpeg,image/webp,image/gif';picker.setAttribute('aria-label','上傳友站頭像');
  const remove=document.createElement('button');remove.type='button';remove.className='secondary';remove.textContent='移除頭像';
  const label=document.createElement('small');label.textContent='頭像（選填）';
  const imageUrl=document.createElement('input');imageUrl.type='text';imageUrl.maxLength=1500;imageUrl.placeholder='HTTPS 圖片網址，或上傳圖片';imageUrl.setAttribute('aria-label','頭像圖片網址');imageUrl.value=avatar.value;
  imageUrl.onchange=()=>{const v=imageUrl.value.trim();try{if(v&&v!==avatar.value){const u=new URL(v);if(u.protocol!=='https:'||u.username||u.password)throw Error('請填 HTTPS 圖片網址');}avatar.value=v;refresh();}catch(err){imageUrl.value=avatar.value;say('請填 HTTPS 圖片網址',true);}};
  const refresh=()=>{
   const initial=Array.from(cols.querySelector('[data-friend-field=name]').value.trim())[0]||'?';
   preview.textContent=initial;
   if(avatar.value){const img=document.createElement('img');img.alt='';img.referrerPolicy='no-referrer';img.onerror=()=>{if(img.isConnected)preview.textContent=initial;};img.src=avatar.value;preview.replaceChildren(img);}
   remove.disabled=!avatar.value||picker.disabled;
  };
  picker.onchange=async()=>{
   const file=picker.files?.[0];if(!file)return;
   friendUploads++;picker.disabled=true;remove.disabled=true;
   try{
    if(!['image/png','image/jpeg','image/webp','image/gif'].includes(file.type)||file.size>4500000)throw new Error('請選擇 4.5MB 以內的 PNG、JPG、WebP 或 GIF');
    const response=await fetch('/api/admin/media',{method:'POST',credentials:'same-origin',headers:{'Content-Type':file.type},body:file});
    const result=await response.json();if(!response.ok)throw new Error(result.error||'圖片上傳失敗');
    const url=new URL(result.url);
    if(url.origin!==location.origin||!url.pathname.startsWith('/media/'))throw new Error('上傳沒有回傳正確圖片網址');
    if(!row.isConnected)throw new Error('已離開友站編輯頁，請重新上傳');
    avatar.value=url.pathname;imageUrl.value=avatar.value;say('頭像已上傳，請儲存友站');
   }catch(err){say(err.message,true);}finally{friendUploads--;picker.disabled=false;picker.value='';refresh();}
  };
  remove.onclick=()=>{avatar.value='';imageUrl.value='';refresh();};
  cols.querySelector('[data-friend-field=name]').addEventListener('input',()=>{if(!avatar.value)refresh();});
  avatarControls.append(preview,label,imageUrl,picker,remove,avatar);row.appendChild(avatarControls);refresh();
  row.appendChild(cols);
  createField(row,'description','簡短介紹（選填）',item.description,true);
  const actions=document.createElement('div');actions.className='friend-actions';
  const action=(label,disabled,callback)=>{
   const button=document.createElement('button');button.className='secondary';button.type='button';
   button.textContent=label;button.disabled=disabled;button.onclick=()=>{if(friendUploads){say('請先等頭像上傳完成',true);return;}callback();};actions.appendChild(button);
  };
  action('上移',index===0,()=>{const all=currentFriendRows();[all[index-1],all[index]]=[all[index],all[index-1]];renderFriendRows(all);});
  action('下移',index===items.length-1,()=>{const all=currentFriendRows();[all[index+1],all[index]]=[all[index],all[index+1]];renderFriendRows(all);});
  action('刪除',false,()=>{const all=currentFriendRows();all.splice(index,1);renderFriendRows(all);});
  row.appendChild(actions);target.appendChild(row);
 });
}
const friendFormKeys=["heading","intro","infoLabel","siteName","siteUrl","siteDescription","siteImage","nameLabel","namePlaceholder","urlLabel","urlPlaceholder","descriptionLabel","descriptionPlaceholder","avatarLabel","avatarPlaceholder","submitLabel","successMessage"];
let friendFormSeq=0;
async function loadFriendForm(){
 const seq=++friendFormSeq;
 el('save-friend-form').disabled=true;
 const data=await api('/api/friend-form');
 if(seq!==friendFormSeq||tab!=='friends')return;
 for(const key of friendFormKeys)el('friend-form-'+key).value=data[key]||'';
 el('save-friend-form').disabled=false;
}
el('friend-form-settings').onsubmit=async e=>{
 e.preventDefault();
 const button=el('save-friend-form');if(button.disabled)return;
 button.disabled=true;
 try{await api('/api/admin/friend-form','PUT',Object.fromEntries(friendFormKeys.map(key=>[key,el('friend-form-'+key).value])));say('申請友站設定已儲存，前台立即更新');}
 catch(err){say(err.message,true);}finally{button.disabled=false;}
};
let savedFriendSnapshot='';
async function loadFriends(){
 const data=await api('/api/friends');
 renderFriendRows(Array.isArray(data.sites)?data.sites:[]);
 savedFriendSnapshot=JSON.stringify(currentFriendRows());
 await loadFriendRequests();
}
async function loadFriendRequests(){
 const data=await api('/api/admin/friend-requests');
 const target=el('friend-requests-list');target.replaceChildren();
 if(!(data.requests||[]).length){const p=document.createElement('p');p.textContent='目前沒有待審核申請。';target.appendChild(p);return;}
 for(const item of data.requests){
  const row=document.createElement('div');row.className='friend-entry';
  const title=document.createElement('strong');title.textContent=item.name;
  const link=document.createElement('a');link.textContent=item.url;link.style.color='#9ecaff';
  try{const u=new URL(item.url);if(['https:','http:'].includes(u.protocol)&&!u.username&&!u.password){link.href=u.href;link.target='_blank';link.rel='noopener noreferrer';}}catch{}
  const desc=document.createElement('p');desc.textContent=item.description;
  const contact=document.createElement('p');contact.textContent=item.contact?'聯絡方式：'+item.contact:'';contact.hidden=!item.contact;
  const imageLink=document.createElement('a');imageLink.textContent='查看申請者提供的圖片 ↗';imageLink.style.color='#9ecaff';imageLink.target='_blank';imageLink.rel='noopener noreferrer';imageLink.hidden=true;
  try{const u=new URL(item.avatar);if(u.protocol==='https:'&&!u.username&&!u.password){imageLink.href=u.href;imageLink.hidden=false;}}catch{}
  const date=document.createElement('small');date.textContent='申請時間：'+new Date(item.created).toLocaleString('zh-TW',{timeZone:'Asia/Taipei',hour12:false});
  const actions=document.createElement('div');actions.className='friend-actions';
  for(const status of ['approved','rejected']){
   const b=document.createElement('button');b.type='button';b.className=status==='rejected'?'secondary':'';b.textContent=status==='approved'?'核准並公開':'拒絕';
   b.onclick=async()=>{
    if(friendUploads){say('請先等頭像上傳完成',true);return;}
    if(JSON.stringify(currentFriendRows())!==savedFriendSnapshot){say('請先儲存下方友站清單的修改，再審核申請',true);return;}
    if(!confirm(status==='approved'?'確定公開這個友站？':'確定拒絕這筆申請？'))return;
    const buttons=Array.from(actions.querySelectorAll('button'));buttons.forEach(x=>x.disabled=true);
    try{await api('/api/admin/friend-requests','PUT',{id:item.id,status});say(status==='approved'?'已核准並公開友站':'已拒絕申請');await loadFriends();}
    catch(err){say(err.message,true);buttons.forEach(x=>x.disabled=false);}
   };
   actions.appendChild(b);
  }
  row.append(title,document.createElement('br'),link,desc,imageLink,contact,date,actions);target.appendChild(row);
 }
}
const footerKeys=['github','email','instagram','discord'];
async function loadFooter(){
 el('save-footer').disabled=true;
 const data=await api('/api/admin/footer-links');
 for(const key of footerKeys)el('footer-'+key).value=data[key]||'';
 el('save-footer').disabled=false;
}
function showPanel(next){
 tab=next;
 for(const b of document.querySelectorAll('nav [data-tab]'))b.setAttribute('aria-current',b.dataset.tab===tab?'page':'false');
 el('documents').classList.toggle('hidden',!['post','work'].includes(tab));
 el('settings-panel').classList.toggle('hidden',!['homepage','about'].includes(tab));
 el('comments-panel').classList.toggle('hidden',tab!=='comments');
 el('friends-panel').classList.toggle('hidden',tab!=='friends');
 el('footer-panel').classList.toggle('hidden',tab!=='footer');
 if(['post','work'].includes(tab))loadDocs().catch(e=>say(e.message,true));
 if(['homepage','about'].includes(tab))loadSettings().catch(e=>say(e.message,true));
 if(tab==='comments')loadComments().catch(e=>say(e.message,true));
 if(tab==='friends'){loadFriends().catch(e=>say(e.message,true));loadFriendForm().catch(e=>say(e.message,true));}
 if(tab==='footer')loadFooter().catch(e=>say(e.message,true));
}
let readAboutForm=null;
let settingsLoadId=0;
function renderAboutForm(target,data){
 const asObject=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:{};
 const asList=v=>Array.isArray(v)?v:[];
 const asText=v=>typeof v==='string'?v:'';
 let controlId=0;
 function field(parent,label,value,options={}){
  const wrap=document.createElement('div');wrap.className='home-field';
  const title=document.createElement('label');title.textContent=label;
  const control=document.createElement(options.choices?'select':options.rows?'textarea':'input');
  control.id='about-field-'+(++controlId);title.htmlFor=control.id;
  if(options.choices){
   const choices=options.choices.slice();
   if(value&&!choices.some(pair=>pair[0]===value))choices.push([value,value]);
   for(const pair of choices){const option=document.createElement('option');option.value=pair[0];option.textContent=pair[1];control.appendChild(option);}
  }else if(options.rows){control.rows=options.rows;}
  else{control.type='text';}
  control.value=asText(value);
  if(options.required)control.required=true;
  if(options.placeholder)control.placeholder=options.placeholder;
  wrap.append(title,control);parent.appendChild(wrap);
  return control;
 }
 function section(label){
  const box=document.createElement('section');box.className='about-form-section';
  const heading=document.createElement('h3');heading.textContent=label;
  box.appendChild(heading);target.appendChild(box);return box;
 }
 function button(label,click,disabled=false){
  const b=document.createElement('button');b.type='button';b.className='secondary';b.textContent=label;b.disabled=disabled;b.onclick=click;return b;
 }
 function repeat(parent,items,addLabel,makeRow,empty){
  const list=document.createElement('div');parent.appendChild(list);
  let rows=[];
  function draw(values){
   list.replaceChildren();rows=[];
   values.forEach((value,i)=>{
    const row=document.createElement('div');row.className='about-repeat-row';
    rows.push(makeRow(row,value));
    const actions=document.createElement('div');actions.className='about-repeat-actions';
    function move(to){const all=read();[all[i],all[to]]=[all[to],all[i]];draw(all);}
    actions.append(button('上移',()=>move(i-1),i===0),button('下移',()=>move(i+1),i===values.length-1),button('刪除',()=>{const all=read();all.splice(i,1);draw(all);}));
    row.appendChild(actions);list.appendChild(row);
   });
  }
  function read(){return rows.map(get=>get());}
  const add=button(addLabel,()=>draw([...read(),empty()]));add.classList.add('about-add');parent.appendChild(add);
  draw(items);return read;
 }
 const profile=asObject(data.profile),website=asObject(data.website);
 const personal=section('個人資料');
 const pageTitle=field(personal,'頁面標題',data.page_title||'關於我',{required:true});
 const name=field(personal,'姓名',profile.name,{required:true});
 const avatar=field(personal,'頭像網址或圖片路徑',profile.avatar_image);
 const preview=document.createElement('img');preview.className='about-avatar-preview';preview.alt='頭像預覽';
 function refreshAvatar(){
  const value=avatar.value.trim();
  preview.hidden=!value;
  if(value)preview.src=value.startsWith('/')?'https://eason-blog-web-live.eason456h.workers.dev'+value:value;
 }
 avatar.addEventListener('input',refreshAvatar);personal.appendChild(preview);refreshAvatar();
 const upload=document.createElement('input');upload.type='file';upload.accept='image/png,image/jpeg,image/webp,image/gif';
 const uploadLabel=document.createElement('label');uploadLabel.textContent='或直接上傳頭像';upload.id='about-avatar-file';uploadLabel.htmlFor=upload.id;personal.append(uploadLabel,upload);
 upload.onchange=async()=>{
  const file=upload.files[0];if(!file)return;
  upload.disabled=true;
  try{
   if(!['image/png','image/jpeg','image/webp','image/gif'].includes(file.type)||file.size>4500000)throw new Error('請選擇 4.5MB 以內的 PNG、JPG、WebP 或 GIF');
   const response=await fetch('/api/admin/media',{method:'POST',credentials:'same-origin',headers:{'Content-Type':file.type},body:file});
   const result=await response.json();if(!response.ok||typeof result.url!=='string'||!result.url.startsWith('https://'))throw new Error(result.error||'圖片上傳失敗');
   avatar.value=result.url;refreshAvatar();say('頭像已上傳，請儲存關於我');
  }catch(err){say(err.message,true);}finally{upload.disabled=false;upload.value='';}
 };
 const legacySpecialties=Array.isArray(profile.specialties)&&profile.specialties.length?profile.specialties:profile.specialty?[profile.specialty]:[];
 const sidebarSections=repeat(section('左側個人資料區塊'),Array.isArray(profile.sidebar_sections)?profile.sidebar_sections:[{title:'專長',items:legacySpecialties}],'＋ 新增標題區塊',(row,value)=>{
  const v=asObject(value);
  const title=field(row,'區塊標題',v.title,{required:true,placeholder:'例如：專長、語言、工具'});
  const items=repeat(row,asList(v.items),'＋ 新增項目',(itemRow,item)=>{
   const control=field(itemRow,'項目',item,{required:true});return ()=>control.value;
  },()=>'');
  return ()=>({...v,title:title.value.trim(),items:items().map(x=>x.trim()).filter(Boolean)});
 },()=>({title:'',items:[]}));
 const originalBody=typeof data.body_text==='string'?data.body_text:asText(data.body_markdown);
 const intro=field(section('自我介紹'),'介紹文字（直接輸入文字，可換行）',originalBody,{rows:5});
 const interestsSection=section('興趣');
 const interestsTitle=field(interestsSection,'區塊標題',data.interests_title||'平常喜歡的事',{required:true});
 const icons=[['code','程式／專案'],['baseball','棒球'],['billiards','撞球'],['anime','動漫'],['game','遊戲'],['other','其他']];
 const interests=repeat(interestsSection,asList(data.interests),'＋ 新增興趣',(row,value)=>{
  const v=asObject(value);
  const icon=field(row,'圖示',v.icon||'other',{choices:icons});
  const title=field(row,'名稱',v.title,{required:true});
  const description=field(row,'介紹',v.description,{rows:2});
  return ()=>({...v,icon:icon.value,title:title.value,description:description.value});
 },()=>({icon:'other',title:'',description:''}));
 const websiteSection=section('關於這個網站');
 const websiteTitle=field(websiteSection,'區塊標題',website.title||'關於這個網站',{required:true});
 const websiteDescription=field(websiteSection,'網站介紹',website.description,{rows:3});
 const linkText=field(websiteSection,'連結文字',website.link_text);
 const linkUrl=field(websiteSection,'連結網址（選填）',website.link_url,{placeholder:'/blog/ 或 https://...'});
 const timelines=repeat(section('時間軸／經歷'),asList(data.timelines),'＋ 新增時間軸區塊',(row,value)=>{
  const v=asObject(value);
  const title=field(row,'時間軸標題',v.title,{required:true});
  const items=repeat(row,asList(v.items),'＋ 新增經歷',(itemRow,item)=>{
   const i=asObject(item);
   const when=field(itemRow,'時間',i.when,{required:true});
   const event=field(itemRow,'事件名稱',i.event,{required:true});
   const result=field(itemRow,'結果／狀態（選填）',i.result);
   const url=field(itemRow,'連結（選填）',i.url,{placeholder:'/experience/... 或 https://...'});
   return ()=>({...i,when:when.value,event:event.value,result:result.value,url:url.value});
  },()=>({when:'',event:'',result:'',url:''}));
  return ()=>({...v,title:title.value,items:items()});
 },()=>({title:'',items:[]}));
 return ()=>{
  const result={...data,page_title:pageTitle.value,profile:{...profile,name:name.value,avatar_image:avatar.value.trim(),sidebar_sections:sidebarSections()},interests_title:interestsTitle.value,interests:interests(),website:{...website,title:websiteTitle.value,description:websiteDescription.value,link_text:linkText.value,link_url:linkUrl.value.trim()},timelines:timelines()};
  // Preserve old formatted content unless the introduction is actually edited.
  if(typeof data.body_text==='string'||intro.value!==originalBody)result.body_text=intro.value;
  return result;
 };
}
async function loadSettings(){
 const currentTab=tab,loadId=++settingsLoadId;
 const save=el('settings-form').querySelector('button[type="submit"]');
 save.disabled=true;readAboutForm=null;
 const target=el('settings-fields');target.replaceChildren();
 const data=await api('/api/admin/settings/'+currentTab);
 if(tab!==currentTab||loadId!==settingsLoadId)return;
 homeData=data;
 el('settings-heading').textContent=tab==='homepage'?'首頁管理':'關於我內容';
 if(tab==='about'){
  if(!data.profile||!data.page_title)throw new Error('無法讀取現有關於我內容，請重新整理，避免覆蓋資料');
  readAboutForm=renderAboutForm(target,data);
  save.disabled=false;
  return;
 }
 save.disabled=false;
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
const inbox={kind:'',slug:'',offset:0,docs:[],owner:null,reply:null,seq:0,hasMore:false,notifications:null};
const inboxNode=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
const inboxKey=d=>d.kind+'/'+d.slug;
const inboxDocLabel=d=>(d.kind==='work'?'作品':'文章')+' · '+(d.title||d.slug)+(Number(d.draft)?'（草稿）':'');
const inboxDate=value=>{const date=new Date(value);return Number.isFinite(date.getTime())?date.toLocaleString('zh-TW',{timeZone:'Asia/Taipei',hour12:false}):'';};
function inboxAvatar(name,url){
 const fallback=inboxNode('span',(name||'訪客').slice(0,1),'inbox-avatar');
 try{
  const parsed=new URL(url);
  if(parsed.protocol==='https:'&&['avatars.githubusercontent.com','lh3.googleusercontent.com','lh4.googleusercontent.com','lh5.googleusercontent.com','lh6.googleusercontent.com'].includes(parsed.hostname)){
   const img=inboxNode('img',undefined,'inbox-avatar');img.src=parsed.href;img.alt='';img.width=38;img.height=38;img.referrerPolicy='no-referrer';img.onerror=()=>img.replaceWith(fallback);return img;
  }
 }catch{}
 return fallback;
}
function renderInboxOwner(){
 const target=el('inbox-owner');target.replaceChildren();
 const owner=inbox.owner;
 if(owner){
  const person=inboxNode('div',undefined,'inbox-person'),info=inboxNode('div');
  info.append(inboxNode('strong',owner.name),inboxNode('small','已連結 '+(owner.provider==='github'?'GitHub':'Google')+' · 後台留言使用此身分'));
  person.append(inboxAvatar(owner.name,owner.avatar),info);target.append(person);
 }else target.append(inboxNode('strong','尚未連結站長留言帳號'),inboxNode('p','連結後即可在後台直接留言、回覆。'));
 el('inbox-pair').textContent=owner?'切換留言帳號':'連結我的留言帳號';
 el('inbox-unpair').classList.toggle('hidden',!owner);
 el('inbox-compose-send').disabled=!owner;
 el('inbox-compose-help').textContent=owner?'以 '+owner.name+' 的身分公開留言':'先連結自己的留言帳號';
}
function renderInboxArticles(){
 const target=el('inbox-articles');target.replaceChildren();
 const query=el('inbox-article-search').value.trim().toLowerCase();
 const items=[{kind:'',slug:'',title:'全部文章與作品',total:inbox.docs.reduce((n,d)=>n+Number(d.total||0),0),unread:inbox.docs.reduce((n,d)=>n+Number(d.unread||0),0)},...inbox.docs.filter(d=>inboxDocLabel(d).toLowerCase().includes(query))];
 for(const d of items){
  const b=inboxNode('button',undefined,'inbox-article');b.type='button';b.setAttribute('aria-current',String(inbox.kind===d.kind&&inbox.slug===d.slug));
  b.append(inboxNode('span',d.kind?inboxDocLabel(d):d.title),inboxNode('small',(Number(d.unread)>0?d.unread+' 未讀 · ':'')+d.total));
  b.onclick=()=>{inbox.kind=d.kind;inbox.slug=d.slug;inbox.offset=0;if(d.kind&&!Number(d.draft)&&!inbox.reply)el('inbox-compose-article').value=inboxKey(d);loadComments().catch(e=>say(e.message,true));};target.append(b);
 }
}
function renderInboxCompose(){
 const select=el('inbox-compose-article'),previous=select.value;
 select.replaceChildren(new Option('選擇要留言的文章／作品',''));
 for(const d of inbox.docs.filter(d=>!Number(d.draft)))select.append(new Option(inboxDocLabel(d),inboxKey(d)));
 select.value=inbox.reply?inbox.reply.kind+'/'+inbox.reply.slug:previous||((inbox.kind&&inbox.slug)?inbox.kind+'/'+inbox.slug:'');
 if(select.selectedIndex<0)select.value='';
 select.disabled=!!inbox.reply;
 el('inbox-reply-target').classList.toggle('hidden',!inbox.reply);
 el('inbox-reply-label').textContent=inbox.reply?'回覆 '+inbox.reply.nickname:'';
 el('inbox-compose-send').textContent=inbox.reply?'送出回覆':'送出留言';
}
function clearInboxReply(){inbox.reply=null;renderInboxCompose();}
function renderInboxComments(comments){
 const target=el('comments-list');target.replaceChildren();
 if(!comments.length){target.append(inboxNode('p','沒有符合條件的留言。'));return;}
 for(const c of comments){
  const box=inboxNode('article',undefined,'inbox-comment');
  const head=inboxNode('div',undefined,'inbox-comment-head'),person=inboxNode('div',undefined,'inbox-person'),info=inboxNode('div');
  const isOwner=inbox.owner&&inbox.owner.provider===c.auth_provider&&inbox.owner.id===c.auth_user_id;
  info.append(inboxNode('strong',c.nickname||'訪客'),inboxNode('small',(c.auth_provider==='github'?'GitHub':c.auth_provider==='google'?'Google':'訪客')+(isOwner?' · 站長':'')));
  person.append(inboxAvatar(c.nickname,c.avatar_url),info);
  const meta=inboxNode('div',undefined,'inbox-comment-meta');
  if(!c.read_at)meta.append(inboxNode('span','● 未讀','inbox-unread'));
  meta.append(inboxNode('span',({approved:'公開',pending:'待審核',hidden:'已隱藏'}[c.status]||c.status)),inboxNode('span',inboxDate(c.created)));
  if(c.answered)meta.append(inboxNode('span','已回覆'));
  head.append(person,meta);box.append(head);
  const article=inboxNode('a',(c.kind==='work'?'作品':'文章')+' · '+(c.article_title||c.slug)+' ↗','inbox-comment-article');
  article.href='https://eason-blog-web-live.eason456h.workers.dev'+(c.kind==='work'?'/experience/':'/blog/')+encodeURIComponent(c.slug)+'/';article.target='_blank';article.rel='noopener noreferrer';box.append(article);
  if(c.parent_id){const parent=inboxNode('div','回覆 '+(c.parent_name||'原留言')+'：'+String(c.parent_body||'').slice(0,160),'inbox-parent');box.append(parent);}
  box.append(inboxNode('p',c.body||''));
  const actions=inboxNode('div',undefined,'actions');
  const action=(label,handler,disabled=false,danger=false)=>{const b=inboxNode('button',label,danger?'danger':'secondary');b.type='button';b.disabled=disabled;b.onclick=async()=>{try{b.disabled=true;await handler();}catch(e){say(e.message,true);}finally{b.disabled=disabled;}};actions.append(b);};
  action('回覆',()=>{inbox.reply=c;renderInboxCompose();el('inbox-compose-body').focus();},!inbox.owner||c.status!=='approved'||!inbox.docs.some(d=>d.kind===c.kind&&d.slug===c.slug&&!Number(d.draft)));
  action(c.read_at?'標為未讀':'標為已讀',async()=>{await api('/api/admin/comment-inbox','PUT',{id:c.id,action:c.read_at?'unread':'read'});await loadComments();});
  action(c.status==='approved'?'隱藏':c.status==='pending'?'核准公開':'恢復公開',async()=>{await api('/api/admin/comment-inbox','PUT',{id:c.id,action:c.status==='approved'?'hidden':'approved'});await loadComments();});
  action('刪除',async()=>{if(!confirm('確定永久刪除 '+(c.nickname||'訪客')+' 的這則留言？其他回覆會保留，此操作無法復原。'))return;await api('/api/admin/comment-inbox','DELETE',{id:c.id});if(inbox.reply?.id===c.id)clearInboxReply();say('留言已刪除');await loadComments();},false,true);
  if(['failed','pending'].includes(c.notification_status))action('重送通知',async()=>{await api('/api/admin/comment-notifications','POST',{id:c.id});say('通知已送出');await loadComments();});
  box.append(actions);target.append(box);
 }
}
async function loadComments(){
 const seq=++inbox.seq,params=new URLSearchParams({offset:String(inbox.offset)});
 if(inbox.kind){params.set('kind',inbox.kind);params.set('slug',inbox.slug);}
 if(el('inbox-status').value)params.set('status',el('inbox-status').value);
 if(el('inbox-search').value.trim())params.set('q',el('inbox-search').value.trim());
 const data=await api('/api/admin/comment-inbox?'+params);
 if(seq!==inbox.seq||tab!=='comments')return;
 inbox.docs=data.documents||[];inbox.owner=data.owner||null;inbox.hasMore=!!data.hasMore;inbox.notifications=data.notifications;
 if(!data.comments.length&&inbox.offset>0){inbox.offset=Math.max(0,inbox.offset-50);return loadComments();}
 renderInboxOwner();renderInboxArticles();renderInboxCompose();renderInboxComments(data.comments||[]);
 const summary=el('inbox-summary');summary.replaceChildren();
 for(const [label,value] of [['全部留言',inbox.docs.reduce((n,d)=>n+Number(d.total||0),0)],['未讀',inbox.docs.reduce((n,d)=>n+Number(d.unread||0),0)],['有留言的文章／作品',inbox.docs.filter(d=>Number(d.total)>0).length]]){const item=inboxNode('span');item.append(inboxNode('strong',String(value)),document.createTextNode(label));summary.append(item);}
 el('inbox-page').textContent='第 '+(Math.floor(inbox.offset/50)+1)+' 頁';el('inbox-prev').disabled=inbox.offset===0;el('inbox-next').disabled=!inbox.hasMore;
 const config=data.notifications?.configured||{};for(const option of el('inbox-channel').options)option.disabled=option.value!=='off'&&!config[option.value];
 el('inbox-channel').value=data.notifications?.channel||'off';
 el('inbox-notification-state').textContent='LINE '+(config.line?'憑證已設定':'尚未設定')+' · Discord '+(config.discord?'憑證已設定':'尚未設定');
 el('inbox-test-channel').disabled=!(config[data.notifications?.channel]);
}
const refreshInbox=()=>loadComments().catch(e=>say(e.message,true));
el('inbox-refresh').onclick=refreshInbox;
el('inbox-article-search').oninput=renderInboxArticles;
el('inbox-status').onchange=()=>{inbox.offset=0;refreshInbox();};
let inboxSearchTimer;el('inbox-search').oninput=()=>{clearTimeout(inboxSearchTimer);inboxSearchTimer=setTimeout(()=>{inbox.offset=0;refreshInbox();},220);};
el('inbox-prev').onclick=()=>{inbox.offset=Math.max(0,inbox.offset-50);refreshInbox();};
el('inbox-next').onclick=()=>{if(inbox.hasMore){inbox.offset+=50;refreshInbox();}};
el('inbox-pair').onclick=async()=>{try{const data=await api('/api/admin/comment-owner','POST',{});const a=el('inbox-pair-link');a.href=data.url;a.classList.remove('hidden');a.textContent='開啟帳號連結頁面（10 分鐘內有效）↗';say('請開啟連結頁面，登入並確認要連結的帳號。');}catch(e){say(e.message,true);}};
el('inbox-unpair').onclick=async()=>{if(!confirm('確定解除站長留言帳號連結？既有留言不會被刪除。'))return;try{await api('/api/admin/comment-owner','DELETE');el('inbox-pair-link').classList.add('hidden');clearInboxReply();await loadComments();}catch(e){say(e.message,true);}};
window.addEventListener('focus',()=>{if(tab==='comments'&&!el('inbox-pair-link').classList.contains('hidden')){api('/api/admin/comment-owner').then(data=>{inbox.owner=data.owner;renderInboxOwner();refreshInbox();}).catch(()=>{});}});
el('inbox-reply-cancel').onclick=clearInboxReply;
el('inbox-compose-form').onsubmit=async event=>{
 event.preventDefault();if(!inbox.owner)return say('請先連結留言帳號',true);
 const select=el('inbox-compose-article'),doc=inbox.docs.find(d=>inboxKey(d)===select.value);
 if(!doc)return say('請選擇文章或作品',true);
 const body=el('inbox-compose-body').value.trim();if(body.length<2)return say('請輸入留言內容',true);
 const b=el('inbox-compose-send');b.disabled=true;
 try{await api('/api/admin/comment-inbox','POST',{kind:doc.kind,slug:doc.slug,body,parent_id:inbox.reply?.id||null});el('inbox-compose-body').value='';clearInboxReply();say('留言已公開');inbox.offset=0;await loadComments();}catch(e){say(e.message,true);}finally{b.disabled=!inbox.owner;}
};
el('inbox-save-channel').onclick=async()=>{try{await api('/api/admin/comment-notifications','PUT',{channel:el('inbox-channel').value});say('通知設定已儲存');await loadComments();}catch(e){say(e.message,true);}};
el('inbox-test-channel').onclick=async()=>{const b=el('inbox-test-channel'),result=el('inbox-notification-result');b.disabled=true;result.style.color='#b8c7df';result.textContent='正在驗證通知服務並傳送測試訊息…';try{await api('/api/admin/comment-notifications','POST',{});result.style.color='#a7dcaa';result.textContent='測試通知已送出，請確認手機。';say(result.textContent);}catch(e){result.style.color='#ffacac';result.textContent=e.message;say(e.message,true);}finally{b.disabled=false;}};
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
document.querySelectorAll('nav [data-tab]').forEach(b=>b.onclick=()=>{if(!docBusy)showPanel(b.dataset.tab);});
el('documents-list').onchange=e=>showDoc(docs.find(d=>d.slug===e.target.value)||null);
el('new-doc').onclick=()=>{el('documents-list').value='';showDoc(null);};
function setDocBusy(value){
 docBusy=value;
 for(const id of ['documents-list','new-doc','save-doc'])el(id).disabled=value;
 el('delete-doc').disabled=value||!el('documents-list').value;
}
el('delete-doc').onclick=async()=>{
 if(docBusy||!['post','work'].includes(tab))return;
 const doc=docs.find(d=>d.slug===el('documents-list').value);if(!doc)return;
 const kind=tab, label=kind==='work'?'作品':'文章';
 if(!confirm('確定永久刪除'+label+'「'+doc.title+'」？該篇留言、瀏覽紀錄及尚未儲存的修改也會移除，無法復原。'))return;
 setDocBusy(true);
 try{await api('/api/admin/content','DELETE',{kind,slug:doc.slug});docs=docs.filter(d=>d.slug!==doc.slug);el('documents-list').value='';showDoc(null);say(label+'已刪除');await loadDocs();}
 catch(e){say(e.message,true);}finally{setDocBusy(false);}
};
el('add-friend').onclick=()=>{if(friendUploads){say('請先等頭像上傳完成',true);return;}renderFriendRows([...currentFriendRows(),{name:'',url:'',description:'',avatar:''}]);};
el('friends-form').onsubmit=async e=>{
 e.preventDefault();
 try{
  if(friendUploads)throw new Error('請先等頭像上傳完成');
  const sites=currentFriendRows().map(site=>({
   name:site.name.trim(),url:site.url.trim(),description:site.description.trim(),avatar:site.avatar
  }));
  if(sites.some(site=>!site.name||!site.url))throw new Error('每個友站都要填名稱和網址');
  await api('/api/admin/friends','PUT',{sites});
  say('友站已儲存，前台立即更新');
  await loadFriends();
 }catch(err){say(err.message,true);}
};
el('document-form').onsubmit=async e=>{
 e.preventDefault();
 if(docBusy)return;
 setDocBusy(true);
 try{
  const payload={
   kind:tab,slug:el('doc-slug').value.trim(),title:el('doc-title').value.trim(),
   date:dateForSave(normalizeDateFields(el('doc-date').value,el('doc-time').value),originalDocDate),
   description:el('doc-description').value,
   categories:parseList(el('doc-categories').value),
   tags:parseList(el('doc-tags').value),
   body_markdown:getEditor().getMarkdown(),
   draft:el('doc-draft').checked,pinned:el('doc-pinned').checked,
  };
  await api('/api/admin/content','PUT',payload);
  say('已儲存至 Cloudflare D1，不需 GitHub / Vercel');
  await loadDocs();el('documents-list').value=payload.slug;showDoc(docs.find(d=>d.slug===payload.slug));
 }catch(err){say(err.message,true);}finally{setDocBusy(false);}
};
el('footer-form').onsubmit=async e=>{
 e.preventDefault();
 const button=el('save-footer');
 if(button.disabled)return;
 button.disabled=true;
 try{
  const data=Object.fromEntries(footerKeys.map(key=>[key,el('footer-'+key).value.trim()]));
  await api('/api/admin/footer-links','PUT',data);
  say('頁尾連結已儲存，重新整理前台即可看到更新');
 }catch(err){say(err.message,true);}
 finally{button.disabled=false;}
};
el('settings-form').onsubmit=async e=>{
 e.preventDefault();
 try{
  let data;
  if(tab==='about'){if(!readAboutForm)throw new Error('請先載入關於我內容');data=readAboutForm();}
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
