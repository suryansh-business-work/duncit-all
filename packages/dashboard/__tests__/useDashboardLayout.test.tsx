/**
 * One dashboard's saved arrangement: read from the server, mirrored locally,
 * and — after a save or reset — what this session wrote outranks whatever
 * answer the server sends back next.
 */
import { InMemoryCache } from '@apollo/client';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { MY_DASHBOARD_LAYOUT, RESET_DASHBOARD_LAYOUT, SAVE_DASHBOARD_LAYOUT } from '../src/queries';
import { useDashboardLayout } from '../src/useDashboardLayout';
import type { DashboardLayoutItem } from '../src/types';

const DASHBOARD = 'admin.overview';
const KEY = `duncit.dashboard.layout.${DASHBOARD}`;
const VARIABLES = { dashboard_id: DASHBOARD };

const items: DashboardLayoutItem[] = [
  { id: 'pods', x: 0, y: 0, w: 6, h: 2 },
  { id: 'revenue', x: 6, y: 0, w: 6, h: 2 },
];

const dto = (list: DashboardLayoutItem[]) => ({
  __typename: 'DashboardLayout',
  dashboard_id: DASHBOARD,
  items: list.map((item) => ({
    __typename: 'DashboardLayoutItem',
    widget_id: item.id,
    x: item.x,
    y: item.y,
    w: item.w,
    h: item.h,
  })),
  updated_at: '2026-08-20T00:00:00.000Z',
});

type Payload = ReturnType<typeof dto> | null;

const layoutQuery = (payload: Payload): MockedResponse => ({
  request: { query: MY_DASHBOARD_LAYOUT, variables: VARIABLES },
  result: { data: { myDashboardLayout: payload } },
});

const saveMutation = (list: DashboardLayoutItem[], payload: Payload): MockedResponse => ({
  request: {
    query: SAVE_DASHBOARD_LAYOUT,
    variables: {
      ...VARIABLES,
      items: list.map((item) => ({ widget_id: item.id, x: item.x, y: item.y, w: item.w, h: item.h })),
    },
  },
  result: { data: { saveDashboardLayout: payload } },
});

const resetMutation: MockedResponse = {
  request: { query: RESET_DASHBOARD_LAYOUT, variables: VARIABLES },
  result: { data: { resetDashboardLayout: true } },
};

const cachedItems = (cache: InMemoryCache) =>
  cache.readQuery<{ myDashboardLayout: Payload }>({ query: MY_DASHBOARD_LAYOUT, variables: VARIABLES })
    ?.myDashboardLayout?.items;

const mount = (mocks: MockedResponse[], cache = new InMemoryCache()) => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MockedProvider mocks={mocks} cache={cache}>
      {children}
    </MockedProvider>
  );
  return renderHook(() => useDashboardLayout(DASHBOARD), { wrapper });
};

afterEach(() => {
  globalThis.localStorage.clear();
});

describe('useDashboardLayout', () => {
  it('is not ready until the server answers, then maps its items to slots', async () => {
    const { result } = mount([layoutQuery(dto(items))]);

    expect(result.current.ready).toBe(false);
    expect(result.current.saved).toBeNull();

    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.saved).toEqual(items);
    expect(result.current.loadFailed).toBe(false);
    expect(result.current.saving).toBe(false);
  });

  it('reads "never customised" as an empty list rather than nothing', async () => {
    const { result } = mount([layoutQuery(null)]);

    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.saved).toEqual([]);
  });

  it('paints from the local mirror first, then lets the server replace it', async () => {
    globalThis.localStorage.setItem(KEY, JSON.stringify([items[0]]));
    const { result } = mount([layoutQuery(dto(items))]);

    expect(result.current.ready).toBe(true);
    expect(result.current.saved).toEqual([items[0]]);

    await waitFor(() => expect(result.current.saved).toEqual(items));
  });

  it('reports a failed load and still becomes ready so the defaults can render', async () => {
    const { result } = mount([
      { request: { query: MY_DASHBOARD_LAYOUT, variables: VARIABLES }, error: new Error('offline') },
    ]);

    await waitFor(() => expect(result.current.loadFailed).toBe(true));
    expect(result.current.ready).toBe(true);
    expect(result.current.saved).toBeNull();
  });

  it('save: mirrors locally, sends the server shape, and keeps its own copy over the stale query', async () => {
    const cache = new InMemoryCache();
    const { result } = mount([layoutQuery(dto([items[0]])), saveMutation(items, dto(items))], cache);
    await waitFor(() => expect(result.current.ready).toBe(true));

    await act(async () => {
      await result.current.save(items);
    });

    expect(result.current.saved).toEqual(items);
    expect(JSON.parse(globalThis.localStorage.getItem(KEY) ?? 'null')).toEqual(items);
    expect(cachedItems(cache)).toHaveLength(2);
  });

  it('save: leaves the query cache alone when the server answers with no layout', async () => {
    const cache = new InMemoryCache();
    const { result } = mount([layoutQuery(dto([items[0]])), saveMutation(items, null)], cache);
    await waitFor(() => expect(result.current.ready).toBe(true));

    await act(async () => {
      await result.current.save(items);
    });

    expect(result.current.saved).toEqual(items);
    expect(cachedItems(cache)).toHaveLength(1);
  });

  it('reset: drops the mirror, tells the server, and re-asks for the layout', async () => {
    globalThis.localStorage.setItem(KEY, JSON.stringify(items));
    const { result } = mount([layoutQuery(dto(items)), resetMutation, layoutQuery(null)]);
    await waitFor(() => expect(result.current.saved).toEqual(items));

    await act(async () => {
      await result.current.reset();
    });

    expect(result.current.saved).toEqual([]);
    expect(globalThis.localStorage.getItem(KEY)).toBeNull();
  });
});
