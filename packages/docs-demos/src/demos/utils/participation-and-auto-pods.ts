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
} from '@duncit/utils';
import { defineDemo, type PackageDemo } from '../../types';
import type { BookingMock, AutoPodAnyOrderMock } from './mocks';

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

];
