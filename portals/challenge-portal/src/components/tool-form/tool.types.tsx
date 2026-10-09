import { z } from 'zod';
import { toolConfigIssues, type ToolField } from '@duncit/challenges';

type Translate = (key: string, options?: { vars?: Record<string, string | number> }) => string;

export const TOOL_NAME_MAX = 80;
export const TOOL_DESCRIPTION_MAX = 500;

/** Tool Master settings: identity, status, default settings and mapped categories. */
export const buildToolSchema = (t: Translate, fields: ToolField[]) =>
  z
    .object({
      name: z.string().trim().min(1, t('challenge.tools.errors.name')).max(TOOL_NAME_MAX, t('challenge.tools.errors.name')),
      description: z.string().max(TOOL_DESCRIPTION_MAX, t('challenge.tools.errors.description')),
      active: z.boolean(),
      config: z.record(z.string(), z.unknown()),
      category_ids: z.array(z.string()),
    })
    .superRefine((v, ctx) => {
      if (toolConfigIssues(fields, v.config).length) {
        ctx.addIssue({ code: 'custom', path: ['config'], message: t('challenge.tools.errors.config') });
      }
    });

export type ToolFormValues = z.infer<ReturnType<typeof buildToolSchema>>;
