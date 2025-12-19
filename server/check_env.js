const fs = require('fs');
require('dotenv').config({ path: '../.env.local' });
require('dotenv').config({ path: '../.env' });

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;

if (!url || url.includes('your_supabase')) {
  console.log('❌ Supabase URL 未配置或使用預設值');
  console.log('請在 .env.local 中設定 SUPABASE_URL 和 SUPABASE_SERVICE_KEY');
  process.exit(1);
}

console.log('✅ Supabase 配置已找到');
console.log('URL:', url.substring(0, 40) + '...');
console.log('準備執行 SQL 遷移...');
