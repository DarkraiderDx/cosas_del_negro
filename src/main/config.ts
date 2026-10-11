import 'dotenv/config';
import { z } from 'zod';

const configSchema = z.object({
  HOST: z.string().default('127.0.0.1'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATA_FILE: z.string().default('./data/siat-api.json'),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
  SIAT_ENVIRONMENT: z.enum(['test', 'production']).default('test'),
});

const parsed = configSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(`Invalid environment configuration: ${parsed.error.message}`);
}

export const config = {
  host: parsed.data.HOST,
  port: parsed.data.PORT,
  dataFile: parsed.data.DATA_FILE,
  corsOrigins: parsed.data.CORS_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean),
  siatEnvironment: parsed.data.SIAT_ENVIRONMENT,
};