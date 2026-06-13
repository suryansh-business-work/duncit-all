import { cp, access } from 'node:fs/promises';
import path from 'node:path';

// Fold vitest's istanbul coverage into `.nyc_output` so a single `nyc` pass
// merges it with the Playwright E2E coverage before the 100% gate. Run AFTER
// `playwright test` (whose global-setup wipes `.nyc_output`) and `vitest run
// --coverage`.
const vitestJson = path.resolve('coverage/vitest/coverage-final.json');
try {
  await access(vitestJson);
} catch {
  console.error(`No vitest coverage at ${vitestJson} — run "vitest run --coverage" first.`);
  process.exit(1);
}
await cp(vitestJson, path.resolve('.nyc_output/vitest-coverage.json'));
console.log('Merged vitest coverage into .nyc_output/vitest-coverage.json');
