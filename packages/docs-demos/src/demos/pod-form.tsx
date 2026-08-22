import {
  OCCURRENCES,
  POD_MODES,
  POD_TYPES,
  blankPodFormValues,
  getProductRequestTotal,
  makePodSchema,
  type PodFormConfig,
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
        'What is still missing': parsed.success
          ? []
          : parsed.error.issues
              .map((issue) => `${issue.path.join('.') || '(form)'} — ${issue.message}`)
              .slice(0, 12),
        'Venue extras total': getProductRequestTotal(mock.requests, mock.products),
      };
    },
  }),
]);
