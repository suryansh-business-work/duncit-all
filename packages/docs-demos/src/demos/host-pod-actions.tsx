import {
  POD_DELETE_REASON_SUBJECTS,
  blankPodCompleteValues,
  blankPodEditValues,
  buildCompleteInput,
  buildHostPodActionLabels as buildLabels,
  buildHostUpdateInput,
  buildPodCompleteSchema,
  buildPodEditSchema,
  podEditSmartIncentive,
  podEditTicketDiscount,
} from '@duncit/host-pod-actions';
import {
  DEFAULT_SMART_INCENTIVE_DELAY_SECONDS,
  buildPodMediaLabels,
  podFeedbackPath,
  podMediaLink,
  podMediaPath,
} from '@duncit/utils';
import { defineDemo, defineDemos } from '../types';
import { resubmitDemo } from './host-pod-actions/resubmit-demo';

type PodEditMock = typeof blankPodEditValues & {
  /** `publicAppSettings.ticket_discount_max_pct` — the admin's cap on any tier. */
  ticket_discount_max_pct: number;
  /** Loyalty > Smart Incentive's `max_discount_pct` — the biggest offer a host may choose. */
  smart_incentive_max_pct: number;
};

/** The live pod the host opened: ₹499 a ticket, stored with ONE tier (2+ tickets, 10% off) and a 10% Smart Incentive. */
const LIVE_POD = {
  id: 'DUN-POD-4821',
  pod_title: 'Sunday Badminton Doubles',
  pod_type: 'PAID',
  pod_amount: 499,
  no_of_spots: 12,
  ticket_discount_enabled: true,
  ticket_discount_tiers: [{ min_tickets: 2, discount_pct: 10 }],
  smart_incentive_enabled: true,
  smart_incentive_pct: 10,
};

export default defineDemos('host-pod-actions', [
  defineDemo<PodEditMock>({
    id: 'edit',
    title: 'What a host may change on a live pod',
    note:
      'Empty media_text and it refuses: a pod with no image is a pod nobody joins. The host has added a 4+ tickets tier — type 5 into its discount_pct and it goes red (every tier must give more than the one above); drop no_of_spots to 4 and it is out of reach (3 payable seats). Put the tiers back to exactly what the pod stores and nothing is re-checked, so a lowered admin cap never blocks a title fix. The host is also raising the Smart Incentive from 10% to 15%: type 25 into smart_incentive_pct and it goes red (Loyalty caps it at smart_incentive_max_pct). Drop smart_incentive_max_pct to 5 and put the percentage back to 10, what the pod stores, and nothing is re-checked; switch smart_incentive_enabled off and the server receives 0%.',
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
      smart_incentive_enabled: true,
      smart_incentive_pct: '15',
      smart_incentive_max_pct: 20,
    },
    compute: (mock) => {
      const discount = podEditTicketDiscount(LIVE_POD, mock.ticket_discount_max_pct);
      const incentive = podEditSmartIncentive(LIVE_POD, {
        enabled: true,
        maxPct: mock.smart_incentive_max_pct,
        delaySeconds: DEFAULT_SMART_INCENTIVE_DELAY_SECONDS,
      });
      // The messages come from the catalogue, so the schema takes the same
      // labels the dialog renders — the key itself stands in for a translator.
      const labels = buildLabels((key) => key, 'mweb');
      const parsed = buildPodEditSchema(labels, discount, incentive).safeParse(mock);
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
          smartIncentive: incentive,
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

  defineDemo<{ podId: string; origin: string; venueBill: string; billFile: string; extraCharges: string }>({
    id: 'pod-links-and-completion',
    title: 'A pod’s two links, and what completing it now sends',
    note:
      'Share and Copy resolve the SAME address per link — one media page per pod, never two. A paid pod at a venue must upload the venue’s final bill (its total AND the file) as proof of the agreed amount: empty either and it refuses. Anything the venue charged beyond that goes in extraCharges (0–1000000) and is paid on top once Finance approves it — the input always carries venue_extra_amount and never include_slot_price. Completing sends no media: the release carries the pod’s own photos, which the server reads off the pod.',
    mock: {
      podId: '665f2c1ab3d4e5f60718293a',
      origin: 'https://duncit.com',
      venueBill: '1500',
      billFile: 'https://ik.imagekit.io/duncit/pod-completion/venue-bill.pdf',
      extraCharges: '250',
    },
    compute: (mock) => {
      const values = {
        ...blankPodCompleteValues,
        venue_bill_amount: mock.venueBill,
        venue_bill_media: mock.billFile,
        venue_extra_amount: mock.extraCharges,
      };
      const parsed = buildPodCompleteSchema(true, buildLabels((key) => key, 'mweb')).safeParse(
        values
      );
      return {
        'Media upload page': podMediaPath(mock.podId),
        'Link a host shares (before the short link)': podMediaLink(mock.podId, mock.origin),
        'Rating form, for comparison': podFeedbackPath(mock.podId),
        'Paid venue pod completes': parsed.success,
        Errors: parsed.success
          ? []
          : parsed.error.issues.map((issue) => `${issue.path.join('.')} — ${issue.message}`),
        'What the server receives': buildCompleteInput(values, mock.podId),
      };
    },
  }),

  resubmitDemo,
]);
