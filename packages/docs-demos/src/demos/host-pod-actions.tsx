import {
  POD_DELETE_REASON_SUBJECTS,
  blankPodCompleteValues,
  blankPodEditValues,
  buildCompleteInput,
  buildHostPodActionLabels as buildLabels,
  buildHostUpdateInput,
  buildPodCompleteSchema,
  buildPodEditSchema,
  podEditTicketDiscount,
} from '@duncit/host-pod-actions';
import { buildPodMediaLabels, podFeedbackPath, podMediaLink, podMediaPath } from '@duncit/utils';
import { defineDemo, defineDemos } from '../types';

type PodEditMock = typeof blankPodEditValues & {
  /** `publicAppSettings.ticket_discount_max_pct` — the admin's cap on any tier. */
  ticket_discount_max_pct: number;
};

/** The live pod the host opened: ₹499 a ticket, stored with ONE tier (2+ tickets, 10% off). */
const LIVE_POD = {
  id: 'DUN-POD-4821',
  pod_title: 'Sunday Badminton Doubles',
  pod_type: 'PAID',
  pod_amount: 499,
  no_of_spots: 12,
  ticket_discount_enabled: true,
  ticket_discount_tiers: [{ min_tickets: 2, discount_pct: 10 }],
};

export default defineDemos('host-pod-actions', [
  defineDemo<PodEditMock>({
    id: 'edit',
    title: 'What a host may change on a live pod',
    note:
      'Empty media_text and it refuses: a pod with no image is a pod nobody joins. The host has added a 4+ tickets tier — type 5 into its discount_pct and it goes red (every tier must give more than the one above); drop no_of_spots to 4 and it is out of reach (3 payable seats). Put the tiers back to exactly what the pod stores and nothing is re-checked, so a lowered admin cap never blocks a title fix.',
    mock: {
      ...blankPodEditValues,
      pod_title: 'Sunday Badminton Doubles',
      pod_description:
        'Friendly doubles at Play Arena. Rackets available on site, shuttles included. Beginners very welcome.',
      media_text: 'https://ik.imagekit.io/duncit/pods/badminton-1.jpg',
      no_of_spots: 12,
      ticket_discount_enabled: true,
      ticket_discount_tiers: [
        { min_tickets: 2, discount_pct: 10 },
        { min_tickets: 4, discount_pct: 20 },
      ],
      ticket_discount_max_pct: 50,
    },
    compute: (mock) => {
      const discount = podEditTicketDiscount(LIVE_POD, mock.ticket_discount_max_pct);
      // The messages come from the catalogue, so the schema takes the same
      // labels the dialog renders — the key itself stands in for a translator.
      const parsed = buildPodEditSchema(buildLabels((key) => key, 'mweb'), discount).safeParse(mock);
      return {
        Valid: parsed.success,
        Errors: parsed.success
          ? []
          : parsed.error.issues.map(
              (issue) => `${issue.path.join('.') || '(form)'} — ${issue.message}`
            ),
        'What the server receives': buildHostUpdateInput(mock, {
          includeSpots: true,
          ticketDiscount: discount,
        }),
        'Cancellation reasons offered': POD_DELETE_REASON_SUBJECTS,
      };
    },
  }),

  defineDemo<{ surface: 'mweb' | 'shell' }>({
    id: 'labels',
    title: 'The same menu, in two surfaces\u2019 words',
    note:
      "Switch surface to 'shell'. The actions are identical — only the copy is injected, which is how mWeb and Partners cannot drift on what a host is allowed to do.",
    mock: { surface: 'mweb' },
    compute: (mock) => ({
      // A surface passes its own `t`; echoing the key back makes it obvious
      // WHICH key each label reads, which is the thing that drifts.
      'Labels used': buildLabels((key: string) => key, mock.surface),
      'Pod-media labels used': buildPodMediaLabels((key: string) => key, mock.surface),
    }),
  }),

  defineDemo<{ podId: string; origin: string; venueBill: string }>({
    id: 'pod-links-and-completion',
    title: 'A pod’s two links, and what completing it now sends',
    note:
      'Share and Copy resolve the SAME address per link — one media page per pod, never two. Completing sends no media at all: the release carries the pod’s own photos, which the server reads off the pod, so a pod nobody photographed still pays its host.',
    mock: {
      podId: '665f2c1ab3d4e5f60718293a',
      origin: 'https://duncit.com',
      venueBill: '1500',
    },
    compute: (mock) => {
      const values = { ...blankPodCompleteValues, venue_bill_amount: mock.venueBill };
      const parsed = buildPodCompleteSchema(true, buildLabels((key) => key, 'mweb')).safeParse(
        values
      );
      return {
        'Media upload page': podMediaPath(mock.podId),
        'Link a host shares (before the short link)': podMediaLink(mock.podId, mock.origin),
        'Rating form, for comparison': podFeedbackPath(mock.podId),
        'Venue pod completes': parsed.success,
        'What the server receives': buildCompleteInput(values, mock.podId),
      };
    },
  }),
]);
