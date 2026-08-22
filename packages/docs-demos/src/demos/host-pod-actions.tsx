import {
  POD_DELETE_REASON_SUBJECTS,
  blankPodEditValues,
  buildHostPodActionLabels,
  buildHostUpdateInput,
  podEditSchema,
} from '@duncit/host-pod-actions';
import { defineDemo, defineDemos } from '../types';

type PodEditMock = typeof blankPodEditValues;

export default defineDemos('host-pod-actions', [
  defineDemo<PodEditMock>({
    id: 'edit',
    title: 'What a host may change on a live pod',
    note:
      'Empty media_text and it refuses: a pod with no image is a pod nobody joins. Everything here is screened for content before it saves, which is why the edit is a form and not four inline fields.',
    mock: {
      ...blankPodEditValues,
      pod_title: 'Sunday Badminton Doubles',
      pod_description:
        'Friendly doubles at Play Arena. Rackets available on site, shuttles included. Beginners very welcome.',
      media_text: 'https://ik.imagekit.io/duncit/pods/badminton-1.jpg',
    },
    compute: (mock) => {
      const parsed = podEditSchema.safeParse(mock);
      return {
        Valid: parsed.success,
        Errors: parsed.success
          ? []
          : parsed.error.issues.map(
              (issue) => `${issue.path.join('.') || '(form)'} — ${issue.message}`
            ),
        'What the server receives': buildHostUpdateInput(mock),
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
      'Labels used': buildHostPodActionLabels((key: string) => key, mock.surface),
    }),
  }),
]);
