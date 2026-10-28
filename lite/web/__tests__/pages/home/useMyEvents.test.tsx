import { waitFor } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { describe, expect, it } from 'vitest';
import { parseApiError } from '@duncit/utils';
import type { LiteEventCard } from '../../../../shared/graphql/documents';
import { LITE_MY_EVENTS } from '../../../graphql/events';
import { mergeMyEvents, useMyEvents } from '../../../pages/home/useMyEvents';
import { eventCardFixture, meFixture, renderHookWithProviders } from '../../test-utils';

const at = (id: string, start: string) => eventCardFixture({ id, slug: id, title: id, start_at: start, end_at: start });

const early = at('early', '2026-11-01T10:00:00.000Z');
const middle = at('middle', '2026-11-10T10:00:00.000Z');
const late = at('late', '2026-11-20T10:00:00.000Z');

const myEvents = (scope: 'HOSTING' | 'ATTENDING', past: boolean, rows: LiteEventCard[]): MockedResponse => ({
  request: { query: LITE_MY_EVENTS, variables: { scope, past } },
  result: { data: { liteMyEvents: rows } },
});

describe('mergeMyEvents', () => {
  it('puts hosted and attended events in one list, soonest first', () => {
    const rows = mergeMyEvents([late], [early, middle], false);
    expect(rows.map((row) => [row.event.id, row.role])).toEqual([
      ['early', 'ATTENDING'],
      ['middle', 'ATTENDING'],
      ['late', 'HOSTING'],
    ]);
  });

  it('lists the past latest first', () => {
    const rows = mergeMyEvents([early], [late, middle], true);
    expect(rows.map((row) => row.event.id)).toEqual(['late', 'middle', 'early']);
  });

  it('keeps one row per event, as hosting, when the reader both hosts and holds a ticket', () => {
    const rows = mergeMyEvents([middle], [middle, early], false);
    expect(rows).toHaveLength(2);
    expect(rows.find((row) => row.event.id === 'middle')?.role).toBe('HOSTING');
  });

  it('answers an empty list when there is nothing on either side', () => {
    expect(mergeMyEvents([], [], false)).toEqual([]);
  });
});

describe('useMyEvents', () => {
  it('reads hosting and attending for the period and merges them', async () => {
    const { result } = renderHookWithProviders(() => useMyEvents(false), {
      me: meFixture(),
      mocks: [myEvents('HOSTING', false, [late]), myEvents('ATTENDING', false, [early])],
    });
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeUndefined();
    expect(result.current.rows.map((row) => [row.event.id, row.role])).toEqual([
      ['early', 'ATTENDING'],
      ['late', 'HOSTING'],
    ]);
  });

  it('reads the past period when asked', async () => {
    const { result } = renderHookWithProviders(() => useMyEvents(true), {
      me: meFixture(),
      mocks: [myEvents('HOSTING', true, [early]), myEvents('ATTENDING', true, [late])],
    });
    await waitFor(() => expect(result.current.rows).toHaveLength(2));
    expect(result.current.rows.map((row) => row.event.id)).toEqual(['late', 'early']);
  });

  it('reports the first read that failed', async () => {
    const refused: MockedResponse = { request: { query: LITE_MY_EVENTS, variables: { scope: 'HOSTING', past: false } }, result: { errors: [{ message: 'Sign in again' }] } };
    const { result } = renderHookWithProviders(() => useMyEvents(false), {
      me: meFixture(),
      mocks: [refused, myEvents('ATTENDING', false, [early])],
    });
    await waitFor(() => expect(result.current.error).toBeDefined());
    expect(parseApiError(result.current.error)).toBe('Sign in again');
    await waitFor(() => expect(result.current.loading).toBe(false));
  });
});
