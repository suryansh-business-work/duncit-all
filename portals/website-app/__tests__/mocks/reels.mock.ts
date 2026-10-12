import type { MockedResponse } from '@apollo/client/testing';
import {
  CREATE_WEBSITE_REEL,
  DELETE_WEBSITE_REEL,
  UPDATE_WEBSITE_REEL,
  UPDATE_WEBSITE_REEL_SETTINGS,
  WEBSITE_REEL_SETTINGS,
  WEBSITE_REELS_TABLE,
} from '../../src/pages/website/reels/queries';
import { tablePageMock } from './table';

export interface ReelMock {
  __typename: 'WebsiteReel';
  id: string;
  site: 'MAIN' | 'PARTNERS' | 'CAREERS';
  title: string;
  description: string;
  video_url: string;
  file_size_bytes: number;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export const makeReel = (over: Partial<ReelMock> = {}): ReelMock => ({
  __typename: 'WebsiteReel',
  id: 'r1',
  site: 'MAIN',
  title: 'Sunday jam',
  description: 'A night of music',
  video_url: 'https://ik.test/website/reels/jam.mp4',
  file_size_bytes: 5 * 1024 * 1024,
  sort_order: 1,
  is_active: true,
  created_at: '2026-10-01T10:00:00.000Z',
  ...over,
});

/** The table, recording the variables each fetch was sent with. */
export const reelsTableMock = (rows: ReelMock[], seen: Record<string, unknown>[] = []): MockedResponse => {
  const base = tablePageMock(WEBSITE_REELS_TABLE, 'websiteReelsTable', 'WebsiteReelTablePage', rows);
  return {
    ...base,
    request: {
      ...base.request,
      variables: (variables: Record<string, unknown>) => {
        seen.push(variables);
        return true;
      },
    },
  };
};

export const reelSettingsMock = (over: { max_reel_mb?: number; max_reels?: number; fail?: boolean } = {}): MockedResponse => ({
  request: { query: WEBSITE_REEL_SETTINGS },
  maxUsageCount: Number.POSITIVE_INFINITY,
  ...(over.fail
    ? { error: new Error('settings down') }
    : {
        result: {
          data: {
            websiteReelSettings: {
              __typename: 'WebsiteReelSettings',
              max_reel_mb: over.max_reel_mb ?? 20,
              max_reels: over.max_reels ?? 5,
              updated_at: '2026-10-01T00:00:00.000Z',
            },
          },
        },
      }),
});

type Doc = typeof CREATE_WEBSITE_REEL;

/** A mutation that records the variables it received, then succeeds or fails with `errors`. */
function recorded(query: Doc, data: Record<string, unknown>, seen: Record<string, unknown>[], errors?: { message: string; code?: string }[]): MockedResponse {
  return {
    request: {
      query,
      variables: (variables: Record<string, unknown>) => {
        seen.push(variables);
        return true;
      },
    },
    maxUsageCount: Number.POSITIVE_INFINITY,
    result: errors
      ? { errors: errors.map((e) => ({ message: e.message, extensions: e.code ? { code: e.code } : {} })) as never }
      : { data },
  };
}

export type ReelFailure = { message: string; code?: string }[];

export const createReelMock = (seen: Record<string, unknown>[], fail?: ReelFailure) =>
  recorded(CREATE_WEBSITE_REEL, { createWebsiteReel: { __typename: 'WebsiteReel', id: 'new' } }, seen, fail);
export const updateReelMock = (seen: Record<string, unknown>[], fail?: ReelFailure) =>
  recorded(UPDATE_WEBSITE_REEL, { updateWebsiteReel: { __typename: 'WebsiteReel', id: 'r1' } }, seen, fail);
export const deleteReelMock = (seen: Record<string, unknown>[], fail?: ReelFailure) =>
  recorded(DELETE_WEBSITE_REEL, { deleteWebsiteReel: true }, seen, fail);
export const updateReelSettingsMock = (seen: Record<string, unknown>[], fail?: ReelFailure) =>
  recorded(
    UPDATE_WEBSITE_REEL_SETTINGS,
    {
      updateWebsiteReelSettings: {
        __typename: 'WebsiteReelSettings',
        max_reel_mb: 30,
        max_reels: 4,
        updated_at: '2026-10-02T00:00:00.000Z',
      },
    },
    seen,
    fail,
  );
