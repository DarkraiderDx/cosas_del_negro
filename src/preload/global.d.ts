import type { BackendInfo } from '../main/ipc/contracts.js';

declare global {
  interface Window {
    desktopApi: {
      getBackendInfo(): Promise<BackendInfo>;
    };
  }
}

export {};