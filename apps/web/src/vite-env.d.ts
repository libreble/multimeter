/// <reference types="vite/client" />

import type { MeterSnapshot } from '@libreble/multimeter-web-bluetooth';

declare global {
  interface Window {
    // Dev-only hook installed by App for the BLE matrix harness (tools/ble-matrix). Absent in
    // production builds. `meters()` returns each channel's id + live snapshot (incl. driverId).
    __bleMatrix?: {
      meters: () => Array<{ id: string } & Partial<MeterSnapshot>>;
      connect: (i?: number) => void;
      disconnect: (i?: number) => void;
    };
  }
}

declare global {
  /** Build version for the footer — see appVersion() in vite.config.ts. */
  const __APP_VERSION__: string;
}
