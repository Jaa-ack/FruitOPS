function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = setTimeout(() => reject(new Error('request-timeout')), ms);
    p.then((v) => { clearTimeout(id); resolve(v); }, (e) => { clearTimeout(id); reject(e); });
  });
}

async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit, timeoutMs = 12000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(input, { ...(init || {}), signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

export async function fetchAll(resource: string) {
  const res = await fetchWithTimeout(`/api/${resource}`);
  if (!res.ok) {
    const rid = res.headers.get('x-request-id') || undefined;
    const body = await res.text().catch(() => '');
    throw new Error(`Fetch ${resource} failed (${res.status}). reqId=${rid} body=${body?.slice(0,200)}`);
  }
  return res.json();
}

export async function postLog(payload: any) {
  const res = await fetchWithTimeout('/api/logs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  if (!res.ok) throw new Error('Failed creating log');
  return res.json();
}

export async function callAI(context: any, prompt: string) {
  const res = await fetchWithTimeout('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ context, prompt }) }, 12000);
  if (!res.ok) {
    const rid = res.headers.get('x-request-id') || undefined;
    const text = await res.text();
    throw new Error((text || 'AI request failed') + (rid ? ` (reqId=${rid})` : ''));
  }
  return res.json();
}
