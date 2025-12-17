// Add debug endpoint at the top of routes
app.get('/api/debug/simple', (req, res) => {
  console.log('[DEBUG] /api/debug/simple called');
  res.json({ 
    ok: true, 
    timestamp: new Date().toISOString(),
    message: 'Simple endpoint works'
  });
});

// Add at beginning of /api/plots
app.get('/api/plots', async (req, res) => {
  console.log('[PLOTS] Request received at', new Date().toISOString());
  console.log('[PLOTS] SUPABASE_READY:', SUPABASE_READY);
  console.log('[PLOTS] DISABLE_LOCAL_DB:', DISABLE_LOCAL_DB);
  
  try {
    const start = Date.now();
    
    // Test 1: Return fake data immediately
    console.log('[PLOTS] Returning test data...');
    return res.json([
      { id: 'TEST-1', name: 'Test Plot', status: 'Testing', timestamp: Date.now() }
    ]);
    
    // Original code below (commented out for testing)
    /*
    if (!SUPABASE_READY) {
      console.log('[DEBUG /api/plots] Supabase not configured, checking local DB');
      if (DISABLE_LOCAL_DB) {
        return res.status(503).json({ error: 'Supabase not configured and local DB disabled' });
      }
      const db = await ensureLocalDB();
      const data = db.data.plots || [];
      console.log(`[DEBUG /api/plots] Returned ${data.length} plots from local DB in ${Date.now() - start}ms`);
      return res.json(data);
    }
    
    const client = getSupabaseClient();
    const rows = await client.getPlots();
    console.log(`[DEBUG /api/plots] Returned ${rows ? rows.length : 0} plots from Supabase in ${Date.now() - start}ms`);
    res.json(rows || []);
    */
  } catch (err) {
    console.error('[PLOTS ERROR]', err.message, err.stack);
    res.status(500).json({ error: '取得 plots 失敗', details: err.message });
  }
});
