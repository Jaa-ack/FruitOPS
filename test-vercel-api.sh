#!/bin/bash
# 測試 Vercel API 端點的腳本

VERCEL_URL="https://fruit-ops.vercel.app"
echo "🧪 測試 Vercel API 端點..."
echo "================================================"

# Test 1: Basic health check (應該立即回應)
echo ""
echo "1️⃣ 測試 /api/healthz (應 < 1s)..."
time curl -s -w "\nHTTP Status: %{http_code}\nTime: %{time_total}s\n" \
  "${VERCEL_URL}/api/healthz" | head -20

# Test 2: Simple plots API (應該在 5-10s 內回應或逾時)
echo ""
echo "2️⃣ 測試 /api/plots (可能較慢)..."
timeout 15 curl -s -w "\nHTTP Status: %{http_code}\nTime: %{time_total}s\n" \
  "${VERCEL_URL}/api/plots" | head -20

# Test 3: Health deps (診斷用)
echo ""
echo "3️⃣ 測試 /api/health/deps (診斷端點，可能逾時)..."
timeout 15 curl -s -w "\nHTTP Status: %{http_code}\nTime: %{time_total}s\n" \
  "${VERCEL_URL}/api/health/deps" | head -30

echo ""
echo "================================================"
echo "✅ 測試完成"
echo ""
echo "📋 結果判讀："
echo "- 如果 /api/plots 回傳 504 → Supabase 連線逾時"
echo "- 如果 /api/plots 回傳 503 → DISABLE_LOCAL_DB=1 但 Supabase 無法連線"
echo "- 如果 /api/plots 回傳 [] → Supabase 連線正常但資料表無資料"
echo "- 如果 timeout → Function 卡住未回應（需要檢查 Vercel Logs）"
