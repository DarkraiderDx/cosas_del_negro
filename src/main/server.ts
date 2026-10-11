import { config } from './config.js';
import { buildApp } from './api.js';
import { JsonDatabase } from './database/json-database.js';

export async function startApi(dataFile = config.dataFile) {
  const database = await JsonDatabase.open(dataFile);
  const api = await buildApp({
    database,
    corsOrigins: config.corsOrigins,
    siatEnvironment: config.siatEnvironment,
  });
  await api.listen({ host: config.host, port: config.port });
  return api;
}