require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function inspectTables() {
  const tables = ['plots', 'logs', 'inventory', 'orders', 'order_items', 'customers', 'product_grades', 'storage_locations'];
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`\n❌ ${table}: ${error.message}`);
        continue;
      }
      
      if (data && data.length > 0) {
        const keys = Object.keys(data[0]);
        console.log(`\n✓ ${table}: ${keys.join(', ')}`);
      } else {
        console.log(`\n⊘ ${table}: (empty, cannot determine columns)`);
      }
    } catch (err) {
      console.log(`\n❌ ${table}: Error - ${err.message}`);
    }
  }
}

inspectTables().catch(console.error);
