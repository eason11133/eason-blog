# Cloudflare 前台隔離測試部署

這個資料夾只負責讓既有 Astro 個網的完整靜態版本先在 Cloudflare Workers Static Assets 上測試，確認排版、星空、圖片、搜尋 UI、文章與作品現有網址在不經 Vercel 的情況下可正常呈現。

## 安全界線

- Worker 名稱是 `eason-blog-web-preview`，**與現有 CMS API Worker `eason-blog` 不同**；此處不得改成 `eason-blog`。
- 本版本**僅部署 Astro 已建構的靜態頁面**；不包含 D1 即時讀取、後台路由、留言發表或 SSR。請勿把靜態預覽誤認為完整的 Cloudflare 遷移。
- GitHub 原始碼、Vercel 正式網址以及現有 D1、KV、Secrets 都保持不變。
- 不要在新 Worker 設定 CMS 密碼；管理後台仍在 `https://eason-blog.eason456h.workers.dev/admin/`。

## 建立純 Cloudflare 前台預覽

在專案根目錄：

```bat
git pull
npm run build
npx --yes wrangler@latest deploy --config cloudflare/site/wrangler.jsonc
```

這些指令不會修改 `eason-blog` Worker。由於 config 的 `assets.directory` 指向 `../../dist`，必須先成功執行 `npm run build`。

成功後 Wrangler 會印出 `https://eason-blog-web-preview.<你的 workers.dev 子網域>/`。預覽的 canonical metadata 暫時仍沿用原站；在正式切換前須一併修正。

## 下一步（尚未完成）

完整遷移仍須 Cloudflare 動態渲染、從 D1 讀取首頁／關於我／文章／作品，讓搜尋、標籤、RSS、留言、文章 URL、媒體與 CMS 在同一個 Cloudflare 站點運作。不能只新增 Workers Static Assets 就關掉 Vercel。正式切換前須先在隔離網址端到端驗收。
