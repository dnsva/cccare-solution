import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { deviceRelay } from './server/deviceRelay';

export default defineConfig({
  plugins: [react(), deviceRelay()],
  // Listen on the network too, so the Arduino (and phones on the same Wi-Fi) can reach the site.
  server: { host: true },
  preview: { host: true },
});
