import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mergeConfig } from 'vitest/config';
import base from './vitest.config';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

// Istanbul-flavoured coverage run used ONLY by the Playwright merge pipeline
// (`coverage:all`). It reuses the base unit-test config but emits an istanbul
// JSON map into `coverage/vitest`, which `nyc` merges with the E2E
// `.nyc_output`. The existing v8 `test:coverage` flow is left untouched.
export default mergeConfig(base, {
  test: {
    coverage: {
      provider: 'istanbul',
      reporter: ['json'],
      reportsDirectory: path.resolve(projectRoot, 'coverage/vitest'),
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/main.tsx',
        'src/**/*.d.ts',
        'src/types/**',
        'src/**/*.types.{ts,tsx}',
        'src/**/types.ts',
        '__tests__/**',
      ],
    },
  },
});
