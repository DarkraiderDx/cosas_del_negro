import { app } from 'electron';
import { join } from 'node:path';
import { config } from './config.js';
import { registerIpcHandlers } from './ipc/index.js';
import { startApi } from './server.js';

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  let api: Awaited<ReturnType<typeof startApi>> | undefined;
  let unregisterIpcHandlers: (() => void) | undefined;
  let closing = false;

  app.whenReady().then(async () => {
    const dataFile = process.env.DATA_FILE
      ? config.dataFile
      : join(app.getPath('userData'), 'siat-api.json');
    api = await startApi(dataFile);
    unregisterIpcHandlers = registerIpcHandlers();
    console.info(`SIAT API listening on http://${config.host}:${config.port}`);
  }).catch((error: unknown) => {
    console.error('Failed to start SIAT API:', error);
    app.quit();
  });

  app.on('before-quit', (event) => {
    if (!api || closing) return;
    event.preventDefault();
    closing = true;
    unregisterIpcHandlers?.();
    void api.close().then(
      () => app.quit(),
      (error: unknown) => {
        console.error('Failed to stop SIAT API cleanly:', error);
        app.quit();
      },
    );
  });
}