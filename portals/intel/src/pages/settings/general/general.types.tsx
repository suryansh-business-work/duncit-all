import { z } from 'zod';

/** Settings › General — the same bounds the server enforces. */

type Translate = (key: string, opts?: { vars?: Record<string, string | number> }) => string;

export const ENV_CHOICES = ['STAGING', 'PRODUCTION', 'BOTH'] as const;

export const makeGeneralSchema = (t: Translate) =>
  z.object({
    app_title: z.string().trim().min(1, t('intel.settings.general.titleRequired')).max(60, t('intel.settings.common.max', { vars: { max: 60 } })),
    description: z.string().trim().max(300, t('intel.settings.common.max', { vars: { max: 300 } })),
    default_environment: z.enum(ENV_CHOICES),
    auto_sync: z.boolean(),
  });

export type GeneralValues = z.input<ReturnType<typeof makeGeneralSchema>>;
export type GeneralOutput = z.output<ReturnType<typeof makeGeneralSchema>>;
