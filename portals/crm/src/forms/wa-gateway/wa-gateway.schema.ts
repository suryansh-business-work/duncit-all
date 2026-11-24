import { z } from 'zod';
import type { Translate } from './wa-gateway.types';

/** Longest API key accepted. Gateway keys are ~70 characters; this only stops a pasted page. */
export const WA_API_KEY_MAX = 512;

/**
 * Step 1 of the WhatsApp Lead Generator: the OpenWA gateway URL and its API key.
 * The key is required until one is saved; after that a blank field keeps it.
 * The server repeats both checks and also asks the gateway whether the key works.
 */
export const waGatewaySchema = (t: Translate, hasKey: boolean) =>
  z
    .object({
      base_url: z.string().trim().min(1, t('crm.tools.gatewayUrlRequired')).pipe(z.httpUrl(t('crm.tools.gatewayUrlInvalid'))),
      api_key: z.string().trim().max(WA_API_KEY_MAX, t('crm.tools.apiKeyTooLong')),
    })
    .superRefine((values, ctx) => {
      if (!hasKey && !values.api_key) {
        ctx.addIssue({ code: 'custom', path: ['api_key'], message: t('crm.tools.apiKeyRequired') });
      }
    });

export type WaGatewayFormValues = z.infer<ReturnType<typeof waGatewaySchema>>;
