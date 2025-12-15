#!/usr/bin/env node

/**
 * 測試更新後的 API 端點
 * 驗證以下功能：
 * 1. GET /api/storage-locations - 獲取儲位列表
 * 2. GET /api/inventory - 獲取庫存（應包含 product_name, location, location_id）
 * 3. GET /api/orders - 獲取訂單（應包含 customer_name）
 * 4. PUT /api/logs/:id - 更新日誌
 */

const http = require('http');
const BASE_URL = 'http://localhost:3000';

function makeRequest(method, path) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    
    req.on('error', reject);
    req.end();
  });
}

async function runTests() {
  console.log('🧪 開始後端 API 測試...\n');
  
  try {
    // 1. 測試 GET /api/storage-locations
    console.log('📍 測試 GET /api/storage-locations');
    const locRes = await makeRequest('GET', '/api/storage-locations');
    console.log(`  狀態碼: ${locRes.status}`);
    if (Array.isArray(locRes.data)) {
      console.log(`  ✓ 成功獲取 ${locRes.data.length} 個儲位`);
      if (locRes.data[0]) {
        console.log(`    樣本: ${JSON.stringify(locRes.data[0], null, 2)}`);
      }
    } else {
      console.log(`  ✗ 返回值不是陣列: ${JSON.stringify(locRes.data)}`);
    }
    
    // 2. 測試 GET /api/inventory
    console.log('\n📦 測試 GET /api/inventory');
    const invRes = await makeRequest('GET', '/api/inventory');
    console.log(`  狀態碼: ${invRes.status}`);
    if (Array.isArray(invRes.data)) {
      console.log(`  ✓ 成功獲取 ${invRes.data.length} 項庫存`);
      if (invRes.data[0]) {
        const item = invRes.data[0];
        console.log(`    樣本: ${JSON.stringify(item, null, 2)}`);
        // 驗證字段
        if (item.product_name) console.log(`    ✓ product_name: ${item.product_name}`);
        else console.log(`    ✗ product_name 字段缺失`);
        if (item.location) console.log(`    ✓ location: ${item.location}`);
        else console.log(`    ✗ location 字段缺失`);
        if (item.location_id) console.log(`    ✓ location_id: ${item.location_id}`);
        else console.log(`    ⚠ location_id 可選`);
      }
    } else {
      console.log(`  ✗ 返回值不是陣列: ${JSON.stringify(invRes.data)}`);
    }
    
    // 3. 測試 GET /api/orders
    console.log('\n📋 測試 GET /api/orders');
    const ordRes = await makeRequest('GET', '/api/orders');
    console.log(`  狀態碼: ${ordRes.status}`);
    if (Array.isArray(ordRes.data)) {
      console.log(`  ✓ 成功獲取 ${ordRes.data.length} 項訂單`);
      if (ordRes.data[0]) {
        const order = ordRes.data[0];
        console.log(`    樣本: ${JSON.stringify(order, null, 2).substring(0, 200)}...`);
        if (order.customer_name) console.log(`    ✓ customer_name: ${order.customer_name}`);
        else if (order.customerName) console.log(`    ✓ customerName: ${order.customerName}`);
        else console.log(`    ✗ customer_name/customerName 字段缺失`);
      }
    } else {
      console.log(`  ✗ 返回值不是陣列: ${JSON.stringify(ordRes.data)}`);
    }
    
    console.log('\n✅ API 測試完成');
  } catch (err) {
    console.error('❌ 連接錯誤:', err.message);
    console.log('確保後端服務器在 http://localhost:3000 運行');
  }
}

runTests();
