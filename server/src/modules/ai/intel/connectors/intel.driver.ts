import type { IndexScope, IntelEnvChoice } from '../intel.constants';
import type { SourceDocument } from '../index/intel.indexer';
import type { IntelSettings } from '../settings/intelSettings.types';
import type { ResolvedEntry } from './intel.credentials';
import type { IIntelConnector } from './intelConnector.model';

/**
 * The contract every connector kind implements: test the credentials, and
 * sync — read the source and hand each document to the indexer. Drivers never
 * write to the index themselves, so versioning, dedupe and deletion stay in one
 * place (intel.indexer + intelSync.service).
 */

export type SyncMode = 'FULL' | 'INCREMENTAL';

export interface TestResult {
  ok: boolean;
  message: string;
  details: string[];
}

export type EmittedDocument = Omit<SourceDocument, 'source' | 'connector_id' | 'scope'>;

export interface SyncContext {
  connector: IIntelConnector;
  entry: ResolvedEntry;
  mode: SyncMode;
  settings: IntelSettings;
  runId: string;
  scope: IndexScope;
  /** Index one document. Answers false once the run must stop (paused, or the per-run cap is reached). */
  emit(doc: EmittedDocument): Promise<boolean>;
  /** Drop one previously indexed document (deleted upstream). */
  remove(externalId: string): Promise<void>;
  log(line: string): void;
  /** Incremental position; mutate it, the sync service saves it when the run succeeds. */
  cursor: Record<string, unknown>;
}

export interface ConnectorDriver {
  test(connector: IIntelConnector, entry: ResolvedEntry): Promise<TestResult>;
  sync(ctx: SyncContext): Promise<void>;
}

/** Which collection a connector's documents live in. */
export const scopeOf = (environment: IntelEnvChoice): IndexScope => (environment === 'BOTH' ? 'SHARED' : environment);
