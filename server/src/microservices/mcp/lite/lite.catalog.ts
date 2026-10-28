import { createHash } from 'node:crypto';
import { logs } from '@observability/log';
import type { CuratedTool, SkippedField } from '../tools/tool.types';
import { fetchLiteSdl } from './lite.client';
import { buildLiteTools } from './lite.tools';

/** How often Lite's schema is re-read, so a new Lite feature becomes a tool without a restart. */
export const LITE_REFRESH_MS = 10 * 60 * 1000;

interface LiteCatalogState {
  tools: readonly CuratedTool[];
  skipped: readonly SkippedField[];
  /** SHA-256 of the SDL the tools were built from. */
  version: string | null;
  loadedAt: Date | null;
  /** Why the last refresh failed (Lite down, connector not configured), until one succeeds. */
  error: string | null;
}

let state: LiteCatalogState = { tools: [], skipped: [], version: null, loadedAt: null, error: null };
let timer: NodeJS.Timeout | null = null;

export const liteCatalogState = (): Readonly<LiteCatalogState> => state;

/**
 * Re-read Lite's schema and rebuild its tools. `onChange` runs only when the
 * schema actually changed, so the main catalog is rebuilt only then. A failure
 * keeps the last good tools (Lite being briefly down must not empty the list).
 */
export async function refreshLiteTools(onChange: () => void): Promise<void> {
  try {
    const sdl = await fetchLiteSdl();
    const version = createHash('sha256').update(sdl).digest('hex');
    if (version === state.version) {
      state = { ...state, error: null };
      return;
    }
    const built = buildLiteTools(sdl);
    state = { tools: built.tools, skipped: built.skipped, version, loadedAt: new Date(), error: null };
    onChange();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message !== state.error) logs.server.warn('mcp', 'lite-catalog', { error, msg: 'Duncit Lite tools could not be refreshed' });
    state = { ...state, error: message };
  }
}

/** Load Lite's tools now and keep them fresh; safe to call more than once. */
export function startLiteCatalog(onChange: () => void): void {
  if (timer) return;
  refreshLiteTools(onChange).catch((error: unknown) => logs.server.error('mcp', 'lite-catalog', { error }));
  timer = setInterval(() => {
    refreshLiteTools(onChange).catch((error: unknown) => logs.server.error('mcp', 'lite-catalog', { error }));
  }, LITE_REFRESH_MS);
  timer.unref();
}

/** Tests only: forget everything. */
export function resetLiteCatalog(): void {
  if (timer) clearInterval(timer);
  timer = null;
  state = { tools: [], skipped: [], version: null, loadedAt: null, error: null };
}
