import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GET as healthHandler } from '../app/api/health/route';

test('BACKEND HEALTH: GET /api/health returns HTTP 200 with healthy database status', async () => {
  const response = await healthHandler();
  assert.equal(response.status, 200);

  const data = await response.json();
  assert.equal(data.success, true);
  assert.equal(data.status, 'healthy');
  assert.equal(data.database, 'connected');
  assert.equal(data.application, 'SAMAY');
  assert.ok(data.timestamp, 'Timestamp should be present in response');

  // Verify no sensitive database internal info is exposed
  assert.equal(data.database_url, undefined);
  assert.equal(data.password, undefined);
  assert.equal(data.stack, undefined);
});
