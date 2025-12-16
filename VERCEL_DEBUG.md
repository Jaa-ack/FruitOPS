# Vercel 部署問題診斷

## 🚨 當前問題
`/api/plots` 和 `/api/health/deps` 都逾時（10秒無回應）

## 🔍 可能原因

### 1. Vercel 環境變數問題（最可能）

**檢查清單：**
- [ ] `SUPABASE_URL` = `https://vebgryuskpqtnlzalppc.supabase.co`
- [ ] `SUPABASE_SERVICE_KEY` = 完整的 JWT token（以 `eyJ` 開頭）
- [ ] `DISABLE_LOCAL_DB` = `1`
- [ ] `GEMINI_API_KEY` = AI key
- [ ] **所有變數的 Scope 都勾選：Production, Preview, Development**

**常見錯誤：**
- ❌ 只勾選了 Production，沒勾選 Preview
- ❌ SUPABASE_SERVICE_KEY 複製不完整
- ❌ 有空格或換行符

### 2. Supabase 專案暫停

前往 [Supabase Dashboard](https://app.supabase.com/project/vebgryuskpqtnlzalppc) 確認：
- 專案狀態為 **Active**（不是 Paused）
- Database 頁面能正常開啟
- 嘗試在 SQL Editor 執行 `SELECT 1;` 測試連線

### 3. Vercel 部署未更新

**立即檢查：**
```bash
# 查看 Vercel 是否使用了最新的 commit
curl -s https://fruit-ops.vercel.app/api/healthz | jq .
```

如果看到 `"environment":"vercel"` 但沒有新的 timeout 保護，表示：
- Vercel 還在用舊版本
- 需要手動 Redeploy

**解決步驟：**
1. Vercel Dashboard → Deployments
2. 找到最新的部署（應該有 commit: `fix: add timeout protection...`）
3. 如果沒有，點擊右上角 **Redeploy** → **Use existing Build Cache**

## 🧪 手動測試步驟

### 測試 1：基本連線
```bash
curl https://fruit-ops.vercel.app/api/healthz
# 預期：立即回應 {"status":"ok",...}
```

### 測試 2：Supabase 連線（會逾時或回傳錯誤）
```bash
curl --max-time 12 -v https://fruit-ops.vercel.app/api/plots 2>&1 | grep -E "(HTTP|error|504)"
# 如果 12 秒後仍無回應 → Function 在載入時就卡住
# 如果看到 504 → 新代碼生效，但 Supabase 仍然逾時
# 如果看到 503 → DISABLE_LOCAL_DB=1 生效，但 Supabase 無法連線
```

### 測試 3：檢查 Supabase 可達性
```bash
curl -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlYmdyeXVza3BxdG5semFscHBjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTc0MTI5OCwiZXhwIjoyMDgxMzE3Mjk4fQ.OcCZQw7CprfM4V3APd1VhNqSLPZDpzvxi-pZdgy_QwM" \
  https://vebgryuskpqtnlzalppc.supabase.co/rest/v1/plots
# 預期：回傳 plots 資料或 401/403 錯誤
# 如果逾時 → Supabase 本身有問題
```

## 🛠 立即修正方案

### 方案 A：強制 Redeploy（推薦）

1. Vercel Dashboard → 您的專案
2. **Settings** → **Environment Variables**
3. 確認 4 個變數都存在且 Scope 正確
4. 如果缺少或錯誤，新增/修改後點 **Save**
5. **Deployments** → 點擊最新部署的 **⋯** → **Redeploy**
6. 等待 2-3 分鐘

### 方案 B：觸發新 Commit

```bash
# 空 commit 觸發重新部署
git commit --allow-empty -m "chore: trigger Vercel redeploy"
git push
```

### 方案 C：測試本地 Supabase 連線

```bash
# 在本地執行（確認 server/.env 已設定）
cd /Users/jaaaaack/VSCode/FruitOPS
set -a
source server/.env
set +a
npm run dev:server &
sleep 3
curl http://localhost:4000/api/plots
# 如果本地正常但 Vercel 失敗 → 環境變數問題
```

## 📋 回報資訊

如果問題持續，請提供以下資訊：

1. **Vercel Environment Variables 截圖**（Settings → Environment Variables）
2. **Vercel Function Logs**（Deployments → 最新部署 → Functions → api/index.cjs）
3. **測試 3 的結果**（Supabase 直接 API 測試）
4. **本地測試結果**（方案 C）

根據這些資訊可以精確判斷是：
- ✅ 環境變數設定錯誤
- ✅ Supabase 專案本身有問題
- ✅ Vercel 部署配置問題
- ✅ 程式碼邏輯問題
