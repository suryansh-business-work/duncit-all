import { z } from 'zod';
import { toolConfigIssues, type ToolField } from '@duncit/challenges';

type Translate = (key: string) => string;

export const PRESET_NAME_MAX = 80;

/** A named configuration of one tool. The tool is fixed once the preset exists. */
export const buildPresetSchema = (t: Translate, fieldsFor: (toolId: string) => ToolField[]) =>
  z
    .object({
      tool_id: z.string().min(1, t('challenge.presets.errors.tool')),
      name: z.string().trim().min(1, t('challenge.presets.errors.name')).max(PRESET_NAME_MAX, t('challenge.presets.errors.name')),
      active: z.boolean(),
      config: z.record(z.string(), z.unknown()),
    })
    .superRefine((v, ctx) => {
      if (v.tool_id && toolConfigIssues(fieldsFor(v.tool_id), v.config).length) {
        ctx.addIssue({ code: 'custom', path: ['config'], message: t('challenge.tools.errors.config') });
      }
    });

export type PresetFormValues = z.infer<ReturnType<typeof buildPresetSchema>>;
