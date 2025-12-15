require('dotenv').config();
const { supabase } = require('./supabase');

if (!supabase) {
  console.error('Supabase not configured. Set SUPABASE_URL and SUPABASE_KEY in env.');
  process.exit(1);
}

const EXPECTED = {
  plots: ['id','name','crop','area','status','health'],
  logs: ['id','date','plotId','activity','cropType','notes','cost','worker'],
  inventory: ['id','productName','grade','quantity','location','harvestDate'],
  orders: ['id','customerName','channel','items','total','status','date'],
  customers: ['id','name','phone','segment','totalSpent','lastOrderDate'],
};

async function getColumns(table) {
  const { data, error } = await supabase.from('information_schema.columns').select('column_name,data_type').eq('table_name', table).order('ordinal_position', { ascending: true });
  if (error) throw error;
  return data.map(r => r.column_name);
}

async function run() {
  const report = {};
  for (const t of Object.keys(EXPECTED)) {
    try {
      const cols = await getColumns(t);
      const missing = EXPECTED[t].filter(c => !cols.includes(c));
      report[t] = { present: cols, missing };
      console.log(`Table ${t}: present columns=${cols.join(', ')}`);
      if (missing.length) console.log(`  Missing: ${missing.join(', ')}`);
    } catch (err) {
      console.error(`Error fetching columns for ${t}:`, err.message || err);
      report[t] = { error: err.message };
    }
  }

  // If missing columns exist, bail with report so caller can decide
  const anyMissing = Object.values(report).some(r => r.missing && r.missing.length);
  if (anyMissing) {
    console.log('\nSome tables have missing expected columns — I will not run a forced alter.');
    console.log('Please either run the CREATE TABLE SQL from README or let me know if you want me to add the missing columns.');
    process.exit(0);
  }

  // All columns present → proceed with safe upsert using existing seed rows from seed_supabase.js
  console.log('\nAll expected columns present — proceeding to upsert seed data.');
  const seed = require('./seed_supabase');
  try {
    await seed();
    console.log('Supabase seed completed (via seed_supabase.js)');
  } catch (err) {
    console.error('Seeding error:', err.message || err);
    process.exit(1);
  }
}

run().catch(err => { console.error(err); process.exit(1); });
