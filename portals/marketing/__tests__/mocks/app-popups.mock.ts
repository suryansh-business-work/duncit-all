import type { MockedResponse } from '@apollo/client/testing';
import {
  AUDIENCE_LISTS_FOR_POPUP,
  CREATE_APP_POPUP,
  DELETE_APP_POPUP,
  UPDATE_APP_POPUP,
  type AppPopupRow,
} from '../../src/pages/app-popups-page/queries';

/**
 * App popup mocks. Table rows feed the mocked `@duncit/table` directly (typed
 * as the app-level `AppPopupRow`); the audience-list feed and the three
 * mutations flow through `MockedProvider`, so they carry `__typename`.
 */
const DAY_MS = 24 * 60 * 60 * 1000;

/** A popup that is live right now: enabled, started yesterday, ends next week. */
export const makeAppPopupRow = (over: Partial<AppPopupRow> = {}): AppPopupRow => ({
  id: 'pp1',
  name: 'Diwali pod sale',
  image_url: 'https://cdn.duncit.com/app-popups/diwali.jpg',
  start_at: new Date(Date.now() - DAY_MS).toISOString(),
  end_at: new Date(Date.now() + 7 * DAY_MS).toISOString(),
  enabled: true,
  platform: 'BOTH',
  close_button_enabled: true,
  cta_label: 'Shop now',
  cta_url: '/shop',
  audience_type: 'ALL_USERS',
  audience_list_id: null,
  created_at: '2026-09-01T00:00:00.000Z',
  updated_at: '2026-09-01T00:00:00.000Z',
  ...over,
});

export const APP_POPUP_AUDIENCE_LISTS = [
  { __typename: 'AudienceList', id: 'a1', name: 'Pune regulars', member_count: 1284 },
];

export const appPopupAudienceListsMock = (
  lists = APP_POPUP_AUDIENCE_LISTS,
): MockedResponse => ({
  request: { query: AUDIENCE_LISTS_FOR_POPUP },
  result: { data: { audienceLists: lists } },
  maxUsageCount: 20,
});

const typedPopup = (row: AppPopupRow) => ({ __typename: 'AppPopup', ...row });

export const createAppPopupMock = (
  over: Partial<AppPopupRow> = {},
  opts: { failWith?: string; delay?: number } = {},
): MockedResponse => ({
  request: { query: CREATE_APP_POPUP, variables: () => true },
  ...(opts.failWith
    ? { result: { errors: [{ message: opts.failWith }] } }
    : { result: { data: { createAppPopup: typedPopup(makeAppPopupRow(over)) } } }),
  ...(opts.delay ? { delay: opts.delay } : {}),
});

export const updateAppPopupMock = (over: Partial<AppPopupRow> = {}): MockedResponse => ({
  request: { query: UPDATE_APP_POPUP, variables: () => true },
  result: { data: { updateAppPopup: typedPopup(makeAppPopupRow(over)) } },
});

export const deleteAppPopupMock = (opts: { failWith?: string } = {}): MockedResponse => ({
  request: { query: DELETE_APP_POPUP, variables: () => true },
  ...(opts.failWith
    ? { result: { errors: [{ message: opts.failWith }] } }
    : { result: { data: { deleteAppPopup: true } } }),
});
