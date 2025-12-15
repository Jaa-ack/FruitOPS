# 本地執行與部署指南（繁體中文）

以下為完整可執行的步驟，幫助你把本專案在本機跑起來並部署到網路（建議使用 Vercel + Supabase）。

## 本機執行（快速步驟）

1. 安裝相依
```bash
npm install
npm --prefix server install
```

2. 設定 server env（在 `server/.env`）並 seed
```bash
cp server/.env.example server/.env
# 在 server/.env 中填入 GEMINI_API_KEY 與 SUPABASE_*（如使用 Supabase）
npm --prefix server run seed
```

3. 啟動後端（Terminal #1）
```bash
npm --prefix server run dev
```

4. 啟動前端（Terminal #2）
```bash
npm run dev
```

5. Build 前端（檢查是否能成功打包）
```bash
npm run build
```

## 部署到 Vercel + Supabase（建議）

1. 在 Supabase Console 建專案並建立資料表（見 README.sql）
2. 在 Vercel Import Project（選 GitHub repo）
3. 在 Vercel Project Settings → Environment Variables 加入（Secret）：
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY` (server-only)
   - `GEMINI_API_KEY` (server-only)
4. Deploy 並驗證公開 URL

## 安全與注意事項
- **不要**把任何 Service Role Key 或 GEMINI API Key 放到前端或 commit 到 repo。
- 我已把 `server/.env` 加入 `.gitignore`，但如果曾被 commit，請在 Supabase Console 旋轉該 key。

## 自動 seed（GitHub Actions）
- Repo 已加入一個手動觸發 workflow: `.github/workflows/seed-supabase.yml`，可在 GitHub Actions 手動執行來 seed Supabase（需在 repo 的 Secrets 加上 `SUPABASE_URL` 與 `SUPABASE_SERVICE_KEY`）。

---

若你要我繼續幫你：我可以幫你匯入 Vercel、設定 Secrets（只需你授權或在 Vercel 上執行），並在部署後協助驗證（包含 `/api/plots`、`/api/healthz`、`/api/ai` 等）。
