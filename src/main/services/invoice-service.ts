import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { Invoice, InvoiceLine, OutboxItem } from '../domain/types.js';
import { JsonDatabase } from '../database/json-database.js';

export const createInvoiceSchema = z.object({
  customerNit: z.string().trim().min(1).max(30),
  customerName: z.string().trim().min(1).max(200),
  currency: z.string().trim().length(3).default('BOB'),
  lines: z.array(z.object({
    description: z.string().trim().min(1).max(300),
    quantity: z.number().positive(),
    unitPrice: z.number().nonnegative(),
  }).strict()).min(1).max(500),
  contingency: z.boolean().default(false),
}).strict();

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;

export class InvoiceService {
  constructor(private readonly database: JsonDatabase) {}

  async create(input: CreateInvoiceInput): Promise<Invoice> {
    const now = new Date().toISOString();
    const lines: InvoiceLine[] = input.lines.map((line) => ({
      ...line,
      subtotal: Math.round(line.quantity * line.unitPrice * 100) / 100,
    }));
    const invoice: Invoice = {
      id: randomUUID(),
      customerNit: input.customerNit,
      customerName: input.customerName,
      currency: input.currency.toUpperCase(),
      lines,
      total: Math.round(lines.reduce((sum, line) => sum + line.subtotal, 0) * 100) / 100,
      status: input.contingency ? 'queued' : 'draft',
      createdAt: now,
      updatedAt: now,
    };

    await this.database.update((state) => {
      state.invoices.push(invoice);
      if (input.contingency) {
        state.outbox.push(this.newOutboxItem(invoice.id, now));
      }
    });
    return invoice;
  }

  async list(): Promise<Invoice[]> {
    return (await this.database.read()).invoices;
  }

  async get(id: string): Promise<Invoice | undefined> {
    return (await this.database.read()).invoices.find((invoice) => invoice.id === id);
  }

  async queue(id: string): Promise<OutboxItem | undefined> {
    return this.database.update((state) => {
      const invoice = state.invoices.find((item) => item.id === id);
      if (!invoice) return undefined;

      const existing = state.outbox.find((item) => item.invoiceId === id && item.status !== 'completed');
      if (existing) return existing;

      const now = new Date().toISOString();
      const item = this.newOutboxItem(id, now);
      state.outbox.push(item);
      invoice.status = 'queued';
      invoice.updatedAt = now;
      return item;
    });
  }

  async listOutbox(): Promise<OutboxItem[]> {
    return (await this.database.read()).outbox;
  }

  private newOutboxItem(invoiceId: string, now: string): OutboxItem {
    return {
      id: randomUUID(),
      invoiceId,
      status: 'pending',
      attempts: 0,
      lastError: null,
      createdAt: now,
      updatedAt: now,
    };
  }
}