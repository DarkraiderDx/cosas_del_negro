export type InvoiceStatus = 'draft' | 'queued' | 'submitted' | 'accepted' | 'rejected';
export type OutboxStatus = 'pending' | 'processing' | 'failed' | 'completed';

export interface InvoiceLine {
  description: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface Invoice {
  id: string;
  customerNit: string;
  customerName: string;
  currency: string;
  lines: InvoiceLine[];
  total: number;
  status: InvoiceStatus;
  createdAt: string;
  updatedAt: string;
}

export interface OutboxItem {
  id: string;
  invoiceId: string;
  status: OutboxStatus;
  attempts: number;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DatabaseState {
  invoices: Invoice[];
  outbox: OutboxItem[];
}