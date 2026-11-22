import { z } from 'zod';
import type { useTranslation } from '@duncit/shell';

type Translate = ReturnType<typeof useTranslation>['t'];

export const KNOWLEDGE_KINDS = ['ARTICLE', 'SOP', 'FAQ', 'POLICY'] as const;
export const KNOWLEDGE_STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const;

/**
 * A knowledge-base article or SOP. Limits mirror the server's
 * (askDuncit.knowledge knowledgeInput); tags are typed comma-separated and
 * split on save. An empty audience means every role.
 */
export const buildAskDuncitKnowledgeSchema = (t: Translate) =>
  z.object({
    title: z.string().trim().min(3, t('ai.askDuncit.validation.titleMin')).max(200, t('ai.askDuncit.validation.titleMax')),
    body: z.string().trim().min(10, t('ai.askDuncit.validation.bodyMin')).max(20_000, t('ai.askDuncit.validation.bodyMax')),
    kind: z.enum(KNOWLEDGE_KINDS),
    status: z.enum(KNOWLEDGE_STATUSES),
    audience_roles: z.array(z.string()).max(9),
    tags: z
      .string()
      .max(800, t('ai.askDuncit.validation.tagsMax'))
      .refine((value) => splitTags(value).length <= 20, t('ai.askDuncit.validation.tagsCount')),
    locale: z.string().trim().max(20, t('ai.askDuncit.validation.localeMax')),
  });

export type AskDuncitKnowledgeValues = z.infer<ReturnType<typeof buildAskDuncitKnowledgeSchema>>;

export function splitTags(value: string): string[] {
  return Array.from(new Set(value.split(',').map((tag) => tag.trim()).filter(Boolean)));
}

export const askDuncitKnowledgeDefaults: AskDuncitKnowledgeValues = {
  title: '',
  body: '',
  kind: 'ARTICLE',
  status: 'DRAFT',
  audience_roles: [],
  tags: '',
  locale: '',
};

export interface AskDuncitKnowledgeFormProps {
  formId: string;
  initialValues: AskDuncitKnowledgeValues;
  onSubmit: (values: AskDuncitKnowledgeValues) => Promise<void>;
}
