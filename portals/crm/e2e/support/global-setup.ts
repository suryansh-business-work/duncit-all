import { rm } from 'node:fs/promises';
import path from 'node:path';

/** Wipe stale coverage before a run so `nyc` only merges this run's data. */
export default async function globalSetup(): Promise<void> {
  await Promise.all(
    ['.nyc_output', 'coverage'].map((dir) =>
      rm(path.resolve(dir), { recursive: true, force: true }),
    ),
  );
}
