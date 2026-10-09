import { z } from 'zod';
import type { Translate } from '../i18n';

/** Upper bound for the per-category competitor limit (0 = no limit). */
export const MAX_COMPETITORS_LIMIT = 1000;

export const buildChallengeMappingSchema = (t: Translate) =>
  z.object({
    enabled: z.boolean(),
    allowed_tool_ids: z.array(z.string()),
    preset_ids: z.array(z.string()),
    default_template_id: z.string(),
    allow_host_customization: z.boolean(),
    show_on_pod_details_default: z.boolean(),
    allow_audience_voting: z.boolean(),
    require_challenge: z.boolean(),
    max_competitors: z
      .number({ error: t('challenge.mapping.errors.maxCompetitors') })
      .int(t('challenge.mapping.errors.maxCompetitors'))
      .min(0, t('challenge.mapping.errors.maxCompetitors'))
      .max(MAX_COMPETITORS_LIMIT, t('challenge.mapping.errors.maxCompetitors')),
  })
  // Turning challenges on with nothing to run would offer hosts an empty picker.
  .refine((v) => !v.enabled || v.allowed_tool_ids.length > 0, {
    path: ['allowed_tool_ids'],
    message: t('challenge.mapping.errors.toolsRequired'),
  });

export type ChallengeMappingValues = z.infer<ReturnType<typeof buildChallengeMappingSchema>>;

export interface MappingOption {
  id: string;
  label: string;
  /** For presets: the tool it configures. For templates: the tools it needs. */
  toolIds: string[];
}

export interface ChallengeMappingOptions {
  tools: MappingOption[];
  presets: MappingOption[];
  templates: MappingOption[];
}
