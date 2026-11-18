# 個人網站內容管理（Sveltia CMS）

後台：**https://eason-blog.vercel.app/admin/**

這個後台直接編輯 `eason11133/eason-blog` 的 GitHub 內容；文章、作品和關於我的原有 Markdown 都保留，不需要轉移資料庫。

## 第一次登入（只在你自己的裝置操作）

1. 開啟上面的 `/admin/`，選 **Sign In with Token**。
2. 依登入畫面提供的 GitHub 連結建立 **Fine-grained personal access token**，Repository 選 **Only select repositories → eason-blog**。
3. 權限只給此 repo 的 **Contents: Read and write**（Metadata 為預設唯讀）。選擇合理的到期日，保存設定後將 Token 貼在你自己的後台登入視窗。
4. **不要把 Token 貼到聊天、GitHub 程式碼、文章或截圖中。** 換裝置可能需要重新登入。

由於 GitHub 尚未提供純瀏覽器 PKCE 給這類 CMS 使用，現階段採用官方支援的 Token 登入，不用額外架 OAuth 伺服器。網站訪客無須登入也看不到你後台的內容管理權限。

## 日常使用

- **首頁**：直接改問候語、背景圖片、狀態標題、三色標籤、狀態文字、兩個文章區的標題。首頁原本的外觀和星空特效不變。
- **文章**：新增或編輯心得。可以從工具列插入圖片、程式碼和表格；可貼上／拖曳圖片；需要 Markdown 時切 Raw 模式。
- **作品**：用同一個編輯器管理作品的標題、內文、標籤及發布狀態。
- **關於我**：調整大頭照、專長、興趣、文章內容和時間軸。
- **首頁置頂文章**：在「文章」中將 `pinned` 開啟；「最近更新」會自動從未置頂的已發布文章取最新一篇，不用手動填。
- **圖片**：上傳至 `public/image`，文章內直接插入。儲存後會跟其他 Markdown 一樣提交到 GitHub，Vercel 再進行部署。

## 發布與備份

- 開著「草稿」就不會顯示在網站；正式發布時至少要有一個分類及一個標籤。
- 改動內容時注意日期和文章網址。既有檔名沒有搬動，既有網址不變。
- Sveltia 在「外觀設定」可以選 Dark 和繁體中文，不必修改網站 CSS。
- GitHub 保留每次編輯紀錄，可以從提交歷史還原誤刪的內容。
- 若 Vercel 顯示建置次數限制，GitHub 內容已提交但網站可能不會立刻更新。請先確認部署成功再判斷是否生效。

Sveltia CMS 官方文件：
https://sveltiacms.app/en/docs/start
https://sveltiacms.app/en/docs/backends/github
https://sveltiacms.app/en/docs/fields/richtext
