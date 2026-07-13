import { test as base } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import type { Page } from '@playwright/test';

const NYC_DIR = path.resolve('.nyc_output');

type CoverageMap = Record<string, unknown>;

async function persist(coverage: CoverageMap | undefined): Promise<void> {
  if (!coverage || Object.keys(coverage).length === 0) return;
  await mkdir(NYC_DIR, { recursive: true });
  await writeFile(path.join(NYC_DIR, `${randomUUID()}.json`), JSON.stringify(coverage));
}

/** Reads istanbul's `window.__coverage__` from the page (undefined if none). */
async function read(page: Page): Promise<CoverageMap | undefined> {
  try {
    return await page.evaluate(
      () => (globalThis as unknown as { __coverage__?: CoverageMap }).__coverage__,
    );
  } catch {
    return undefined;
  }
}

/**
 * Test fixture that captures the instrumented `window.__coverage__` after each
 * test and writes it to `.nyc_output`. Specs that perform more than one full
 * page navigation should call `saveCoverage(page)` before the later `goto`,
 * since a full reload resets the in-page counter.
 */
export const test = base.extend<{ saveCoverage: (page: Page) => Promise<void> }>({
  saveCoverage: async ({}, provide) => {
    await provide(async (page: Page) => persist(await read(page)));
  },
  page: async ({ page }, provide) => {
    await provide(page);
    await persist(await read(page));
  },
});

export { expect } from '@playwright/test';
