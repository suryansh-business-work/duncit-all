import { z } from 'zod';
import type { Translate } from '../fields';

/**
 * Settings › OpenAI API: which Tech portal OpenAI entry Intel calls with.
 * '' = the Tech portal's default entry; otherwise one of the entries offered.
 */
export const makeOpenAiSchema = (t: Translate, entryIds: readonly string[]) =>
  z.object({
    env_entry_id: z.string().refine((v) => v === '' || entryIds.includes(v), t('intel.settings.openai.entryInvalid')),
  });

export type OpenAiValues = z.input<ReturnType<typeof makeOpenAiSchema>>;
export type OpenAiOutput = z.output<ReturnType<typeof makeOpenAiSchema>>;
