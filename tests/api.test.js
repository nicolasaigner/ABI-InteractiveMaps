const request = require('supertest');
const app = require('../api/server');

describe('API Endpoints', () => {
  test('GET /api/maps responds with array of maps', async () => {
    const response = await request(app).get('/api/maps');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
  });

  test('GET /api/coordinates/:mapName returns map data', async () => {
    const response = await request(app).get('/api/coordinates/farm');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('mapName', 'Farm');
    expect(response.body).toHaveProperty('markers');
  });
});
