import {
  AUTO_POD_AUDIENCE_ROLES,
  AUTO_POD_DETAIL_FIELDS,
  AUTO_POD_TYPE,
  audienceCount,
  CLUB_ADMIN_CREATE_POD,
  CLUB_ADMIN_POD_CONFIG,
  CLUB_ADMIN_POD_FOR_EDIT,
  CLUB_ADMIN_POD_LOOKUPS,
  CLUB_ADMIN_UPDATE_POD,
  getClubVenueIds,
  OCCURRENCES,
  POD_MODES,
  POD_TYPES,
  blankAutoPodFormValues,
  blankPodFormValues,
  buildAutoPodInput,
  getProductRequestTotal,
  makeNativeParityPodConfig,
  makePodSchema,
  type AutoPodAudience,
  type PodFormConfig,
  type PodFormValues,
  fallbackT,
} from '@duncit/pod-form';
import { defineDemo, defineDemos } from '../types';

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

interface PodMock {
  /** Which surface is asking: Admin sees everything, Club Admin does not. */
  config: PodFormConfig;
  values: typeof blankPodFormValues;
  /** The venue extras the host asked for, and what they cost. */
  products: { id: string; unit_cost: number }[];
  requests: { product_id: string; quantity: number }[];
}

/** An Auto Pod template: the same form, with `autoPod` on and no partner fields. */
interface AutoPodMock {
  config: PodFormConfig;
  values: PodFormValues;
  /** What step 1 counted for the chosen category — every count must be above zero. */
  audience: AutoPodAudience;
}

/** What a Zod result says is still missing, one line per issue. */
const issueLines = (parsed: ReturnType<ReturnType<typeof makePodSchema>['safeParse']>) =>
  parsed.success
    ? []
    : parsed.error.issues
        .map((issue) => `${issue.path.join('.') || '(form)'} — ${issue.message}`)
        .slice(0, 12);

export default defineDemos('pod-form', [
  defineDemo<PodMock>({
    id: 'schema',
    title: 'One pod form, configured per surface',
    note:
      'Turn showFinance off and the money rules stop applying; turn showVenueSlot off and the slot stops being required. The same component and the same schema serve Admin and Club Admin — the config is the only difference.',
    mock: {
      config: {
        showHosts: true,
        showLocationZone: false,
        showVenueSlot: true,
        showPlaceCharges: true,
        showInventory: true,
        showFinance: true,
        showIsActive: true,
        showProducts: true,
        requireHosts: true,
        singleHost: true,
      },
      values: {
        ...blankPodFormValues,
        pod_title: 'Sunday Badminton Doubles',
        pod_description: 'Friendly doubles at Play Arena. Rackets available on site.',
      },
      products: [
        { id: 'prod-1', unit_cost: 450 },
        { id: 'prod-2', unit_cost: 120 },
      ],
      requests: [
        { product_id: 'prod-1', quantity: 2 },
        { product_id: 'prod-2', quantity: 4 },
      ],
    },
    compute: (mock) => {
      const schema = makePodSchema(mock.config, fallbackT);
      const parsed = schema.safeParse(mock.values);
      return {
        // The menus name their copy rather than carrying it (rule 38), so a
        // reader sees the same words the form draws.
        'Pod types offered': POD_TYPES.map((option) => fallbackT(option.labelKey)),
        'Occurrences': OCCURRENCES.map((option) => fallbackT(option.labelKey)),
        'Modes': POD_MODES.map((option) => fallbackT(option.labelKey)),
        'This draft is valid': parsed.success,
        'What is still missing': issueLines(parsed),
        'Venue extras total': getProductRequestTotal(mock.requests, mock.products),
      };
    },
  }),

  defineDemo<AutoPodMock>({
    id: 'auto-pod',
    title: 'The same form in Auto Pod mode — a three-step stepper',
    note:
      'Blank sub_category_id and the template stops validating — the category stands in for the club, because an Auto Pod has no club, venue or host until partners enrol. Set host_count to 0 and step 2 stays shut. Switch pod_mode to VIRTUAL and a meeting link plus a start and end become required, because no venue will bring them. Note what buildAutoPodInput leaves out: nothing a partner supplies later ever goes to the server.',
    mock: {
      config: {
        ...makeNativeParityPodConfig({ showProducts: true }),
        autoPod: true,
        showAutoPodAudience: true,
        showHosts: false,
        showVenueSlot: false,
        showPlaceCharges: false,
        showReel: true,
        showFinance: false,
      },
      audience: {
        venue_count: 4,
        host_count: 11,
        club_admin_count: 3,
        venues: [
          { id: '66f1a2b3c4d5e6f708192d01', venue_name: 'Play Arena', city: 'Bengaluru', locality: 'HSR Layout', owner_name: 'Om Prakash' },
        ],
        hosts: [{ user_id: '66f1a2b3c4d5e6f708192e01', full_name: 'Asha Rao', email: 'asha@duncit.com', phone: '9876543210' }],
        club_admins: [
          { user_id: '66f1a2b3c4d5e6f708192f01', full_name: 'Neha Iyer', email: 'neha@duncit.com', club_names: ['Bengaluru Shuttlers'] },
        ],
      },
      values: {
        ...blankAutoPodFormValues,
        pod_mode: 'PHYSICAL',
        pod_title: 'Sunday Badminton Doubles',
        pod_description: 'Friendly doubles for intermediate players. Rackets available on site.',
        super_category_id: '66f1a2b3c4d5e6f708192c01',
        sub_category_id: '66f1a2b3c4d5e6f708192c11',
        pod_amount: 499,
        no_of_spots: 8,
        pod_occurrence: 'WEEKLY',
        pod_hashtag_text: '#badminton #bengaluru',
        media_text: 'https://ik.imagekit.io/duncit/pods/badminton-hero.jpg',
      },
    },
    compute: (mock) => {
      const parsed = makePodSchema(mock.config, fallbackT).safeParse(mock.values);
      return {
        'Pod type is fixed to': AUTO_POD_TYPE,
        'Step 2 opens (every count above zero)': AUTO_POD_AUDIENCE_ROLES.every(
          (role) => audienceCount(mock.audience, role) > 0,
        ),
        'Fields step 2 validates before the review': AUTO_POD_DETAIL_FIELDS.length,
        'This template is valid': parsed.success,
        'What is still missing': issueLines(parsed),
        'buildAutoPodInput(values)': buildAutoPodInput(mock.values),
      };
    },
  }),

  defineDemo<ClubAdminMock>({
    id: 'club-admin',
    title: 'The Club Admin editor — one config and one set of documents for two surfaces',
    note:
      'The Partners console and mWeb both mount PodEditorPage over useClubAdminPodEditor, which pins every save to the club and searches hosts through clubAdminHostSearch. CLUB_ADMIN_POD_CONFIG is the native-parity form with products on. Edit meetup_venues_id and watch which venues the club may book; the operation names are what the network tab shows on either surface.',
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
      },
    },
    compute: (mock) => {
      const linked = new Set(getClubVenueIds(mock.club));
      const parsed = makePodSchema(CLUB_ADMIN_POD_CONFIG, fallbackT).safeParse(mock.values);
      return {
        CLUB_ADMIN_POD_CONFIG,
        'Venues this club may book': mock.venues
          .filter((venue) => linked.has(venue.id))
          .map((venue) => venue.venue_name),
        'This pod is valid for a Club Admin': parsed.success,
        'What is still missing': issueLines(parsed),
        'Documents the editor sends': [
          CLUB_ADMIN_POD_LOOKUPS,
          CLUB_ADMIN_POD_FOR_EDIT,
          CLUB_ADMIN_CREATE_POD,
          CLUB_ADMIN_UPDATE_POD,
        ].map(operationName),
      };
    },
  }),
]);
