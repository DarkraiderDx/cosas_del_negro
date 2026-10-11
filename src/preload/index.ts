import { contextBridge, ipcRenderer } from 'electron';
import type { BackendInfo } from '../main/ipc/contracts.js';

const desktopApi = {
  getBackendInfo: (): Promise<BackendInfo> => ipcRenderer.invoke('backend:get-info'),
};

contextBridge.exposeInMainWorld('desktopApi', desktopApi);