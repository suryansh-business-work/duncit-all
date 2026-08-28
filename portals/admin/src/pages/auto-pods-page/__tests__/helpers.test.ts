import { describe, expect, it } from 'vitest';
import { EM_DASH } from '@duncit/table';
import type { AutoPodStage } from '@duncit/utils';
import {
  clubNameOf,
  hostNameOf,
  isAutoPodCancellable,
  isAutoPodDeletable,
  isAutoPodEditable,
  STAGE_COLOR,
  STAGE_LABEL_KEY,
  stageFilterOptions,
  venueNameOf,
} from '../helpers';
import type { AutoPodTableRow } from '../queries';

const ALL_STAGES: AutoPodStage[] = ['OPEN', 'CLAIMING', 'MATERIALIZING', 'LIVE', 'CANCELLED', 'EXPIRED'];

const makeRow = (over: Partial<AutoPodTableRow> = {}): AutoPodTableRow => ({
  id: 'doc1',
  auto_pod_no: 'AP-1',
  stage: 'OPEN',
  pod_title: 'Weekend Trek',
  pod_description: '',
  pod_info: '',
  pod_hashtag: [],
  pod_images_and_videos: [],
  super_category_id: 'sc1',
  sub_category_id: 'sub1',
  category_name: 'Adventure',
  pod_amount: 500,
  no_of_spots: 10,
  pod_occurrence: 'ONE_TIME',
  payment_terms: null,
  venue_claim: null,
  host_claim: null,
  club_claim: null,
  location: null,
  pod_id: null,
  created_at: '2026-01-02T08:00:00.000Z',
  ...over,
});

describe('auto-pods helpers / stage maps', () => {
  it('gives every stage a literal, greppable translation key', () => {
    expect(STAGE_LABEL_KEY).toEqual({
      OPEN: 'admin.autoPods.stageOpenAnyOrder',
      CLAIMING: 'admin.autoPods.stageClaimingAnyOrder',
      MATERIALIZING: 'admin.autoPods.stageMaterializing',
      LIVE: 'admin.autoPods.stageLive',
      CANCELLED: 'admin.autoPods.stageCancelled',
      EXPIRED: 'admin.autoPods.stageExpired',
    });
  });

  it('colours amber while enrolling, info while materializing, success once live', () => {
    expect(STAGE_COLOR).toEqual({
      OPEN: 'warning',
      CLAIMING: 'warning',
      MATERIALIZING: 'info',
      LIVE: 'success',
      CANCELLED: 'error',
      EXPIRED: 'default',
    });
  });

  it('builds the stage filter options in enrolment order with the translated label', () => {
    const options = stageFilterOptions((key) => `T:${key}`);
    expect(options).toEqual(
      ALL_STAGES.map((stage) => ({ value: stage, label: `T:${STAGE_LABEL_KEY[stage]}` })),
    );
  });
});

describe('auto-pods helpers / lifecycle predicates', () => {
  it('is editable only while OPEN or CLAIMING (pre-live)', () => {
    expect(isAutoPodEditable(makeRow({ stage: 'OPEN' }))).toBe(true);
    expect(isAutoPodEditable(makeRow({ stage: 'CLAIMING' }))).toBe(true);
    expect(isAutoPodEditable(makeRow({ stage: 'MATERIALIZING' }))).toBe(false);
    expect(isAutoPodEditable(makeRow({ stage: 'LIVE' }))).toBe(false);
    expect(isAutoPodEditable(makeRow({ stage: 'CANCELLED' }))).toBe(false);
    expect(isAutoPodEditable(makeRow({ stage: 'EXPIRED' }))).toBe(false);
  });

  it('is cancellable only while pre-live, same as editable', () => {
    expect(isAutoPodCancellable(makeRow({ stage: 'OPEN' }))).toBe(true);
    expect(isAutoPodCancellable(makeRow({ stage: 'CLAIMING' }))).toBe(true);
    expect(isAutoPodCancellable(makeRow({ stage: 'MATERIALIZING' }))).toBe(false);
    expect(isAutoPodCancellable(makeRow({ stage: 'LIVE' }))).toBe(false);
    expect(isAutoPodCancellable(makeRow({ stage: 'CANCELLED' }))).toBe(false);
    expect(isAutoPodCancellable(makeRow({ stage: 'EXPIRED' }))).toBe(false);
  });

  it('is deletable for every stage except LIVE and MATERIALIZING (a real pod exists there)', () => {
    expect(isAutoPodDeletable(makeRow({ stage: 'OPEN' }))).toBe(true);
    expect(isAutoPodDeletable(makeRow({ stage: 'CLAIMING' }))).toBe(true);
    expect(isAutoPodDeletable(makeRow({ stage: 'CANCELLED' }))).toBe(true);
    expect(isAutoPodDeletable(makeRow({ stage: 'EXPIRED' }))).toBe(true);
    expect(isAutoPodDeletable(makeRow({ stage: 'MATERIALIZING' }))).toBe(false);
    expect(isAutoPodDeletable(makeRow({ stage: 'LIVE' }))).toBe(false);
  });
});

describe('auto-pods helpers / claim name lookups', () => {
  it('reads the venue name off the claim, dashing an unclaimed row', () => {
    expect(venueNameOf(makeRow({ venue_claim: null }))).toBe(EM_DASH);
    expect(
      venueNameOf(
        makeRow({
          venue_claim: {
            venue_id: 'v1',
            venue_slot_id: 'slot1',
            owner_user_id: 'u1',
            venue_name: 'Lotus Studio',
            pod_date_time: '2026-02-01T10:00:00.000Z',
            pod_end_date_time: null,
            slot_price: 1000,
            accepted_at: '2026-01-05T00:00:00.000Z',
          },
        }),
      ),
    ).toBe('Lotus Studio');
  });

  it('reads the host name off the claim, dashing an unclaimed row', () => {
    expect(hostNameOf(makeRow({ host_claim: null }))).toBe(EM_DASH);
    expect(
      hostNameOf(
        makeRow({
          host_claim: { user_id: 'u1', host_name: 'Jane Doe', assigned_at: '2026-01-05T00:00:00.000Z' },
        }),
      ),
    ).toBe('Jane Doe');
  });

  it('reads the club name off the claim, dashing an unclaimed row', () => {
    expect(clubNameOf(makeRow({ club_claim: null }))).toBe(EM_DASH);
    expect(
      clubNameOf(
        makeRow({
          club_claim: { club_id: 'c1', club_name: 'Chess Club', user_id: 'u2', claimed_at: '2026-01-05T00:00:00.000Z' },
        }),
      ),
    ).toBe('Chess Club');
  });
});
