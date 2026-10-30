import {
  blankPodFormValues,
  buildPodInput,
  makeNativeParityPodConfig,
  makePodSchema,
  type PodFormConfig,
  type PodFormValues,
  fallbackT,
} from '@duncit/pod-form';
import { defineDemo } from '../../types';
import { issueLines } from './issue-lines';

interface FreeArrangementMock {
  config: PodFormConfig;
  /** The window offered to the venue, as ISO strings (the editable JSON has no dates). */
  window: { start: string; end: string };
  values: PodFormValues;
}

/** The `free-arrangement` demo: one justification for a free pod and its free venue. */
export const freeArrangementDemo = defineDemo<FreeArrangementMock>({
  id: 'free-arrangement',
  title: 'Free pods and free venues — why it is free, and the policy accepted',
  note:
    'This is the Partners host form (requireFreeJustification on). The pod is FREE and offers its venue FREE, so ONE justification covers both. Blank free_reason and the schema stops on it; set it to OTHER and free_details is required; set free_accepted to false and it asks for the policy. Once complete, buildPodInput sends it on the pod AND inside venue_offer, at rate 0 whatever venue_offer_rate holds. Turn requireFreeJustification off (a staff editor) and a FREE pod with nothing given saves, but a half-given one does not. Set venue_offer_model to FLAT and the venue needs an amount again.',
  mock: {
    config: { ...makeNativeParityPodConfig({ showProducts: false }), showHosts: false, requireFreeJustification: true },
    window: { start: '2030-06-01T04:30:00.000Z', end: '2030-06-01T06:30:00.000Z' },
    values: {
      ...blankPodFormValues,
      pod_title: 'Lake clean-up morning',
      pod_description: 'A free community clean-up walk around Ulsoor Lake. Gloves and bags provided.',
      club_id: '66f1a2b3c4d5e6f708192a3b',
      pod_mode: 'PHYSICAL',
      venue_id: '66f1a2b3c4d5e6f708192a4c',
      pod_type: 'FREE',
      no_of_spots: 20,
      media_text: 'https://ik.imagekit.io/duncit/pods/lake-cleanup.jpg',
      venue_offer_model: 'FREE',
      venue_offer_offerings: 'Access to the lakeside path\nA spot to keep the supplies',
      free_reason: 'INITIATIVE',
      free_details: '',
      free_accepted: true,
    },
  },
  compute: (mock) => {
    const values = {
      ...mock.values,
      pod_date_time: new Date(mock.window.start),
      pod_end_date_time: new Date(mock.window.end),
    };
    const parsed = makePodSchema(mock.config, fallbackT).safeParse(values);
    const input = buildPodInput(values, { config: mock.config });
    return {
      'This pod is valid': parsed.success,
      'What is still missing': issueLines(parsed),
      'free_justification on the pod': input.free_justification ?? null,
      'venue_offer it sends': input.venue_offer ?? null,
    };
  },
});
