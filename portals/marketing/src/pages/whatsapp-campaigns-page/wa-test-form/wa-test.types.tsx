import { z } from 'zod';
import { PHONE_NUMBER_PATTERN } from '@duncit/forms';
import type { Translator } from '@duncit/app-settings';
import type { AisensyButtonInput, AisensyMediaInput } from '../queries';
import {
  emptyTemplateFields,
  refineTemplateFields,
  templateFieldsShape,
  toButtonInputs,
  toMediaInput,
} from '../wa-campaign-form/template-fields';

/**
 * One test message. Unlike a campaign there is no audience and no per-recipient
 * variable: every value here is literal, which is the point — it proves the
 * template and the campaign name before an audience is involved.
 *
 * Everything the TEMPLATE demands is identical to a campaign's, because both go
 * through the same server gate: a test that skipped the header asset would pass
 * here and fail there, which is the opposite of what a test is for.
 */
export const waTestSchema = (t: Translator['t']) =>
  z
    .object({
      wa_campaign_name: z.string().trim().min(1, 'Pick a WhatsApp campaign'),
      destination: z
        .string()
        .trim()
        .regex(PHONE_NUMBER_PATTERN, 'Country code + number, digits only (e.g. 919582998897)'),
      user_name: z.string().trim().min(1, 'User name is required'),
      ...templateFieldsShape(t),
    })
    .superRefine((values, ctx) => {
      refineTemplateFields(values, ctx, t);
    });

export type WaTestValues = z.infer<ReturnType<typeof waTestSchema>>;

export interface WaTestInput {
  wa_campaign_name: string;
  destination: string;
  user_name: string;
  template_params: string[];
  /** Null means "use whatever the campaign was built with in AiSensy". */
  media: AisensyMediaInput | null;
  buttons: AisensyButtonInput[];
}

export const emptyValues = (campaignName: string): WaTestValues => ({
  wa_campaign_name: campaignName,
  destination: '',
  user_name: '',
  ...emptyTemplateFields(),
});

export const toTestInput = (values: WaTestValues): WaTestInput => ({
  wa_campaign_name: values.wa_campaign_name,
  destination: values.destination.trim(),
  user_name: values.user_name.trim(),
  template_params: values.template_params.map((param) => param.value.trim()),
  media: toMediaInput(values),
  buttons: toButtonInputs(values),
});
