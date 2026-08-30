import { describe, it, expect } from 'vitest';
import { app } from './app.js';

describe('Control API Integration Tests', () => {
  describe('Health Check Routes', () => {
    it('GET /api/v1/health should return service health metadata', async () => {
      const res = await app.request('/api/v1/health');
      expect(res.status).toBe(200);
      
      const body = await res.json() as any;
      expect(body).toHaveProperty('status', 'ok');
      expect(body).toHaveProperty('service', 'control-api');
      expect(body).toHaveProperty('version');
    });

    it('GET /api/v1/liveness should return status ok', async () => {
      const res = await app.request('/api/v1/liveness');
      expect(res.status).toBe(200);
      
      const body = await res.json() as any;
      expect(body).toEqual({ status: 'ok' });
    });

    it('GET /api/v1/readiness should check sub-service status', async () => {
      const res = await app.request('/api/v1/readiness');
      expect(res.status).toBe(200);
      
      const body = await res.json() as any;
      expect(body).toHaveProperty('status', 'ok');
      expect(body.checks).toEqual({
        database: 'ok',
        redis: 'ok',
      });
    });
  });

  describe('Global Fallbacks', () => {
    it('GET /api/v1/nonexistent should return 404', async () => {
      const res = await app.request('/api/v1/nonexistent');
      expect(res.status).toBe(404);
      
      const body = await res.json() as any;
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('NOT_FOUND');
    });
  });
});
