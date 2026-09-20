import type { Types } from 'mongoose';
import { EnvEntryModel, type EnvCategory } from '@modules/platform/envEntry/envEntry.model';

/**
 * Every Tech > Environment Variables entry, with just what the Env Keys
 * analytics page reads — never `config`, so no credential leaves the model.
 */

export interface EnvRow {
  _id: Types.ObjectId;
  name: string;
  category: EnvCategory;
  is_default: boolean;
  is_active: boolean;
  assigned_portals: string[];
  last_tested_at: Date | null;
  last_test_ok: boolean | null;
  created_at: Date;
}

export const loadEnvRows = () =>
  EnvEntryModel.find({})
    .select('name category is_default is_active assigned_portals last_tested_at last_test_ok created_at')
    .lean<EnvRow[]>();

export type TestHealth = 'PASSING' | 'FAILING' | 'UNTESTED';

export const TEST_HEALTH: readonly TestHealth[] = ['PASSING', 'FAILING', 'UNTESTED'];

/** What the entry's last "Test" button press said, or that nobody has pressed it. */
export function healthOf(row: EnvRow): TestHealth {
  if (!row.last_tested_at) return 'UNTESTED';
  return row.last_test_ok === false ? 'FAILING' : 'PASSING';
}

/** The one entry a category resolves to at runtime — `getRuntimeEnvValue` reads nothing else. */
export const isServing = (row: EnvRow) => row.is_active && row.is_default;

export type EntryStatus = 'DEFAULT' | 'ACTIVE' | 'INACTIVE';

export const ENTRY_STATUSES: readonly EntryStatus[] = ['DEFAULT', 'ACTIVE', 'INACTIVE'];

export function statusOf(row: EnvRow): EntryStatus {
  if (!row.is_active) return 'INACTIVE';
  return row.is_default ? 'DEFAULT' : 'ACTIVE';
}
