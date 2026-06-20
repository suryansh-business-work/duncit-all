import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  server: {
    port: 2025,
    host: true,
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
