import {
  availableModes,
  resolveMode,
  canSwitchVenues,
  defaultVenueId,
  pickVenue,
  venueLabel,
  venueSubLabel,
  canCancelVenuePod,
  cancelDisabledReason,
  cancelPenaltyHeadline,
  venueCancelDisabledText,
  venueCancelPenaltyHeadline,
  venueCancelSuccessMessage,
  tabCounts,
  venueOwnerStatTiles,
  formatMoney,
} from '@duncit/utils';
import { defineDemo, type PackageDemo } from '../../types';
import type { StudioModeMock, VenueSwitcherMock, VenuePodsMock, VenueDashboardMock } from './mocks';
import { mwebT } from './translators';

export const venuesDemos: PackageDemo[] = [
  defineDemo<StudioModeMock>({
    id: 'studio-modes',
    title: 'Which studios a partner may switch into',
    note:
      'Set is_product_visible to false: the ecomm bubble leaves the switcher AND the saved ECOMM mode falls back to USER, so nobody is left sitting in a studio whose pages are gated. Drop ECOMM_MANAGER from roles for the same effect by a different route — a revoked role. mWeb and the native app both read exactly this, so their switchers cannot disagree.',
    mock: {
      roles: ['HOST', 'ECOMM_MANAGER'],
      saved_mode: 'ECOMM',
      is_product_visible: true,
    },
    compute: (mock) => {
      const access = { products: mock.is_product_visible };
      return {
        'Bubbles in the switcher': availableModes(mock.roles, access).map((o) => o.mode),
        'The mode actually in effect': resolveMode(mock.saved_mode, mock.roles, access),
        'If products were on': resolveMode(mock.saved_mode, mock.roles, { products: true }),
        'Can switch at all': availableModes(mock.roles, access).length > 1,
      };
    },
  }),
  defineDemo<VenueSwitcherMock>({
    id: 'venue-switcher',
    title: 'Which venue the Venue Studio is showing',
    note:
      'Set selected_venue_id to null — the studio lands on The Loft, not the first row, because its application is still SUBMITTED and that is the one still needing work; the server picks the same way in its own myVenue. Point it at a venue id that is not in the list and it falls back identically rather than blanking the page. Cut the list down to one venue and canSwitchVenues turns false: the dropdown disappears instead of offering a list of one.',
    mock: {
      venues: [
        { id: 'ven-4d81', venue_name: 'Wknd Coffee', city: 'Lucknow', status: 'APPROVED' },
        { id: 'ven-9a02', venue_name: 'The Loft', city: 'Lucknow', status: 'SUBMITTED' },
        { id: 'ven-2f55', venue_name: 'Indira Nagar Studio', city: 'Lucknow', status: 'APPROVED' },
      ],
      selected_venue_id: 'ven-4d81',
    },
    compute: (mock) => {
      const showing = pickVenue(mock.venues, mock.selected_venue_id);
      return {
        'Draw the dropdown': canSwitchVenues(mock.venues),
        'Venue the page is about': venueLabel(showing, 'Untitled venue'),
        'Line under the name': venueSubLabel(showing),
        'Lands here before anyone picks': venueLabel(
          pickVenue(mock.venues, null),
          'Untitled venue'
        ),
        'Seeded selection id': defaultVenueId(mock.venues),
        'A venue that was deleted': venueLabel(pickVenue(mock.venues, 'ven-gone'), 'Untitled venue'),
      };
    },
  }),
  defineDemo<VenuePodsMock>({
    id: 'venue-pods',
    title: 'Which pods a venue owner may still cancel',
    note:
      'Only the UPCOMING pod offers Cancel; the ONGOING one answers ALREADY_STARTED because the owner may pull the plug before a pod starts, never during it. Stamp a cancelled_at onto the upcoming pod and it turns ALREADY_CANCELLED whatever its bucket says. Set cancel_penalty to 0 and the dialog headline stops promising an Account Health hit; set it to null and it is written without a number rather than a guessed one. The worded lines are those same codes through the mWeb bundle — the venueCancel* helpers both apps render — so set cancel_penalty to 1 or cancel_result.refunded_count to 1 and they go singular.',
    mock: {
      pods: [
        { pod_id: 'DUN-POD-4821', pod_title: 'Sunday Pottery Jam', bucket: 'UPCOMING', cancelled_at: null },
        { pod_id: 'DUN-POD-4977', pod_title: 'Terrace Chess Club', bucket: 'ONGOING', cancelled_at: null },
        { pod_id: 'DUN-POD-4310', pod_title: 'Late Night Standup', bucket: 'COMPLETED', cancelled_at: null },
      ],
      cancel_penalty: 7,
      cancel_result: { pod_id: 'DUN-POD-4821', health_penalty: 7, venue_health_score: 93, refunded_count: 3 },
    },
    compute: (mock) => ({
      'Cancel offered on': mock.pods.filter(canCancelVenuePod).map((pod) => pod.pod_title),
      'Why not, per pod': Object.fromEntries(
        mock.pods.map((pod) => [pod.pod_title, cancelDisabledReason(pod) ?? 'can cancel'])
      ),
      'Why not, as the row menu says it': Object.fromEntries(
        mock.pods.map((pod) => [pod.pod_title, venueCancelDisabledText(pod, mwebT) ?? 'can cancel'])
      ),
      'Dialog headline': cancelPenaltyHeadline(mock.cancel_penalty),
      'Dialog headline, worded': venueCancelPenaltyHeadline(mock.cancel_penalty, mwebT),
      'After cancelling': venueCancelSuccessMessage(mock.cancel_result, mwebT),
      'Tab counts': tabCounts(mock.pods),
    }),
  }),
  defineDemo<VenueDashboardMock>({
    id: 'venue-dashboard',
    title: 'The six tiles on a venue owner’s dashboard',
    note:
      'The tiles come back in the order every surface draws them, each marked money or count so INR formatting is never guessed per app. Change total_venues and nothing moves: the venue counts are the scope of the figures, not a figure, and are never tiled.',
    mock: {
      stats: {
        total_venues: 2,
        approved_venues: 2,
        total_capacity: 140,
        potential_earning: 86500,
        booked_earning: 31200,
        upcoming_slots: 18,
        booked_slots: 7,
        pending_requests: 3,
      },
    },
    compute: (mock) => ({
      Tiles: venueOwnerStatTiles(mock.stats),
      'Money tiles, formatted': venueOwnerStatTiles(mock.stats)
        .filter((tile) => tile.kind === 'money')
        .map((tile) => `${tile.key}: ${formatMoney(tile.value)}`),
    }),
  }),
];
