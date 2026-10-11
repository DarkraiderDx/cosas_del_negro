export interface SiatReadiness {
  configured: false;
  environment: 'test' | 'production';
  missingArtifacts: string[];
}

export class SiatUnavailableError extends Error {
  constructor(message = 'SIAT integration is not configured with verified official contracts.') {
    super(message);
    this.name = 'SiatUnavailableError';
  }
}

export interface SiatGateway {
  readiness(): SiatReadiness;
  generateInvoiceXml(invoiceId: string): Promise<never>;
  requestCuis(payload: unknown): Promise<never>;
  requestCufd(payload: unknown): Promise<never>;
  submitInvoice(invoiceId: string): Promise<never>;
}

export class UnconfiguredSiatGateway implements SiatGateway {
  constructor(private readonly environment: 'test' | 'production') {}

  readiness(): SiatReadiness {
    return {
      configured: false,
      environment: this.environment,
      missingArtifacts: [
        'Official SIN WSDL/service definitions for the selected modality',
        'Official invoice XSD and XML generation rules',
        'Current SIN contingency procedure and limits',
        'Test credentials and authorization parameters',
      ],
    };
  }

  async generateInvoiceXml(_invoiceId: string): Promise<never> {
    throw new SiatUnavailableError('Invoice XML generation is disabled until the official XSD is installed.');
  }

  async requestCuis(_payload: unknown): Promise<never> {
    throw new SiatUnavailableError('CUIS requests are disabled until the official service contract is installed.');
  }

  async requestCufd(_payload: unknown): Promise<never> {
    throw new SiatUnavailableError('CUFD requests are disabled until the official service contract is installed.');
  }

  async submitInvoice(_invoiceId: string): Promise<never> {
    throw new SiatUnavailableError('Invoice submission is disabled until the official service contract is installed.');
  }
}