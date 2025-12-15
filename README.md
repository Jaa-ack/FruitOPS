<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>
## 在本機執行與部署指南（繁體中文）

以下包含如何在本機執行、如何在 Supabase 建表並用 GitHub Actions seed、以及如何把專案部署到 Vercel（一步步可複製貼上的指令）。

註：務必保護秘密金鑰（如 `SUPABASE_SERVICE_KEY`、`GEMINI_API_KEY`），請把它們放在平台的 Secret/Environment Variables 中，絕對不要 commit 到 repo。

### 快速本機驗證（最少步驟）

1. 安裝相依：

```bash
npm install
npm --prefix server install
```

2. 設定 server env 並 seed（本機）:

```bash
cp server/.env.example server/.env
# 編輯 server/.env，填入 GEMINI_API_KEY（若有）與 SUPABASE_*（選用）
npm --prefix server run seed
```

3. 啟動後端（Terminal A）:

```bash
npm --prefix server run dev
```

4. 啟動前端（Terminal B）:

```bash
npm run dev
```

5. 檢查健康狀態（確保 server 運作）:

```bash
curl http://localhost:4000/healthz
# 應回傳 {"status":"ok"}
```

6. 建置前端以確認 production build 正常：

```bash
npm run build
```

### Supabase（選用：若要公開服務建議使用）

1. 在 Supabase 建專案並取得 `SUPABASE_URL` 與 `SUPABASE_SERVICE_KEY`。
2. 在 Supabase SQL Editor 執行以下 CREATE TABLE：

```sql
create table if not exists plots (id text primary key, name text, crop text, area text, status text, health int);
create table if not exists logs (id text primary key, date date, plotId text, activity text, cropType text, notes text, cost numeric, worker text);
create table if not exists inventory (id text primary key, productName text, grade text, quantity int, location text, harvestDate date);
create table if not exists orders (id text primary key, customerName text, channel text, items text, total numeric, status text, date date);
create table if not exists customers (id text primary key, name text, phone text, segment text, totalSpent numeric, lastOrderDate date);
```

3. 如果要用 GitHub Actions seed（repo 已包含手動觸發的 workflow），請在 GitHub Repo 設定 Secrets 並到 Actions 觸發 `Seed Supabase` workflow。

### 部署到 Vercel（建議）

1. 在 GitHub push 你的程式碼（你已完成）。
2. 登入 Vercel → Import Project → 選你的 repo。
3. 在 Vercel 專案設定 → Environment Variables（標為 Secret）加入：
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`（**server-only**）
   - `GEMINI_API_KEY`（**server-only**）
4. Deploy，Vercel 會自動建立前端與 serverless API (`/api/*`)。

驗證部署：

```bash
curl https://<your-vercel>.vercel.app/api/healthz
curl https://<your-vercel>.vercel.app/api/plots | jq '.[0]'
```

### 我幫你已完成的項目（在 repo 中）
- 移除會把 `GEMINI_API_KEY` 注入前端的設定（`vite.config.ts`）。
- 新增 GitHub Actions workflow：`.github/workflows/seed-supabase.yml`（可手動觸發 seed）。
- 新增本地與部署中文說明（`README.zh-TW.md`，並把上面內容同步到 `README.md`）。

### 還需你執行或確認的項目（建議優先順序）
1. **確認是否需旋轉 Supabase Service Role Key**（若 `server/.env` 曾被公開或 commit 過，請即刻在 Supabase Console 重設 Key）。
2. 在 GitHub Repo 設定 Secrets：`SUPABASE_URL`、`SUPABASE_SERVICE_KEY`、`GEMINI_API_KEY`。
3. 在 Vercel 專案設定同樣加入上面的 Environment Variables（用來在 runtime 為 serverless function 提供 key）。
4. 在 GitHub Actions 中手動執行 `Seed Supabase` workflow（若你沒在 Supabase Console 用 SQL 建表）。
5. 部署後測試 API 與前端，將發現的錯誤回報給我，我會協助修正。

---

如果你要我幫你把 `README.md`（主檔）直接替換成這個中文版本，我已經替你處理並 push 到遠端（現在 `README.md` 已為繁體中文）。

接下來我可以：
- 幫你在 Vercel 建專案並設定 Secrets（需要你在 Vercel 同意或執行），或我提供一步步指令讓你自己執行。 
- 幫你在 Supabase 旋轉 key、或在 GitHub 秘密中新增 Secrets。 

請告訴我你要我做哪一件（或多件），我就開始下一步。 

