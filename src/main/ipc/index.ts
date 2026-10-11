import { ipcMain } from 'electron';
import { config } from '../config.js';
import type { BackendInfo } from './contracts.js';

const getBackendInfoChannel = 'backend:get-info';

export function registerIpcHandlers(): () => void {
  ipcMain.handle(getBackendInfoChannel, (): BackendInfo => ({
    baseUrl: `http://${config.host}:${config.port}`,
    healthPath: '/health',
  }));

  return () => ipcMain.removeHandler(getBackendInfoChannel);
}