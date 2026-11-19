# Cloudflare 內容後端（獨立測試區）

## 目的及現況

這是把 `eason-blog` 文章、作品、首頁、關於我及留言改成 **Cloudflare Workers + D1** 的第一階段程式。日常儲存不經 GitHub，也不會觸發 Vercel。
目前網站仍在原 Vercel 上，**沒有切換網站流量，也沒有刪掉 Sveltia 資料**。本資料夾不是已上線的替代後台。

Cloudflare Workers 提供公開讀取 API、經驗證的儲存 API、留言審核及媒體上傳服務。既有 Astro 6 的內容頁、搜尋、RSS 和首頁尚須改成動態讀取 D1；只有這步完成並驗收後才能切換 Workers 網站。

## 不付費路徑

- Workers 免費方案處理請求
- D1 免費方案儲存文章、留言、設定
- KV 免費方案先儲存圖片（帳號合計 1 GB 儲存，寫入與讀取也有限額；圖片寫入跨節點可有短暫延遲）
- 不使用 R2、不購買網域、不升級方案、不建立付費資源
- 免費 `workers.dev` 網址會由你自己的 Cloudflare 帳號設定，**不是現在就能推定的網址**

## 建立 Cloudflare 測試環境（需要帳號持有人操作）

1. Cloudflare Workers & Pages 選免費方案，建立 D1 `eason-blog-content` 和 KV `EASON_MEDIA`。
2. 複製兩個 ID 到 `cloudflare/cms/wrangler.jsonc`（此檔目前放的是佔位符，禁止在填入真 ID 前部署）。
3. 在 repo 根目錄執行 `npx wrangler d1 migrations apply eason-blog-content --config cloudflare/cms/wrangler.jsonc --remote`。
4. 在 repo 根目錄執行 `npx wrangler secret put CMS_ADMIN_PASSWORD --config cloudflare/cms/wrangler.jsonc`，輸入一組強密碼。
5. 執行 `npx wrangler secret put CMS_SESSION_SECRET --config cloudflare/cms/wrangler.jsonc`，輸入獨立高熵隨機字串，兩者不可貼到 GitHub 或 ChatGPT。
6. 執行 `npx wrangler deploy --config cloudflare/cms/wrangler.jsonc`。目前這個項目提供獨立的 API 與 `/admin/` 測試後台；完成前不要把原網站網址轉過去。

如果改用 CLI 建立：`npx wrangler d1 create eason-blog-content`，`npx wrangler kv namespace create EASON_MEDIA`，將輸出的 ID 填入設定。請務必確認介面仍是 Free，避免任何付費選項。

## 資料匯入與編輯器

- 執行 `node cloudflare/cms/export-seed.mjs > cloudflare-seed.sql` 匯出 **現有** Markdown、作品、首頁及關於我資料；腳本不會修改資料庫。
- 確認輸出後，再執行 `npx wrangler d1 execute eason-blog-content --config cloudflare/cms/wrangler.jsonc --remote --file=cloudflare-seed.sql`。使用 `INSERT OR IGNORE`，避免重新匯入覆蓋後台已修改的內容。
- `https://<你的 Cloudflare Worker 網址>/admin/` 會顯示獨立的深色管理介面，編輯器採免費開源 **TOAST UI Editor**，可選所見即所得或 Markdown，也支援圖片、表格、程式碼。這是新架構的測試後台，不是把 Sveltia 直接接到 D1。
- 重要：原 Astro 的渲染、搜尋、RSS 等尚未換成 D1 動態資料來源，不能只靠 API 上線就宣布遷移完成。

## API 方向

- `GET /health`：基本健康檢查
- `GET /api/posts`、`GET /api/works`、`GET /api/posts/{slug}`：訪客只能看到已發布內容
- `GET /api/homepage`、`GET /api/about`：前台資料
- `GET /api/comments?kind=post&slug=...`：已核准留言
- `POST /api/comments`：匿名留言，預設 pending、經管理員審核後顯示
- `POST /api/admin/login`：密碼登入，HttpOnly Cookie；僅同來源寫入
- `GET /api/admin/me`：檢查登入
- `GET/PUT /api/admin/content`、`GET/PUT /api/admin/settings/{key}`：後台讀寫
- `GET/POST /api/admin/comments`：留言審核
- `POST /api/admin/media`：已登入後上傳圖片到免費 KV，限制大小與 MIME 類型

## 尚未完成的項目

- 實際 Cloudflare 帳號開通、D1/KV ID、密碼及部署：本對話無法代替你的帳號授權。
- 安全性／端到端驗收（登入、留言防垃圾、上傳、編輯器）、舊 Markdown 和首頁內容匯入。
- Astro 全站改成在 Workers SSR 讀 D1；站內搜尋、RSS、原文章網址都要一起驗證。
- 公開寫入 API 上線前應補強防濫用機制（Cloudflare Turnstile、防機器人及流量規則）。

**禁止將現有 Vercel 正式網域直接換到此 Worker API，直到整個網站、後台與資料移轉驗收完成。**
