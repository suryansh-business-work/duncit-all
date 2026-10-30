import {
  buildHostPodActionLabels,
  buildHostResubmitInput,
  buildPodResubmitSchema,
  podResubmitInitialValues,
  type HostPodTarget,
  type VenueOfferPrefill,
} from '@duncit/host-pod-actions';
import { defineDemo } from '../../types';

/** The venue-declined pod the host is sending a new offer for. */
const DECLINED_POD: HostPodTarget = {
  id: 'DUN-POD-4821',
  pod_title: 'Sunday Badminton Doubles',
  pod_description: 'Friendly doubles at Play Arena. Rackets available on site, shuttles included.',
  pod_images_and_videos: [{ url: 'https://ik.imagekit.io/duncit/pods/badminton-1.jpg', type: 'IMAGE' }],
  venue_id: '66f1a2b3c4d5e6f708192d01',
  venue_approval_status: 'DECLINED',
  no_of_spots: 12,
};

export const resubmitDemo = defineDemo<VenueOfferPrefill>({
  id: 'resubmit-offer',
  title: 'A new offer after a decline — started from the declined terms',
  note:
    'This is what the venue chat\'s "Send a new offer" hands PodResubmitDialog as offerPrefill. The form starts at the pod\'s own venue with that window, space, pets, pricing option, amount, points and note, so the host edits the last offer rather than retyping it. Empty offerings and it refuses: a new offer must say what the host needs from the venue. Set model to PER_PAX or rate to 0 and the form leaves that term for the host to pick again. Set model to FREE and no amount is asked, but the form now wants why the venue is free (free_reason) and the free policy accepted — the errors say so.',
  mock: {
    model: 'PER_GUEST',
    rate: 350,
    offerings: ['Two courts', 'Shuttles'],
    note: 'Doubles only, we start sharp at 7.',
    start_at: '2030-06-01T13:30:00.000Z',
    end_at: '2030-06-01T15:30:00.000Z',
    space_label: 'Court 2',
    pets: false,
  },
  compute: (mock) => {
    const values = podResubmitInitialValues(DECLINED_POD, mock);
    // The labels and the ask's copy are keys here — what the host reads is the catalogue's.
    const parsed = buildPodResubmitSchema(buildHostPodActionLabels((key) => key, 'mweb'), (key) => key).safeParse(values);
    return {
      'The form starts from': values,
      'Ready to send': parsed.success,
      Errors: parsed.success ? [] : parsed.error.issues.map((issue) => `${issue.path.join('.')} — ${issue.message}`),
      'What the server receives': buildHostResubmitInput(values),
    };
  },
});
