import { z } from 'zod';
import { URL_SLUG } from '@duncit/regex';
import type { TutorialTopicInput } from '@duncit/gql-types';
import type { TutorialTopicRow } from '../../queries';

type Translate = (key: string, options?: { vars?: Record<string, string | number> }) => string;

export const TOPIC_FIELD_MAX = 60;

/** Built per render so every message follows the console's language. */
export const topicSchema = (t: Translate) => {
  const tooLong = t('support.tutorialTopics.errMax', { vars: { max: TOPIC_FIELD_MAX } });
  return z.object({
    label: z.string().trim().min(1, t('support.tutorialTopics.errLabel')).max(TOPIC_FIELD_MAX, tooLong),
    key: z
      .string()
      .trim()
      .toLowerCase()
      .max(TOPIC_FIELD_MAX, tooLong)
      .regex(URL_SLUG, t('support.tutorialTopics.errKey')),
    sort_order: z.coerce
      .number({ error: t('support.tutorialTopics.errOrder') })
      .int(t('support.tutorialTopics.errOrder'))
      .min(0, t('support.tutorialTopics.errOrder'))
      .max(9999, t('support.tutorialTopics.errOrder')),
    is_active: z.boolean(),
  });
};

export type TopicFormValues = z.input<ReturnType<typeof topicSchema>>;
export type TopicFormOutput = z.output<ReturnType<typeof topicSchema>>;

export const blankTopicValues = (): TopicFormValues => ({ label: '', key: '', sort_order: 0, is_active: true });

export const toTopicFormValues = (row: TutorialTopicRow): TopicFormValues => ({
  label: row.label,
  key: row.key,
  sort_order: row.sort_order,
  is_active: row.is_active,
});

export const toTopicInput = (values: TopicFormOutput): TutorialTopicInput => ({
  label: values.label,
  key: values.key,
  sort_order: values.sort_order,
  is_active: values.is_active,
});
