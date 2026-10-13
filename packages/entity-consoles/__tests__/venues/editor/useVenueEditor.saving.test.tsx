import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from '@testing-library/react';
import { venueToValues } from '../../../src/venues/editor/mappers';
import { blankVenueValues } from '../../../src/venues/editor/types';
import {
  ADMIN_CREATE_VENUE,
  ADMIN_UPDATE_VENUE,
  SET_VENUE_DEDUCTIONS,
  SET_VENUE_HOST_REQUEST_LIMIT,
  UPDATE_VENUE_SETTINGS,
} from '../../../src/venues/editor/queries';
import { venueRecord } from '../../fixtures';
import {
  CATAN_TRIPLE,
  QUIZ_TRIPLE,
  VENUE_ID,
  calls,
  configMock,
  loadedEdit,
  mount,
  ops,
  sent,
  venueRef,
  write,
  writeMocks,
} from './useVenueEditor.kit';

/**
 * Saving one venue: one press of Save is up to five writes, and which of them
 * go depends on who is signed in and on what moved.
 */
const session = vi.hoisted(() => ({ roles: ['SUPER_ADMIN'] as string[] }));

vi.mock('@duncit/user-context', () => ({
  useUserData: () => ({ user: { roles: session.roles } }),
}));

beforeEach(() => {
  calls.log.length = 0;
  session.roles = ['SUPER_ADMIN'];
});

describe('useVenueEditor / saving an existing venue', () => {
  it('sends every category and the derived total, then the settings and the percentages', async () => {
    const { result } = await loadedEdit(writeMocks());

    await act(async () => {
      await result.current.editor.submit({ ...venueToValues(venueRecord), capacity: 999 });
    });

    // Neither the live switch nor the request limit moved, so neither is written.
    expect(ops()).toEqual(['update', 'settings', 'deductions']);
    const update = sent('update') as { step1: Record<string, unknown>; status: string; venue_doc_id: string };
    expect(update.venue_doc_id).toBe(VENUE_ID);
    expect(update.status).toBe('APPROVED');
    expect(update.step1.venue_categories).toEqual([CATAN_TRIPLE, QUIZ_TRIPLE]);
    expect(update.step1).not.toHaveProperty('venue_category');
    // 40 + 20 from the named spaces, never the stale scalar.
    expect(update.step1.capacity).toBe(60);
    // The owner's QR ordering is never part of a staff save.
    expect(update.step1).not.toHaveProperty('food_ordering');
    expect(sent('deductions')).toEqual({ venue_doc_id: VENUE_ID, venue_share_pct: 30, venue_commission_pct: 8 });
    expect(result.current.location.pathname).toBe(`/venues/${VENUE_ID}`);
    expect(result.current.editor.saveError).toBeNull();
    expect(result.current.editor.busy).toBe(false);
  });

  it('writes the live switch and the request limit only when they moved', async () => {
    const { result } = await loadedEdit(writeMocks());

    await act(async () => {
      await result.current.editor.submit({
        ...venueToValues(venueRecord),
        is_active: false,
        host_requests_limit_override: '4',
      });
    });

    expect(ops()).toEqual(['update', 'settings', 'deductions', 'active', 'limit']);
    expect(sent('active')).toEqual({ venue_doc_id: VENUE_ID, active: false });
    expect(sent('limit')).toEqual({ venue_doc_id: VENUE_ID, limit: 4 });
  });

  it('writes details only, with no status, for a viewer who may not govern', async () => {
    session.roles = ['ALL_VENUES_ACCESS'];
    const { result } = await loadedEdit(writeMocks());

    await act(async () => {
      await result.current.editor.submit({ ...venueToValues(venueRecord), status: 'REJECTED', is_active: false });
    });

    expect(result.current.editor.canGovern).toBe(false);
    expect(ops()).toEqual(['update', 'settings']);
    expect(sent('update').status).toBeUndefined();
  });

  it('stays on the page with the server message when the write fails', async () => {
    const { result } = await loadedEdit([
      write('update', ADMIN_UPDATE_VENUE, {}, new Error('Select a valid sub category under the chosen category')),
    ]);

    await act(async () => {
      await result.current.editor.submit(venueToValues(venueRecord));
    });

    expect(result.current.editor.saveError).toBe('Select a valid sub category under the chosen category');
    expect(result.current.location.pathname).toBe(`/venues/${VENUE_ID}/edit`);
    expect(result.current.editor.busy).toBe(false);
  });
});

describe('useVenueEditor / registering a venue', () => {
  const draft = () => ({
    ...venueToValues(venueRecord),
    id: '',
    owner_user_id: 'user-77',
  });

  it('creates it under the picked owner with its categories, submitted when the status says so', async () => {
    const { result } = mount('/venues/new', '', [
      configMock(),
      write('create', ADMIN_CREATE_VENUE, { adminCreateVenue: { ...venueRef('venue-new'), status: 'SUBMITTED' } }),
      write('settings', UPDATE_VENUE_SETTINGS, { updateVenueSettings: venueRef('venue-new') }),
      write('deductions', SET_VENUE_DEDUCTIONS, { setVenueDeductions: venueRef('venue-new') }),
      write('limit', SET_VENUE_HOST_REQUEST_LIMIT, {
        setVenueHostRequestLimit: { ...venueRef('venue-new'), host_requests_limit_override: 25 },
      }),
    ]);

    await act(async () => {
      await result.current.editor.submit({ ...draft(), status: 'SUBMITTED' });
    });

    // A new venue has no stored limit, so the typed 25 is a move and is written.
    expect(ops()).toEqual(['create', 'settings', 'deductions', 'limit']);
    const create = sent('create') as { step1: Record<string, unknown>; owner_user_id: string; submit: boolean };
    expect(create.owner_user_id).toBe('user-77');
    expect(create.submit).toBe(true);
    expect(create.step1.venue_categories).toEqual([CATAN_TRIPLE, QUIZ_TRIPLE]);
    expect(sent('settings').venue_doc_id).toBe('venue-new');
    expect(result.current.location.pathname).toBe('/venues/venue-new');
  });

  it('leaves a draft unsubmitted, and sends an empty list for a venue with no category yet', async () => {
    const { result } = mount('/venues/new', '', [
      configMock(),
      write('create', ADMIN_CREATE_VENUE, { adminCreateVenue: { ...venueRef('venue-new'), status: 'DRAFT' } }),
      write('settings', UPDATE_VENUE_SETTINGS, { updateVenueSettings: venueRef('venue-new') }),
      write('deductions', SET_VENUE_DEDUCTIONS, { setVenueDeductions: venueRef('venue-new') }),
    ]);

    await act(async () => {
      await result.current.editor.submit({
        ...draft(),
        status: 'DRAFT',
        categories: [],
        host_requests_limit_override: '',
      });
    });

    const create = sent('create') as { step1: Record<string, unknown>; submit: boolean };
    expect(create.submit).toBe(false);
    expect(create.step1.venue_categories).toEqual([]);
    expect(ops()).toEqual(['create', 'settings', 'deductions']);
  });

  it('refuses to go on when the server answers without an id', async () => {
    const { result } = mount('/venues/new', '', [
      configMock(),
      write('create', ADMIN_CREATE_VENUE, { adminCreateVenue: null }),
    ]);

    await act(async () => {
      await result.current.editor.submit({ ...blankVenueValues, owner_user_id: 'user-77' });
    });

    expect(result.current.editor.saveError).toBe('The venue was not saved — no id came back.');
    expect(ops()).toEqual(['create']);
    expect(result.current.location.pathname).toBe('/venues/new');
  });
});
