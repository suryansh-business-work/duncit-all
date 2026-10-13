import {
  AUTO_POD_ROLES,
  autoPodActionable,
  autoPodCityLabel,
  autoPodEnrolledCount,
  autoPodHostNeedsLocation,
  autoPodMissingRoles,
  autoPodNextRole,
  participationInputFrom,
  podParticipationActions,
  podRefundState,
  shellAutoPodLabels,
  venueCategoryLabels,
  venueCategoryLevelIds,
  venueCategoryList,
  venueCategoryPaths,
  venueHostsSubCategory,
  type VenueCategoryEntry,
} from '@duncit/utils';
import { defineDemo, type PackageDemo } from '../../types';
import type { BookingMock, AutoPodAnyOrderMock } from './mocks';

/** A venue as a client query answers it, and the Auto Pod it is being offered. */
interface VenueCategoriesMock {
  /** Every category the venue belongs to, primary first. Empty it to see the legacy fallback. */
  venue_categories: VenueCategoryEntry[];
  /** The single triple an older build (or an un-migrated venue) carries. */
  venue_category: VenueCategoryEntry | null;
  /** The Auto Pod template's sub category. */
  auto_pod_sub_category_id: string;
}

export const participationAndAutoPodsDemos: PackageDemo[] = [
  defineDemo<BookingMock>({
    id: 'participation',
    title: 'What one booking is actually entitled to',
    note:
      'Flip attended, or add a backout with status SPOT_FILLED, and watch the refund the policy allows change with it.',
    mock: {
      pod_datetime: '2026-09-14T18:30:00.000Z',
      fields: {
        joined_at: '2026-08-30T09:12:00.000Z',
        attended: false,
        attendance_recorded: false,
        refund_status: 'NONE',
        backouts: [
          {
            backout_no: 'DUN-BKO-0912',
            status: 'SPOT_FILLED',
            attempt_no: 1,
            seats: 1,
            seats_before: 1,
            refund_amount: 450,
            coins_refunded: 450,
            refund_status: 'PROCESSED',
            created_at: '2026-09-02T11:40:00.000Z',
          },
        ],
      },
    },
    compute: (mock) => {
      const input = participationInputFrom(mock.fields, mock.pod_datetime);
      const actions = podParticipationActions(input);
      return {
        'podRefundState(...)': podRefundState(input),
        'Can still back out': actions.canBackout,
        'Show the refund state': actions.showRefundState,
        'Coins coming back': actions.coinsRefunded,
        'Joined label': actions.joinedLabelKind,
      };
    },
  }),

  defineDemo<AutoPodAnyOrderMock>({
    id: 'auto-pod-any-order',
    title: 'An Auto Pod enrols in any order, and the first partner pins its city',
    note:
      'A club admin enrolled first here, so the offer is CLAIMING, pinned to Bengaluru by CLUB, and a venue or a host may take it next. Set location to null: it is unpinned again, and with selected_location_id empty the host cannot assign themselves — the city would come from them.',
    mock: {
      row: {
        id: '66f1a2b3c4d5e6f708192d23',
        auto_pod_no: 'APOD-000123',
        stage: 'CLAIMING',
        pod_title: 'Sunday Badminton Doubles',
        pod_description: 'Friendly doubles for intermediate players. Rackets available on site.',
        pod_images_and_videos: [
          { url: 'https://ik.imagekit.io/duncit/pods/badminton-hero.jpg', type: 'IMAGE' },
        ],
        sub_category_id: '66f1a2b3c4d5e6f708192c11',
        category_name: 'Badminton',
        pod_amount: 499,
        no_of_spots: 8,
        venue_claim: null,
        host_claim: null,
        club_claim: {
          club_id: 'club-41',
          club_name: 'Koramangala Smashers',
          user_id: 'u-9',
          claimed_at: '2026-08-26T08:05:00.000Z',
        },
        location: {
          location_id: '66f1a2b3c4d5e6f708192e01',
          location_name: 'Bengaluru',
          country: 'India',
          state: 'Karnataka',
          city: 'Bengaluru',
          bound_by: 'CLUB',
          bound_at: '2026-08-26T08:05:00.000Z',
        },
        viewer_claimed: false,
        pod_id: null,
        expected_host_earnings: 2793,
      },
      selected_location_id: '',
    },
    compute: (mock) => ({
      'autoPodEnrolledCount(row)': autoPodEnrolledCount(mock.row),
      'autoPodMissingRoles(row)': autoPodMissingRoles(mock.row),
      'autoPodNextRole(row)': autoPodNextRole(mock.row),
      'autoPodActionable(row, role)': Object.fromEntries(
        AUTO_POD_ROLES.map((role) => [role, autoPodActionable(mock.row, role)])
      ),
      'autoPodHostNeedsLocation(row, selected_location_id)': autoPodHostNeedsLocation(
        mock.row,
        mock.selected_location_id
      ),
      'autoPodCityLabel(row.location)': autoPodCityLabel(mock.row.location) || '(unpinned)',
    }),
  }),

  defineDemo<VenueCategoriesMock>({
    id: 'venue-categories',
    title: 'A venue in several categories matches on ANY of them',
    note:
      'The Auto Pod here is Hatha yoga — the venue\'s SECOND category, so comparing venue_category alone would hide the venue. Empty venue_categories and the helpers fall back to the single venue_category (a venue stored before the list existed): the venue then hosts badminton only, and no longer matches.',
    mock: {
      venue_categories: [
        {
          super_category_id: '66f1a2b3c4d5e6f708192a01',
          category_id: '66f1a2b3c4d5e6f708192b04',
          sub_category_id: '66f1a2b3c4d5e6f708192c11',
          super_category_name: 'Sports',
          category_name: 'Racket',
          sub_category_name: 'Badminton',
        },
        {
          super_category_id: '66f1a2b3c4d5e6f708192a02',
          category_id: '66f1a2b3c4d5e6f708192b09',
          sub_category_id: '66f1a2b3c4d5e6f708192c27',
          super_category_name: 'Fitness',
          category_name: 'Yoga',
          sub_category_name: 'Hatha',
        },
      ],
      venue_category: {
        super_category_id: '66f1a2b3c4d5e6f708192a01',
        category_id: '66f1a2b3c4d5e6f708192b04',
        sub_category_id: '66f1a2b3c4d5e6f708192c11',
        super_category_name: 'Sports',
        category_name: 'Racket',
        sub_category_name: 'Badminton',
      },
      auto_pod_sub_category_id: '66f1a2b3c4d5e6f708192c27',
    },
    compute: (mock) => {
      const paths = venueCategoryPaths(mock);
      return {
        'venueCategoryList(venue).length': venueCategoryList(mock).length,
        'venueCategoryPaths(venue)': paths,
        'venueHostsSubCategory(venue, auto_pod_sub_category_id)': venueHostsSubCategory(
          mock,
          mock.auto_pod_sub_category_id
        ),
        'Primary-only comparison (the bug this replaces)':
          mock.venue_category?.sub_category_id === mock.auto_pod_sub_category_id,
        "venueCategoryLevelIds(venue, 'category_id') — a nearby search's starting filter": venueCategoryLevelIds(
          mock,
          'category_id'
        ),
        'labels.venueCategories(paths) — the line under the venue picker':
          paths.length > 0 ? shellAutoPodLabels((key, options) => `${key} ${JSON.stringify(options?.vars ?? {})}`).venueCategories(paths) : '(no category — labels.noVenueCategory)',
        'venueCategoryLabels({ category, categories }) — a search card': venueCategoryLabels({
          category: mock.venue_category?.sub_category_name,
          categories: venueCategoryList(mock).map((entry) => entry.sub_category_name ?? ''),
        }),
      };
    },
  }),

];
