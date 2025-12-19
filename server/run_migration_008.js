#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ 缺少 Supabase 環境變數');
  process.exit(1);
}

const sqlFile = path.join(__dirname, 'migrations/008_add_rfm_lock_fields.sql');
const sql = fs.readFileSync(sqlFile, 'utf-8');

console.log('📝 準備執行 SQL 遷移: 008_add_rfm_lock_fields.sql');
console.log('🔗 連線到:', SUPABASE_URL.substring(0, 40) + '...');

async function runMigration() {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ query: sql })
    });

    if (!response.ok) {
      // Supabase 可能沒有 exec_sql RPC，改用直接執行方式
      console.log('⚠️  無法使用 RPC，改用直接 SQL 執行...');
      
      // 改用 PostgREST 的原始 SQL 執行
      const directResponse = await fetch(`${SUPABASE_URL}/rest/v1/`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: sql })
      });

      if (!directResponse.ok) {
        const errorText = await directResponse.text();
        throw new Error(`SQL 執行失敗: ${directResponse.status} ${errorText}`);
      }
    }

    console.log('✅ SQL 遷移執行成功！');
    
    // 驗證欄位是否存在
    console.log('\n🔍 驗證欄位...');
    const verifyResponse = await fetch(`${SUPABASE_URL}/rest/v1/customers?select=id,name,rfm_locked,rfm_locked_reason,rfm_locked_at&limit=3`, {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      }
    });

    if (verifyResponse.ok) {
      const samples = await verifyResponse.json();
      console.log('✅ 欄位驗證成功！範例資料：');
      console.log(JSON.stringify(samples, null, 2));
      
      // 統計鎖定數量
      const statsResponse = await fetch(`${SUPABASE_URL}/rest/v1/customers?select=rfm_locked`, {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        }
      });
      
      if (statsResponse.ok) {
        const allCustomers = await statsResponse.json();
        const lockedCount = allCustomers.filter(c => c.rfm_locked).length;
        const total = allCustomers.length;
        console.log(`\n📊 客戶統計：總數 ${total}，已鎖定 ${lockedCount}，未鎖定 ${total - lockedCount}`);
      }
    } else {
      console.log('⚠️  無法驗證欄位，請手動檢查 Supabase Dashboard');
    }

    console.log('\n✨ 遷移完成！');
  } catch (error) {
    console.error('❌ 執行失敗:', error.message);
    console.log('\n💡 請使用 Supabase Dashboard 的 SQL Editor 手動執行 SQL：');
    console.log('   檔案位置:', sqlFile);
    process.exit(1);
  }
}

runMigration();
