# Eason 個網：Cloudflare 動態前台（隔離驗證）

這是新建的 **SSR 動態版本**，不是既有純靜態 `eason-blog-web-preview`。沿用原本 Astro UI 與星空元件，讀取現有 CMS Worker 所連接的 D1，不在文章儲存時觸發 GitHub 或 Vercel。

- CMS Worker（保持不動）：`eason-blog.eason456h.workers.dev`
- 現有靜態前台（保持不動）：`eason-blog-web-preview.eason456h.workers.dev`
- 新的 SSR 前台：`eason-blog-web-live.eason456h.workers.dev`，待測試通過後再考慮正式切換。

## 安全部署

> 目前不覆蓋正式站，也不覆蓋 CMS Worker。

部署設定現在放在專案根目錄的 `wrangler.live.jsonc`，避免 Wrangler 把套件入口相對於 `cloudflare/live-site/` 誤認成檔案路徑。請在專案根目錄執行：

```bat
git pull
npm install --no-save --package-lock=false @astrojs/cloudflare@13.7.0
node cloudflare/live-site/build.mjs
node_modules\\.bin\\wrangler.cmd deploy --config wrangler.live.jsonc
```

後續需將 adapter 寫入專案依賴與 lockfile，並建立 Cloudflare 自動部署。目前仍需人工執行一次部署和驗證。

### 驗證重點

1. 新增／修改／發布文章或作品後，無須重新建構，Cloudflare 動態前台重新整理就看得到。
2. 草稿不可公開；文章網址可直接存取，404 不漏草稿。
3. 首頁、關於我、標籤、分頁、搜尋索引和 RSS 讀取 CMS，維持同一個 UI。
4. 專案圖片（舊的 public 路徑與後台 /media 連結）均正常。
5. 留言系統與 CMS 後台的網址和 API 需整合；在此驗證完成前，不要移除 Vercel。
