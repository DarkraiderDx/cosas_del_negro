import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { buildApp } from '../api.js';
import { JsonDatabase } from '../database/json-database.js';

test('invoice API persists invoices and queues contingency requests idempotently', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'siat-api-'));
  const database = await JsonDatabase.open(join(directory, 'data.json'));
  const app = await buildApp({ database, logger: false });

  try {
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/invoices',
      payload: {
        customerNit: '123456789',
        customerName: 'Cliente de prueba',
        lines: [{ description: 'Producto', quantity: 2, unitPrice: 5.5 }],
        contingency: true,
      },
    });
    assert.equal(created.statusCode, 201);
    const invoice = created.json();
    assert.equal(invoice.total, 11);
    assert.equal(invoice.status, 'queued');

    const queue = await app.inject({ method: 'GET', url: '/api/v1/contingency/queue' });
    assert.equal(queue.statusCode, 200);
    assert.equal(queue.json().length, 1);

    const duplicateQueue = await app.inject({
      method: 'POST',
      url: `/api/v1/contingency/queue/${invoice.id}`,
    });
    assert.equal(duplicateQueue.statusCode, 202);
    assert.equal(duplicateQueue.json().id, queue.json()[0].id);
  } finally {
    await app.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test('SIAT operations are explicitly unavailable until official contracts are configured', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'siat-api-'));
  const database = await JsonDatabase.open(join(directory, 'data.json'));
  const app = await buildApp({ database, logger: false });

  try {
    const response = await app.inject({ method: 'POST', url: '/api/v1/siat/cuis', payload: {} });
    assert.equal(response.statusCode, 503);
    assert.equal(response.json().code, 'SIAT_NOT_CONFIGURED');
  } finally {
    await app.close();
    await rm(directory, { recursive: true, force: true });
  }
});