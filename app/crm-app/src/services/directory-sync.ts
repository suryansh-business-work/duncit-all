import { Appearance } from 'react-native';
import { dark, light } from '@duncit/auth-tokens';
import type { Translator } from '@duncit/i18n';
import type { ResultOf } from '@graphql-typed-document-node/core';
import { CrmTelephony } from 'crm-telephony';

import accent from '../../crm-accent.json';
import { CrmAppPhoneDirectoryDocument } from '@/graphql/comms';
import { gqlRequest } from '@/services/graphql.client';
import { readValue, STORAGE_KEYS, writeValue } from '@/services/secure-storage';
import { currentTranslator } from '@/hooks/useTranslation';
import { LEAD_KINDS } from '@/features/leads/leadKinds';

/**
 * The offline caller-ID directory: every CRM lead phone number, downloaded and
 * written to the app's private storage, so the caller card shows the instant
 * a CRM contact rings — even with no signal, even with the app closed.
 */

/** Refreshed at most this often by the background sync; "Sync now" always runs. */
export const DIRECTORY_MAX_AGE_MS = 6 * 60 * 60 * 1000;
const PAGE_SIZE = 1000;
/** A runaway cursor can never loop forever. */
const MAX_PAGES = 200;

const NATIVE_LABELS = [
  'cardHeading',
  'close',
  'openLead',
  'assignedTo',
  'moreLeads',
  'channelName',
  'postCallTitle',
  'postCallBody',
  'widgetTitle',
  'dialer',
  'search',
  'reminders',
] as const;

/** The words the Android side draws with, translated now: it cannot translate later. */
export function nativeLabels(t: Translator['t']): Record<string, string> {
  const labels: Record<string, string> = {};
  // Templates keep their {name}/{count} placeholders for the Kotlin side to fill.
  for (const key of NATIVE_LABELS)
    labels[key] = t(`crmApp.native.${key}`, { vars: { name: '{name}', count: '{count}' } });
  for (const kind of LEAD_KINDS) labels[`kind.${kind}`] = t(`crmApp.kind.${kind}`);
  return labels;
}

/** The design tokens the caller card and widget paint with, in the phone's current mode. */
export function nativeTheme(scheme: 'light' | 'dark' | null | undefined): Record<string, string> {
  const m = scheme === 'dark' ? dark : light;
  return {
    surface: m.surface,
    ink: m.ink,
    muted: m.muted,
    soft: m.soft,
    primary: accent.active,
    onPrimary: m.onPrimary,
  };
}

export interface DirectoryRow {
  phone_key: string;
  entity_type: string;
  lead_id: string;
  lead_name: string;
  contact_name?: string | null;
  city?: string | null;
  lead_status?: string | null;
  assigned_to?: string | null;
}

/** The file the Kotlin side reads (CallerDirectory.kt): short keys keep a big directory small. */
export function directoryFile(
  rows: readonly DirectoryRow[],
  t: Translator['t'],
  scheme: 'light' | 'dark' | null | undefined,
) {
  return {
    version: 1,
    labels: nativeLabels(t),
    theme: nativeTheme(scheme),
    entries: rows.map((r) => ({
      k: r.phone_key,
      t: r.entity_type,
      id: r.lead_id,
      n: r.lead_name,
      c: r.contact_name ?? '',
      s: r.lead_status ?? '',
      city: r.city ?? '',
      a: r.assigned_to ?? '',
    })),
  };
}

/** Every page of the server's directory. */
export async function fetchDirectory(): Promise<DirectoryRow[]> {
  const rows: DirectoryRow[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const { crmPhoneDirectory }: ResultOf<typeof CrmAppPhoneDirectoryDocument> = await gqlRequest(
      CrmAppPhoneDirectoryDocument,
      { cursor, limit: PAGE_SIZE },
    );
    rows.push(...crmPhoneDirectory.items);
    cursor = crmPhoneDirectory.next_cursor ?? null;
    if (!cursor) break;
  }
  return rows;
}

export interface DirectoryStatus {
  syncedAt: number | null;
  count: number;
}

export async function readDirectoryStatus(): Promise<DirectoryStatus> {
  const raw = await readValue(STORAGE_KEYS.directorySyncedAt);
  const [at, count] = (raw ?? '').split('|');
  const syncedAt = Number(at);
  return {
    syncedAt: Number.isFinite(syncedAt) && syncedAt > 0 ? syncedAt : null,
    count: Number(count) || 0,
  };
}

export const isDirectoryStale = (status: DirectoryStatus, now = Date.now()) =>
  status.syncedAt === null || now - status.syncedAt > DIRECTORY_MAX_AGE_MS;

/** Download the directory and hand it to the phone side. Returns how many numbers it holds. */
export async function syncDirectory(): Promise<number> {
  if (!CrmTelephony) return 0;
  const rows = await fetchDirectory();
  const scheme = Appearance.getColorScheme();
  // RN reports 'unspecified' when the system has no preference; the card then follows light.
  const file = directoryFile(rows, currentTranslator().t, scheme === 'unspecified' ? null : scheme);
  await CrmTelephony.writeDirectory(JSON.stringify(file));
  await writeValue(STORAGE_KEYS.directorySyncedAt, `${Date.now()}|${rows.length}`);
  return rows.length;
}
