# 留言使用 GitHub / Google 登入設定

這次是改 Cloudflare 動態站的留言功能，文章和既有留言資料都保留。新留言登入後直接公開，不需要審核；仍可在 /admin/ 隱藏。

## 建立 GitHub OAuth App
GitHub Settings → Developer settings → OAuth Apps → New OAuth App。
Homepage URL: https://eason-blog-web-live.eason456h.workers.dev
Authorization callback URL: https://eason-blog-web-live.eason456h.workers.dev/api/auth/github/callback

## 建立 Google OAuth Client
Google Cloud Console → Google Auth Platform → Clients → Create client → Web application。
Authorized redirect URI: https://eason-blog-web-live.eason456h.workers.dev/api/auth/google/callback
Scopes: openid profile。若 OAuth consent screen 是 Testing，僅測試使用者可登入；要公開開放需發布。

## Cloudflare CMS Worker Secrets（切勿貼進聊天、GitHub）
從 CMD 專案根目錄執行，每項會提示輸入值：
```bat
node_modules\.bin\wrangler.cmd secret put GITHUB_OAUTH_CLIENT_ID --config cloudflare/cms/wrangler.jsonc
node_modules\.bin\wrangler.cmd secret put GITHUB_OAUTH_CLIENT_SECRET --config cloudflare/cms/wrangler.jsonc
node_modules\.bin\wrangler.cmd secret put GOOGLE_OAUTH_CLIENT_ID --config cloudflare/cms/wrangler.jsonc
node_modules\.bin\wrangler.cmd secret put GOOGLE_OAUTH_CLIENT_SECRET --config cloudflare/cms/wrangler.jsonc
```
可只設定其中一組；未設定的登入方式不顯示。不要修改既有 CMS_SESSION_SECRET 或 CMS_ADMIN_PASSWORD。

## 先遷移 D1，再部署 CMS Worker 和前台 Worker
```bat
git pull
node_modules\.bin\wrangler.cmd d1 migrations apply eason-blog-content --config cloudflare/cms/wrangler.jsonc --remote
node_modules\.bin\wrangler.cmd deploy --config cloudflare/cms/wrangler.jsonc
npm install --no-save --package-lock=false @astrojs/cloudflare@13.7.0
node cloudflare/live-site/build.mjs
node cloudflare/live-site/prepare-deploy.mjs
node_modules\.bin\wrangler.cmd deploy --config dist-cloudflare/server/wrangler.json
```
如果 migration 失敗，先停止部署並處理錯誤；不會清空 D1。

## 驗收
登入後應看到名稱與頭像，送出留言後立刻顯示，重新整理仍存在；回覆與登出也要測。未登入送出會收到 401。後台隱藏留言後不應再公開。舊 pending 留言維持 pending，不會突然公開。

OAuth state 和登入 Cookie 都由 CMS Worker 簽署，透過前台同源代理設置，登入資料不會給瀏覽器的 JavaScript 直接讀取。
未來如果換自訂網域，必須同步修改 OAuth callback URL，並設置 COMMENT_SITE_ORIGIN 為新的 HTTPS 前台來源。
