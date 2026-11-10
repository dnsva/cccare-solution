import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { chatRelay } from './server/chatRelay';

export default defineConfig({
  plugins: [react(), chatRelay()],
  // Listen on the network too, so phones on the same Wi-Fi can open the site.
  server: { host: true },
  preview: { host: true },
});
