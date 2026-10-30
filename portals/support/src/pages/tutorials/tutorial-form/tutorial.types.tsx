import { z } from 'zod';
import type { TutorialInput, TutorialLanguage, TutorialStatus } from '@duncit/gql-types';
import type { TutorialRow } from '../queries';

type Translate = (key: string, options?: { vars?: Record<string, string | number> }) => string;

export const TUTORIAL_TITLE_MAX = 120;
export const TUTORIAL_DESCRIPTION_MAX = 1000;

const LANGUAGES = ['en', 'hi'] as const satisfies readonly TutorialLanguage[];
const STATUSES = ['DRAFT', 'PUBLISHED'] as const satisfies readonly TutorialStatus[];

/** Built per render so every message follows the console's language. */
export const tutorialSchema = (t: Translate) =>
  z.object({
    title: z
      .string()
      .trim()
      .min(1, t('support.tutorials.errTitle'))
      .max(TUTORIAL_TITLE_MAX, t('support.tutorials.errTitleMax', { vars: { max: TUTORIAL_TITLE_MAX } })),
    description: z
      .string()
      .trim()
      .max(
        TUTORIAL_DESCRIPTION_MAX,
        t('support.tutorials.errDescriptionMax', { vars: { max: TUTORIAL_DESCRIPTION_MAX } }),
      ),
    topic: z.string().trim().min(1, t('support.tutorials.errTopic')),
    language: z.enum(LANGUAGES),
    status: z.enum(STATUSES),
    video_url: z.string().trim().min(1, t('support.tutorials.errVideo')),
    thumbnail_url: z.string().trim(),
    duration_sec: z.number().int().min(0),
    sort_order: z.coerce
      .number({ error: t('support.tutorials.errOrder') })
      .int(t('support.tutorials.errOrder'))
      .min(0, t('support.tutorials.errOrder'))
      .max(9999, t('support.tutorials.errOrder')),
  });

export type TutorialFormValues = z.input<ReturnType<typeof tutorialSchema>>;
export type TutorialFormOutput = z.output<ReturnType<typeof tutorialSchema>>;

export interface TutorialOption {
  value: string;
  label: string;
}

export const blankTutorialValues = (topic = ''): TutorialFormValues => ({
  title: '',
  description: '',
  topic,
  language: 'en',
  status: 'DRAFT',
  video_url: '',
  thumbnail_url: '',
  duration_sec: 0,
  sort_order: 0,
});

export const toTutorialFormValues = (row: TutorialRow): TutorialFormValues => ({
  title: row.title,
  description: row.description,
  topic: row.topic,
  language: row.language,
  status: row.status,
  video_url: row.video_url,
  thumbnail_url: row.thumbnail_url,
  duration_sec: row.duration_sec,
  sort_order: row.sort_order,
});

export const toTutorialInput = (values: TutorialFormOutput): TutorialInput => ({
  title: values.title,
  description: values.description,
  topic: values.topic,
  language: values.language,
  status: values.status,
  video_url: values.video_url,
  thumbnail_url: values.thumbnail_url,
  duration_sec: values.duration_sec,
  sort_order: values.sort_order,
});
