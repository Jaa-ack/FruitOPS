<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1BmHeMWYuAWbAf5u_gXIeMRQI4SKqFBaa

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Start the backend server (in a separate terminal)
   - Install server deps: `npm --prefix server install`
   - Copy `server/.env.example` -> `server/.env` and fill `GEMINI_API_KEY` with your key
   - Seed database: `npm --prefix server run seed`
   - Start server in dev: `npm --prefix server run dev` (or `npm --prefix server start`)
      - Run server tests: `npm --prefix server test` (會執行 Jest 的 API tests)
      - 健康檢查: 啟動 server 後，檢查 `http://localhost:4000/healthz` 返回 `{status: 'ok'}`
   
   Optional: Use Supabase (recommended for public deployment)

   - Create a Supabase project (https://supabase.com) and note the Project URL and Service Role Key
   - In Supabase SQL editor, run the following CREATE TABLE statements to prepare the schema:

```sql
create table if not exists plots (id text primary key, name text, crop text, area text, status text, health int);
create table if not exists logs (id text primary key, date date, plotId text, activity text, cropType text, notes text, cost numeric, worker text);
create table if not exists inventory (id text primary key, productName text, grade text, quantity int, location text, harvestDate date);
create table if not exists orders (id text primary key, customerName text, channel text, items text, total numeric, status text, date date);
create table if not exists customers (id text primary key, name text, phone text, segment text, totalSpent numeric, lastOrderDate date);
```

   - Add Supabase env vars to your server:
     - `SUPABASE_URL` = your project URL (e.g. https://xxxx.supabase.co)
     - `SUPABASE_SERVICE_KEY` = your service role key (keep secret)
     - `GEMINI_API_KEY` = your Gemini API key
   - Seed Supabase with our sample data:
     - `npm --prefix server run seed:supabase`
3. Run the frontend in another terminal:
   - `npm install` (if you haven't already)
   - `npm run dev` (Vite will proxy `/api` to `http://localhost:4000`)

   ## 開發與品質保證

   - 本地 API 測試：`npm --prefix server test`
   - 前端建置驗證：`npm run build`
   - CI: 已加入 GitHub Actions 範例（會執行 frontend build，並可手動觸發 Supabase seed）

## Deploy (Recommended: Vercel + Supabase free tier)

   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY` (server side only)
   - `GEMINI_API_KEY` (server side only)

On Vercel you can either:

We added a simple Vercel setup which exposes the API via a serverless function (`/api/index.js`). To deploy to Vercel (recommended) follow these steps:

1. Commit and push your code to GitHub.
2. On Vercel, click "Import Project" → select your GitHub repo.
3. In Project Settings > Environment Variables add:
   - `SUPABASE_URL` (client public)
   - `SUPABASE_SERVICE_KEY` (server-only)
   - `GEMINI_API_KEY` (server-only)
4. Deploy. Vercel will build the frontend and create a serverless API at `/api/*` that wraps the Express app.

Notes:
- The repo includes `vercel.json` and an `api/index.js` wrapper using `serverless-http` so the same Express app runs as a Vercel Serverless Function.
- Keep Service Role Key and Gemini API key secret (set them as environment variables in Vercel; do not commit them).

Notes:
- Use the Service Role Key only on the server (never expose it to the browser).
- Lowdb (`server/db.json`) remains for local dev fallback when Supabase env vars are not set.
