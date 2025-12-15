const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
// prefer service role key for server operations if provided
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;

let supabase = null;

if (SUPABASE_URL && SUPABASE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
}

async function getPlots() {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.from('plots').select('*');
  if (error) throw error;
  return data;
}

async function getLogs() {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.from('logs').select('*').order('date', { ascending: false });
  if (error) throw error;
  return data;
}

async function addLog(log) {
  if (!supabase) throw new Error('Supabase not configured');
  // normalize keys to lowercase to match DB column names (Postgres folds unquoted identifiers to lower case)
  const normalized = {};
  for (const k of Object.keys(log)) {
    normalized[k.toLowerCase()] = log[k];
  }
  console.log('supabase.addLog normalized payload:', normalized);
  const { data, error } = await supabase.from('logs').insert([normalized]);
  if (error) throw error;
  return data;
}

async function getInventory() {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.from('inventory').select('*');
  if (error) throw error;
  return data;
}

async function getOrders() {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.from('orders').select('*');
  if (error) throw error;
  return data;
}

async function getCustomers() {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.from('customers').select('*');
  if (error) throw error;
  return data;
}

module.exports = { supabase, getPlots, getLogs, addLog, getInventory, getOrders, getCustomers };
