import {
  AUTO_POD_TYPE,
  OCCURRENCES,
  POD_MODES,
  POD_TYPES,
  blankAutoPodFormValues,
  blankPodFormValues,
  buildAutoPodInput,
  getProductRequestTotal,
  makeNativeParityPodConfig,
  makePodSchema,
  type PodFormConfig,
  type PodFormValues,
} from '@duncit/pod-form';
import { defineDemo, defineDemos } from '../types';

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
      const schema = makePodSchema(mock.config);
      const parsed = schema.safeParse(mock.values);
      return {
        'Pod types offered': POD_TYPES.map((option) => option.label),
        'Occurrences': OCCURRENCES.map((option) => option.label),
        'Modes': POD_MODES.map((option) => option.label),
        'This draft is valid': parsed.success,
        'What is still missing': issueLines(parsed),
        'Venue extras total': getProductRequestTotal(mock.requests, mock.products),
      };
    },
  }),

  defineDemo<AutoPodMock>({
    id: 'auto-pod',
    title: 'The same form in Auto Pod mode',
    note:
      'Blank sub_category_id and the template stops validating — the category stands in for the club, because an Auto Pod has no club, venue, host or date until partners enrol. Note what buildAutoPodInput leaves out: nothing a partner supplies later ever goes to the server.',
    mock: {
      config: {
        ...makeNativeParityPodConfig({ showProducts: false }),
        autoPod: true,
        showHosts: false,
        showVenueSlot: false,
        showPlaceCharges: true,
        showReel: true,
        showFinance: false,
      },
      values: {
        ...blankAutoPodFormValues,
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
      const parsed = makePodSchema(mock.config).safeParse(mock.values);
      return {
        'Pod type is fixed to': AUTO_POD_TYPE,
        'This template is valid': parsed.success,
        'What is still missing': issueLines(parsed),
        'buildAutoPodInput(values)': buildAutoPodInput(mock.values),
      };
    },
  }),
]);
