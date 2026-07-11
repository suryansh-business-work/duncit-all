import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 2019, host: true, strictPort: true },
  preview: { port: 2019, host: true, strictPort: true },
});
