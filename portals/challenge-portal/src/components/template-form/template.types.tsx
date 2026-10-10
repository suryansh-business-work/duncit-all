import { z } from 'zod';
import { toolConfigIssues, type ToolField } from '@duncit/challenges';

type Translate = (key: string) => string;

export const TEMPLATE_NAME_MAX = 120;
export const TOTAL_KEY = 'TOTAL';
export const MAX_TOOL_INSTANCES = 12;
export const MAX_TIE_BREAKERS = 3;

const rankKey = z.object({ rank_by: z.string().min(1), direction: z.enum(['ASC', 'DESC']) });

/**
 * A challenge template: identity, optional category scope, the universal tools
 * it combines, and how a winner is decided. Rank keys may only point at TOTAL
 * or at a scoring tool still in the template (the server enforces the same).
 */
export const buildTemplateSchema = (
  t: Translate,
  fieldsFor: (toolId: string) => ToolField[],
  isScoring: (toolId: string) => boolean
) =>
  z
    .object({
      name: z.string().trim().min(1, t('challenge.templates.errors.name')).max(TEMPLATE_NAME_MAX, t('challenge.templates.errors.name')),
      description: z.string(),
      super_id: z.string(),
      category_id: z.string(),
      sub_id: z.string(),
      participant_mode: z.enum(['INDIVIDUAL', 'TEAM']),
      tool_instances: z
        .array(
          z.object({
            instance_id: z.string().min(1),
            tool_id: z.string().min(1),
            tool_type: z.string(),
            preset_id: z.string(),
            label: z.string().trim().min(1, t('challenge.templates.errors.label')),
            config: z.record(z.string(), z.unknown()),
          })
        )
        .max(MAX_TOOL_INSTANCES, t('challenge.templates.errors.tooMany')),
      winner_rules: rankKey.extend({
        tie_breakers: z.array(rankKey).max(MAX_TIE_BREAKERS),
        podium_size: z.number().int().min(1).max(10),
      }),
    })
    .superRefine((v, ctx) => {
      v.tool_instances.forEach((inst, i) => {
        if (toolConfigIssues(fieldsFor(inst.tool_id), inst.config).length) {
          ctx.addIssue({ code: 'custom', path: ['tool_instances', i, 'config'], message: t('challenge.tools.errors.config') });
        }
      });
      const valid = new Set([TOTAL_KEY, ...v.tool_instances.filter((i) => isScoring(i.tool_id)).map((i) => i.instance_id)]);
      const keys = [v.winner_rules, ...v.winner_rules.tie_breakers];
      if (keys.some((k) => !valid.has(k.rank_by))) {
        ctx.addIssue({ code: 'custom', path: ['winner_rules', 'rank_by'], message: t('challenge.templates.errors.rankBy') });
      }
    });

export type TemplateFormValues = z.infer<ReturnType<typeof buildTemplateSchema>>;
export type TemplateInstanceValues = TemplateFormValues['tool_instances'][number];
