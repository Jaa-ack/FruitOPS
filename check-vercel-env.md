# Vercel 環境變數檢查清單

請前往 Vercel Dashboard 確認以下設定：

## 📍 位置
**Settings** → **Environment Variables**

## ✅ 必須設定的變數

1. **SUPABASE_URL**
   - Value: `https://vebgryuskpqtnlzalppc.supabase.co`
   - Environments: ☑️ Production, Preview, Development

2. **SUPABASE_SERVICE_KEY**
   - Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (完整的 JWT token)
   - Environments: ☑️ Production, Preview, Development

3. **GEMINI_API_KEY**
   - Value: `AIzaSyCdpDxH2RwGMIRVUJvTJxJwANU5lujWZoU`
   - Environments: ☑️ Production, Preview, Development

4. **DISABLE_LOCAL_DB** (重要!)
   - Value: `1`
   - Environments: ☑️ Production, Preview, Development

## 🔄 設定完成後
1. 點擊 **Save**
2. 前往 **Deployments** → 點擊最新部署的三個點 → **Redeploy**
3. 等待 1-2 分鐘

## 🧪 測試步驟
1. 先測試最簡單的：https://fruit-ops.vercel.app/api/healthz
2. 應該立即回應（不到 1 秒）：`{"status":"ok","db":"supabase"}`
3. 如果這個也卡住，代表 Function 本身有問題
