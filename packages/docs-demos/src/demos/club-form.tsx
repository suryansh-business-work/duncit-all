import {
  blankClubFormValues,
  cleanBullets,
  cleanFaqs,
  linesToMedia,
  makeClubSchema,
  type ClubFormConfig,
} from '@duncit/club-form';
import { defineDemo, defineDemos } from '../types';

interface ClubMock {
  config: ClubFormConfig;
  values: typeof blankClubFormValues;
  /** Free-text blocks the form collects one-per-line. */
  media_text: string;
  bullets: string[];
  faqs: { question: string; answer: string }[];
}

export default defineDemos('club-form', [
  defineDemo<ClubMock>({
    id: 'schema',
    title: 'A club, and the text blocks it collects a line at a time',
    note:
      'Add a blank line to media_text or an empty bullet — they are dropped rather than saved, because an empty row in a list renders as a gap nobody put there.',
    mock: {
      config: { showAdmins: true, showVerified: true, showIsActive: true },
      values: {
        ...blankClubFormValues,
        club_name: 'HSR Badminton Club',
        club_description: 'Weekly doubles and coaching for every level, in HSR Layout.',
      },
      media_text:
        'https://ik.imagekit.io/duncit/clubs/hsr-1.jpg\n\nhttps://ik.imagekit.io/duncit/clubs/hsr-2.jpg\n   \nhttps://ik.imagekit.io/duncit/clubs/hsr-intro.mp4',
      bullets: ['Coaching every Tuesday', '', '   ', 'Rackets provided'],
      faqs: [
        { question: 'Do I need my own racket?', answer: 'No — we have spares on site.' },
        { question: '', answer: '' },
      ],
    },
    compute: (mock) => {
      const schema = makeClubSchema(mock.config);
      const parsed = schema.safeParse(mock.values);
      return {
        'This draft is valid': parsed.success,
        'What is still missing': parsed.success
          ? []
          : parsed.error.issues
              .map((issue) => `${issue.path.join('.') || '(form)'} — ${issue.message}`)
              .slice(0, 12),
        'linesToMedia(media_text)': linesToMedia(mock.media_text),
        'cleanBullets(bullets)': cleanBullets(mock.bullets),
        'cleanFaqs(faqs)': cleanFaqs(mock.faqs),
      };
    },
  }),
]);
