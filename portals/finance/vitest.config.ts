import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.{cy,test,spec}.{ts,tsx}'],
    coverage: {
      // istanbul output (json) is merged with the Playwright E2E coverage by nyc
      // so component-level defensive branches the E2E flows can't reach still count.
      provider: 'istanbul',
      reporter: ['json', 'lcov'],
      reportsDirectory: './coverage/vitest',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/main.tsx',
        'src/**/*.d.ts',
        'src/**/*.{cy,test,spec}.{ts,tsx}',
        'src/**/*.types.{ts,tsx}',
        'src/**/types.ts',
      ],
    },
  },
});
