import * as SecureStore from 'expo-secure-store';

import accent from '../../../crm-accent.json';
import { gqlRequest } from '@/services/graphql.client';
import { fallbackT } from '@/i18n/fallback';
import { STORAGE_KEYS } from '@/services/secure-storage';
import {
  DIRECTORY_MAX_AGE_MS,
  directoryFile,
  fetchDirectory,
  isDirectoryStale,
  nativeLabels,
  nativeTheme,
  readDirectoryStatus,
  syncDirectory,
} from '../directory-sync';

const mockPhone = { writeDirectory: jest.fn() };
jest.mock('crm-telephony', () => ({
  get CrmTelephony() {
    return mockPhone;
  },
}));
jest.mock('@/services/graphql.client', () => ({ gqlRequest: jest.fn() }));

/** The offline caller-ID directory the Android side reads with the app closed. */

const request = gqlRequest as jest.Mock;
const store = (SecureStore as unknown as { __store: Map<string, string> }).__store;
const row = {
  phone_key: '9811000001',
  entity_type: 'VENUE_LEAD',
  lead_id: 'l1',
  lead_name: 'Smash Arena',
  contact_name: 'Rohit',
  city: 'Pune',
  lead_status: 'New',
  assigned_to: 'Asha',
};

beforeEach(() => {
  store.clear();
  jest.clearAllMocks();
});

describe('nativeLabels', () => {
  it('translates every word the caller card, notifications and widget draw, keeping placeholders for Android to fill', () => {
    const labels = nativeLabels(fallbackT);
    expect(labels).toMatchObject({
      openLead: 'Open in CRM',
      assignedTo: 'Assigned to {name}',
      moreLeads: '+{count} more leads with this number',
      postCallTitle: 'Call ended with {name}',
      dialer: 'Dialer',
      'kind.VENUE_LEAD': 'Venue lead',
      'kind.COMMUNITY_LEAD': 'Community lead',
    });
  });
});

describe('nativeTheme', () => {
  it('paints with the design tokens of the phone’s mode and the CRM accent', () => {
    const lightTheme = nativeTheme('light');
    const darkTheme = nativeTheme('dark');
    // The caller card's buttons use the CRM accent's deepest step (white text on it).
    expect(lightTheme.primary).toBe(accent.active);
    expect(darkTheme.primary).toBe(accent.active);
    expect(lightTheme.surface).not.toBe(darkTheme.surface);
    expect(nativeTheme(null)).toEqual(lightTheme);
  });
});

describe('directoryFile', () => {
  it('writes each number with short keys the Kotlin reader expects', () => {
    const file = directoryFile(
      [
        row,
        {
          ...row,
          phone_key: '9000000001',
          contact_name: null,
          city: null,
          lead_status: null,
          assigned_to: null,
        },
      ],
      fallbackT,
      'light',
    );
    expect(file.version).toBe(1);
    expect(file.entries[0]).toEqual({
      k: '9811000001',
      t: 'VENUE_LEAD',
      id: 'l1',
      n: 'Smash Arena',
      c: 'Rohit',
      s: 'New',
      city: 'Pune',
      a: 'Asha',
    });
    expect(file.entries[1]).toMatchObject({ c: '', s: '', city: '', a: '' });
  });
});

describe('fetchDirectory', () => {
  it('follows the cursor until the server says there is no more', async () => {
    request
      .mockResolvedValueOnce({ crmPhoneDirectory: { next_cursor: '0:abc', items: [row] } })
      .mockResolvedValueOnce({
        crmPhoneDirectory: { next_cursor: null, items: [{ ...row, phone_key: '9000000001' }] },
      });
    const rows = await fetchDirectory();
    expect(rows.map((r) => r.phone_key)).toEqual(['9811000001', '9000000001']);
    expect(request.mock.calls[1][1]).toEqual({ cursor: '0:abc', limit: 1000 });
  });
});

describe('sync status', () => {
  it('is stale when never synced or older than the limit', () => {
    const now = 10 * DIRECTORY_MAX_AGE_MS;
    expect(isDirectoryStale({ syncedAt: null, count: 0 }, now)).toBe(true);
    expect(isDirectoryStale({ syncedAt: now - DIRECTORY_MAX_AGE_MS - 1, count: 5 }, now)).toBe(
      true,
    );
    expect(isDirectoryStale({ syncedAt: now - 1000, count: 5 }, now)).toBe(false);
  });

  it('reads what the last sync stored, and nothing from a broken value', async () => {
    expect(await readDirectoryStatus()).toEqual({ syncedAt: null, count: 0 });
    store.set(STORAGE_KEYS.directorySyncedAt, '1700000000000|42');
    expect(await readDirectoryStatus()).toEqual({ syncedAt: 1700000000000, count: 42 });
    store.set(STORAGE_KEYS.directorySyncedAt, 'garbage');
    expect(await readDirectoryStatus()).toEqual({ syncedAt: null, count: 0 });
  });
});

describe('syncDirectory', () => {
  it('hands the whole directory to the phone and records when and how many', async () => {
    request.mockResolvedValueOnce({ crmPhoneDirectory: { next_cursor: null, items: [row] } });
    await expect(syncDirectory()).resolves.toBe(1);
    const written = JSON.parse(mockPhone.writeDirectory.mock.calls[0][0]);
    expect(written.entries).toHaveLength(1);
    expect(written.labels.openLead).toBe('Open in CRM');
    expect(store.get(STORAGE_KEYS.directorySyncedAt)).toMatch(/^\d+\|1$/);
  });
});
