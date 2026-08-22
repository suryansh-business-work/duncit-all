import { podContentSchema } from '@duncit/portal-pod-form';
import { defineDemo, defineDemos } from '../types';

interface ContentMock {
  pod_title: string;
  pod_description: string;
  pod_images_and_videos: { url: string; type?: string | null }[];
}

export default defineDemos('portal-pod-form', [
  defineDemo<ContentMock>({
    id: 'content',
    title: 'The three fields a portal may edit on someone else\u2019s pod',
    note:
      'Deliberately narrow. A portal edits a pod\u2019s CONTENT — title, description, media — and nothing that moves money or a slot, so the schema has exactly three fields and no more.',
    mock: {
      pod_title: 'Sunday Badminton Doubles',
      pod_description: 'Friendly doubles at Play Arena. Rackets available on site.',
      pod_images_and_videos: [
        { url: 'https://ik.imagekit.io/duncit/pods/badminton-1.jpg', type: 'IMAGE' },
        { url: 'https://ik.imagekit.io/duncit/pods/badminton-2.mp4', type: 'VIDEO' },
      ],
    },
    compute: (mock) => {
      const parsed = podContentSchema.safeParse(mock);
      return {
        Valid: parsed.success,
        Errors: parsed.success
          ? []
          : parsed.error.issues.map(
              (issue) => `${issue.path.join('.') || '(form)'} — ${issue.message}`
            ),
        'Parsed values': parsed.success ? parsed.data : 'n/a',
        'What it deliberately cannot change':
          'Price, spots, venue, slot or club — those move money or a booking and belong to the pod\u2019s own editor.',
      };
    },
  }),
]);
