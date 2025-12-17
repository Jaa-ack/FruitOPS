# Vercel 環境變數檢查清單

請前往 Vercel Dashboard 確認以下設定：

## 📍 位置
**Settings** → **Environment Variables**

## ✅ 必須設定的變數

1. **SUPABASE_URL**
   - Value: `https://vebgryuskpqtnlzalppc.supabase.co`
   - Environments: ☑️ Production, Preview, Development

2. **SUPABASE_SERVICE_KEY**
   - Value: (請從 Supabase Dashboard 複製 service_role key)
   - Environments: ☑️ Production, Preview, Development

3. **GEMINI_API_KEY**
   - Value: (請從 Google AI Studio 生成新的 API key)
   - Environments: ☑️ Production, Preview, Development
   - ⚠️ 請勿將 API key 提交到 git！

4. **DISABLE_LOCAL_DB** (重要!)
   - Value: `1`
   - Environments: ☑️ Production, Preview, Development

## 🔒 安全提醒
- 所有 API keys 和密鑰都應該只存在於 Vercel 環境變數中
- 切勿將這些值提交到 git 倉庫
- 如果不小心洩露，請立即重新生成新的 key
