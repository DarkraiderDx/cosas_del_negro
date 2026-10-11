import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { z } from 'zod';
import { JsonDatabase } from './database/json-database.js';
import { InvoiceService, createInvoiceSchema } from './services/invoice-service.js';
import { SiatUnavailableError, UnconfiguredSiatGateway, type SiatGateway } from './siat/gateway.js';

interface AppOptions {
  database: JsonDatabase;
  corsOrigins?: string[];
  siatGateway?: SiatGateway;
  siatEnvironment?: 'test' | 'production';
  logger?: boolean;
}

const idSchema = z.string().uuid();

export async function buildApp(options: AppOptions): Promise<FastifyInstance> {
  const app = Fastify({ logger: options.logger ?? true });
  const invoices = new InvoiceService(options.database);
  const siat = options.siatGateway ?? new UnconfiguredSiatGateway(options.siatEnvironment ?? 'test');

  await app.register(helmet);
  await app.register(cors, {
    origin: options.corsOrigins ?? ['http://localhost:5173'],
  });
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'SIAT Bolivia API',
        description: 'API de facturacion local con integracion SIAT deshabilitada hasta verificar contratos oficiales.',
        version: '0.1.0',
      },
    },
  });
  await app.register(swaggerUi, { routePrefix: '/docs' });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof SiatUnavailableError) {
      return reply.code(503).send({ code: 'SIAT_NOT_CONFIGURED', message: error.message });
    }
    app.log.error(error);
    return reply.code(500).send({ code: 'INTERNAL_ERROR', message: 'Unexpected server error.' });
  });

  app.get('/health', { schema: { tags: ['Health'], summary: 'Health check' } }, async () => ({ status: 'ok' }));

  app.get('/api/v1/siat/readiness', {
    schema: { tags: ['SIAT'], summary: 'Show SIAT integration readiness' },
  }, async () => siat.readiness());

  app.post('/api/v1/siat/cuis', {
    schema: { tags: ['SIAT'], summary: 'Request CUIS (disabled until official contract is installed)' },
  }, async (request) => siat.requestCuis(request.body));
  app.post('/api/v1/siat/cufd', {
    schema: { tags: ['SIAT'], summary: 'Request CUFD (disabled until official contract is installed)' },
  }, async (request) => siat.requestCufd(request.body));

  app.post('/api/v1/invoices', {
    schema: {
      tags: ['Invoices'],
      summary: 'Create a local invoice draft or contingency queue entry',
      body: {
        type: 'object',
        additionalProperties: false,
        required: ['customerNit', 'customerName', 'lines'],
        properties: {
          customerNit: { type: 'string', minLength: 1, maxLength: 30 },
          customerName: { type: 'string', minLength: 1, maxLength: 200 },
          currency: { type: 'string', minLength: 3, maxLength: 3, default: 'BOB' },
          contingency: { type: 'boolean', default: false },
          lines: {
            type: 'array',
            minItems: 1,
            maxItems: 500,
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['description', 'quantity', 'unitPrice'],
              properties: {
                description: { type: 'string', minLength: 1, maxLength: 300 },
                quantity: { type: 'number', exclusiveMinimum: 0 },
                unitPrice: { type: 'number', minimum: 0 },
              },
            },
          },
        },
      },
      response: {
        201: { description: 'Invoice created' },
        400: { description: 'Invoice validation failed' },
      },
    },
  }, async (request, reply) => {
    const parsed = createInvoiceSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ code: 'VALIDATION_ERROR', details: parsed.error.flatten() });
    }
    return reply.code(201).send(await invoices.create(parsed.data));
  });

  app.get('/api/v1/invoices', {
    schema: { tags: ['Invoices'], summary: 'List local invoices' },
  }, async () => invoices.list());

  app.get<{ Params: { id: string } }>('/api/v1/invoices/:id', {
    schema: {
      tags: ['Invoices'],
      summary: 'Get a local invoice',
      params: { type: 'object', required: ['id'], properties: { id: { type: 'string', format: 'uuid' } } },
    },
  }, async (request, reply) => {
    const id = idSchema.safeParse(request.params.id);
    if (!id.success) return reply.code(400).send({ code: 'INVALID_ID' });
    const invoice = await invoices.get(id.data);
    if (!invoice) return reply.code(404).send({ code: 'INVOICE_NOT_FOUND' });
    return invoice;
  });

  app.post<{ Params: { id: string } }>('/api/v1/invoices/:id/xml', {
    schema: {
      tags: ['SIAT'],
      summary: 'Generate official invoice XML (disabled until XSD is installed)',
      params: { type: 'object', required: ['id'], properties: { id: { type: 'string', format: 'uuid' } } },
    },
  }, async (request, reply) => {
    const id = idSchema.safeParse(request.params.id);
    if (!id.success) return reply.code(400).send({ code: 'INVALID_ID' });
    if (!(await invoices.get(id.data))) return reply.code(404).send({ code: 'INVOICE_NOT_FOUND' });
    return siat.generateInvoiceXml(id.data);
  });

  app.post<{ Params: { id: string } }>('/api/v1/invoices/:id/submit', {
    schema: {
      tags: ['SIAT'],
      summary: 'Submit invoice to SIAT (disabled until official service contract is installed)',
      params: { type: 'object', required: ['id'], properties: { id: { type: 'string', format: 'uuid' } } },
    },
  }, async (request, reply) => {
    const id = idSchema.safeParse(request.params.id);
    if (!id.success) return reply.code(400).send({ code: 'INVALID_ID' });
    if (!(await invoices.get(id.data))) return reply.code(404).send({ code: 'INVOICE_NOT_FOUND' });
    return siat.submitInvoice(id.data);
  });

  app.post<{ Params: { id: string } }>('/api/v1/contingency/queue/:id', {
    schema: {
      tags: ['Contingency'],
      summary: 'Add a local invoice to the contingency queue',
      params: { type: 'object', required: ['id'], properties: { id: { type: 'string', format: 'uuid' } } },
      response: { 202: { description: 'Invoice queued locally' } },
    },
  }, async (request, reply) => {
    const id = idSchema.safeParse(request.params.id);
    if (!id.success) return reply.code(400).send({ code: 'INVALID_ID' });
    const item = await invoices.queue(id.data);
    if (!item) return reply.code(404).send({ code: 'INVOICE_NOT_FOUND' });
    return reply.code(202).send(item);
  });

  app.get('/api/v1/contingency/queue', {
    schema: { tags: ['Contingency'], summary: 'List local contingency queue entries' },
  }, async () => invoices.listOutbox());

  return app;
}