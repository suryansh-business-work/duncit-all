import {
  CLUB_ADMIN_CREATE_POD,
  CLUB_ADMIN_POD_CONFIG,
  CLUB_ADMIN_POD_FOR_EDIT,
  CLUB_ADMIN_POD_LOOKUPS,
  CLUB_ADMIN_UPDATE_POD,
  getClubVenueIds,
  blankPodFormValues,
  buildPodInput,
  makePodSchema,
  type PodFormValues,
  fallbackT,
} from '@duncit/pod-form';
import { defineDemo } from '../../types';
import { issueLines } from './issue-lines';

/** A club as `myAdminClubs` returns it — the shape `getClubVenueIds` reads. */
interface ClubAdminMock {
  club: { id: string; club_name: string; meetup_venues_id: string[] };
  /** The venues the admin's lookups returned; only the club's linked ones are bookable. */
  venues: { id: string; venue_name: string }[];
  values: PodFormValues;
}

/** The operation name a document carries — what the network tab shows for it. */
const operationName = (doc: {
  definitions: readonly { kind: string; name?: { value: string } }[];
}) => doc.definitions.find((definition) => definition.kind === 'OperationDefinition')?.name?.value;

/** The `club-admin` demo: the editor both Club Admin surfaces mount. */
export const clubAdminDemo = defineDemo<ClubAdminMock>({
  id: 'club-admin',
  title: 'The Club Admin editor — one config and one set of documents for two surfaces',
  note:
    'The Partners console and mWeb both mount PodEditorPage over useClubAdminPodEditor, which pins every save to the club and searches hosts through clubAdminHostSearch. CLUB_ADMIN_POD_CONFIG is the native-parity form with products on. Edit meetup_venues_id and watch which venues the club may book; the operation names are what the network tab shows on either surface. The pod also offers a multi-ticket discount: make the second tier 10% and the schema refuses it (every tier must give more than the one above), set a tier to 8 tickets and it is past the 7 payable seats, switch pod_type to NATIVE_FREE and the discount goes out cleared.',
  mock: {
    club: {
      id: '66f1a2b3c4d5e6f708192a3b',
      club_name: 'Bengaluru Shuttlers',
      meetup_venues_id: ['66f1a2b3c4d5e6f708192a4c'],
    },
    venues: [
      { id: '66f1a2b3c4d5e6f708192a4c', venue_name: 'Play Arena' },
      { id: '66f1a2b3c4d5e6f708192a4d', venue_name: 'Koramangala Indoor Stadium' },
    ],
    values: {
      ...blankPodFormValues,
      club_id: '66f1a2b3c4d5e6f708192a3b',
      pod_title: 'Sunday Badminton Doubles',
      pod_description: 'Friendly doubles at Play Arena. Rackets available on site.',
      pod_mode: 'PHYSICAL',
      venue_id: '66f1a2b3c4d5e6f708192a4c',
      venue_slot_id: '66f1a2b3c4d5e6f708192a5d',
      pod_type: 'NATIVE_PAID',
      pod_amount: 499,
      pod_occurrence: 'WEEKLY',
      no_of_spots: 8,
      media_text: 'https://ik.imagekit.io/duncit/pods/badminton-hero.jpg',
      ticket_discount_enabled: true,
      ticket_discount_tiers: [{ min_tickets: 2, discount_pct: 10 }, { min_tickets: 4, discount_pct: 20 }],
    },
  },
  compute: (mock) => {
    const linked = new Set(getClubVenueIds(mock.club));
    const parsed = makePodSchema(CLUB_ADMIN_POD_CONFIG, fallbackT).safeParse(mock.values);
    const { ticket_discount_enabled, ticket_discount_tiers } = buildPodInput(mock.values, { config: CLUB_ADMIN_POD_CONFIG });
    return {
      CLUB_ADMIN_POD_CONFIG,
      'Venues this club may book': mock.venues
        .filter((venue) => linked.has(venue.id))
        .map((venue) => venue.venue_name),
      'This pod is valid for a Club Admin': parsed.success,
      'What is still missing': issueLines(parsed),
      'Multi-ticket discount it sends': { ticket_discount_enabled, ticket_discount_tiers },
      'Documents the editor sends': [
        CLUB_ADMIN_POD_LOOKUPS,
        CLUB_ADMIN_POD_FOR_EDIT,
        CLUB_ADMIN_CREATE_POD,
        CLUB_ADMIN_UPDATE_POD,
      ].map(operationName),
    };
  },
});
