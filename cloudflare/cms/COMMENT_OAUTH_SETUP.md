# 個網留言系統：GitHub／Google OAuth 最後設定

## 已完成（不需要重做）

- Cloudflare Workers + D1：公開留言、文章／作品留言、登入狀態、回覆、後台管理
- 留言送出立即公開；後台可隱藏與恢復，舊版待審留言保留
- 使用 GitHub 或 Google 帳號的公開名稱與頭像，無須索取 email
- OAuth 的 state 驗證、簽署的 HttpOnly 訪客 Cookie、登出、IP 速率限制
- GitHub Actions 自動執行程式檢查、D1 migrations、前台與 CMS 部署
- 新版登入與留言功能在 OAuth 平台正式授權前保持關閉，不開放匿名發文

## 等確認網站正式網址後，只需做這幾件事

### A. 更新唯一站址設定

在 `cloudflare/site-config.mjs` 裡的 `COMMENT_PUBLIC_SITE_ORIGIN` 換成**最後決定的 HTTPS 網站來源**，例如 `https://blog.example.com`（不要加最後的斜線，也不要帶文章路徑）。`BLOG_CMS_ORIGIN` 不用改。

這個設定會同時提供前台 Astro 的正式站址與 GitHub／Google OAuth 回呼，避免兩個地方不同步。改檔提交 GitHub `main` 後，Cloudflare 自動部署。

### B. 建立 GitHub OAuth App

前往 https://github.com/settings/developers → OAuth Apps → New OAuth App。

- Homepage URL：`你的正式站址/`
- Authorization callback URL：`你的正式站址/api/auth/github/callback`
- Name：`Eason Blog Comments`

建立後保留 Client ID 和 Client Secret，**不要貼到 GitHub 程式碼或對話中**。

### C. 建立 Google OAuth Client

前往 https://console.cloud.google.com/auth/overview → Branding／Audience／Clients。

- Application type：Web application
- Authorized JavaScript origins：`你的正式站址`（如果畫面要求）
- Authorized redirect URI：`你的正式站址/api/auth/google/callback`
- Scopes：`openid profile`（不需要 email）
- Audience：External，依 Google Console 畫面將應用發布給一般使用者；Testing 階段只限測試使用者

建立後保留 Client ID 和 Client Secret。

### D. 設定 Cloudflare CMS Worker 的四個 Secret

Cloudflare Dashboard → Workers & Pages → `eason-blog`（不是 `eason-blog-web-live`）→ Settings → Variables and Secrets，新增下列 4 筆，類型設為 **Secret**，儲存並套用：

| Secret Name | 填入 |
| --- | --- |
| `GITHUB_OAUTH_CLIENT_ID` | GitHub Client ID |
| `GITHUB_OAUTH_CLIENT_SECRET` | GitHub Client Secret |
| `GOOGLE_OAUTH_CLIENT_ID` | Google Client ID |
| `GOOGLE_OAUTH_CLIENT_SECRET` | Google Client Secret |

一開始也可以先設定 GitHub 的兩筆；沒有完整 ID+Secret 的登入方式會自動隱藏。

這四筆是 Cloudflare CMS Worker 的訪客登入設定，**與 GitHub Actions 既有的 `CLOUDFLARE_API_TOKEN`／`CLOUDFLARE_ACCOUNT_ID` 不同**。後兩筆已經設定好，不要動。

### E. 驗收（確定 OAuth 設定之後）

1. 開文章頁 → 用 GitHub 或 Google 登入，回到**同一篇文章**。
2. 顯示帳號名稱及頭像，送出留言應立即顯示。
3. 重新整理仍可看見、可回覆其他留言；登出後不能再發文。
4. 後台 `/admin/` → 留言管理 → 隱藏，前台刷新不可見；按恢復公開後可見。
5. 兩個登入提供者都驗證一次。測試普通訪客的 Google 帳號，而不只是 Google Cloud 測試使用者。
6. GitHub Actions `Deploy Eason blog to Cloudflare` 中前台、後台和登入 API 健康檢查需成功。

## 技術備註

- Cookie 由 Cloudflare CMS Worker 用 `CMS_SESSION_SECRET` 簽署，透過前台同來源 API 代理設為瀏覽器 HttpOnly Cookie，與管理員 `eason_cms` Cookie 分離。
- 訪客留言內容寫入 D1 `comments`，`status='approved'` 直接公開；後台仍可隱藏或恢復。
- IP 留言速率限制為每 15 分鐘最多 5 次嘗試；已核准的留言只有最多 250 筆會顯示（舊資料保留）。
- 若最終網站仍使用 `workers.dev`，就直接用 `cloudflare/site-config.mjs` 內目前的網址填入上面的回呼設定。
- 如果只更換網站網域而不移動 CMS Worker／D1，就**不需要重建資料庫、重設 Cloudflare 自動部署 Token、重新匯入文章**。
