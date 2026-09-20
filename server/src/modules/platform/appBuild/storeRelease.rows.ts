import type { ReleaseStore } from './storeRelease.model';

/**
 * One release as the Releases table draws it, whichever store it came from.
 * The two stores describe a release in different words — Apple has a version
 * with a review state, Google a track with a rollout — so each reader folds
 * its own words into `status`, and keeps the store's own word in `state` for
 * the reader who wants it exactly.
 */

export type StoreReleaseStatus =
  | 'PREPARING'
  | 'WAITING'
  | 'IN_REVIEW'
  | 'APPROVED'
  | 'LIVE'
  | 'TESTING'
  | 'ROLLING_OUT'
  | 'HALTED'
  | 'REJECTED'
  | 'WITHDRAWN'
  | 'REPLACED'
  | 'REMOVED'
  | 'OTHER';

export interface StoreReleaseRow {
  /** Stable across reads: the store plus its own id for the release. */
  id: string;
  store: ReleaseStore;
  version: string;
  /** CFBundleVersion on Apple; the version code(s) on Play. */
  build_number: string;
  /** The store's own word. */
  state: string;
  status: StoreReleaseStatus;
  /** Play's track. Empty on Apple. */
  track: string;
  /** Apple's review-submission state for the version. Empty on Play. */
  review_state: string;
  created_at: string | null;
  submitted_at: string | null;
  /** Play's staged rollout, 0–100. Null when not staged. */
  rollout_pct: number | null;
  /** Apple's version id / Play's release name — what an issue is matched on. */
  store_ref: string;
}

/** Apple's states folded to the table's. Anything unlisted is OTHER, shown with its own word. */
const APPLE_STATUS: Record<string, StoreReleaseStatus> = {
  PREPARE_FOR_SUBMISSION: 'PREPARING',
  READY_FOR_REVIEW: 'PREPARING',
  WAITING_FOR_REVIEW: 'WAITING',
  WAITING_FOR_EXPORT_COMPLIANCE: 'WAITING',
  PENDING_CONTRACT: 'WAITING',
  IN_REVIEW: 'IN_REVIEW',
  ACCEPTED: 'APPROVED',
  PENDING_DEVELOPER_RELEASE: 'APPROVED',
  PENDING_APPLE_RELEASE: 'APPROVED',
  PROCESSING_FOR_DISTRIBUTION: 'APPROVED',
  PROCESSING_FOR_APP_STORE: 'APPROVED',
  READY_FOR_DISTRIBUTION: 'LIVE',
  READY_FOR_SALE: 'LIVE',
  REPLACED_WITH_NEW_VERSION: 'REPLACED',
  REJECTED: 'REJECTED',
  METADATA_REJECTED: 'REJECTED',
  INVALID_BINARY: 'REJECTED',
  DEVELOPER_REJECTED: 'WITHDRAWN',
  DEVELOPER_REMOVED_FROM_SALE: 'REMOVED',
  REMOVED_FROM_SALE: 'REMOVED',
};

export const appleStatus = (state: string): StoreReleaseStatus => APPLE_STATUS[state] ?? 'OTHER';

/** The one Apple state where the store is done and a person is not. */
export const APPLE_AWAITING_RELEASE = 'PENDING_DEVELOPER_RELEASE';

/** Play's release status on a track, folded the same way. */
export function playStatus(track: string, releaseStatus: string): StoreReleaseStatus {
  if (releaseStatus === 'draft') return 'PREPARING';
  if (releaseStatus === 'halted') return 'HALTED';
  if (releaseStatus === 'inProgress') return 'ROLLING_OUT';
  if (releaseStatus === 'completed') return track === 'production' ? 'LIVE' : 'TESTING';
  return 'OTHER';
}
