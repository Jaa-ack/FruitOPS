export async function fetchAll(resource: string) {
  const res = await fetch(`/api/${resource}`);
  if (!res.ok) throw new Error(`Fetch ${resource} failed`);
  return res.json();
}

export async function postLog(payload: any) {
  const res = await fetch('/api/logs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  if (!res.ok) throw new Error('Failed creating log');
  return res.json();
}

export async function callAI(context: any, prompt: string) {
  const res = await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ context, prompt }) });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'AI request failed');
  }
  return res.json();
}
