const request = require('supertest');
const fs = require('fs');
const path = require('path');

// Ensure we use local lowdb for tests
delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_KEY;

const seed = require('../seed');
const app = require('../index');

beforeAll(async () => {
  // seed local db.json
  await seed();
});

describe('API basic tests', () => {
  test('GET /api/plots returns array', async () => {
    const res = await request(app).get('/api/plots');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('GET /api/logs returns array', async () => {
    const res = await request(app).get('/api/logs');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('GET /healthz returns ok', async () => {
    const res = await request(app).get('/healthz');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(['local','supabase']).toContain(res.body.db);
  });

  test('POST /api/ai without API key returns helpful message', async () => {
    const res = await request(app).post('/api/ai').send({ context: {}, prompt: '測試' });
    expect(res.statusCode).toBe(200);
    expect(res.body.text).toMatch(/API Key|missing|請配置/i);
  });

  test('POST /api/logs validation rejects bad data', async () => {
    const res = await request(app).post('/api/logs').send({});
    expect(res.statusCode).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  test('POST /api/logs accepts valid data', async () => {
    const payload = { id: 'TEST-1', date: '2023-12-01', plotId: 'P-01', activity: '測試', cropType: '蜜桃' };
    const res = await request(app).post('/api/logs').send(payload);
    expect(res.statusCode).toBe(201);
    expect(res.body.ok).toBe(true);
  });
});
