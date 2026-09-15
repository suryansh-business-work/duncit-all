import * as yup from 'yup';
import { MAX_LAUNCH_TARGET } from './location.model';

/** A WhatsApp group invite link — the only kind the subscribe page opens. */
const WHATSAPP_GROUP_URL = /^https:\/\/chat\.whatsapp\.com\/\S+$/;

/**
 * The launch fields an admin sets on a city, on create and on update. Null is
 * "not sent" (GraphQL passes an explicit null for a cleared optional input);
 * an empty link is "no group", which is allowed.
 */
export const locationLaunchSchema = yup.object({
  is_active: yup.boolean().nullable(),
  is_launched: yup.boolean().nullable(),
  launch_target: yup
    .number()
    .integer('Launch target must be a whole number')
    .min(1, 'Launch target must be at least 1')
    .max(MAX_LAUNCH_TARGET, `Launch target can be at most ${MAX_LAUNCH_TARGET}`)
    .nullable(),
  whatsapp_group_url: yup
    .string()
    .trim()
    .matches(WHATSAPP_GROUP_URL, {
      message: 'WhatsApp group link must start with https://chat.whatsapp.com/',
      excludeEmptyString: true,
    })
    .nullable(),
});

export type LocationLaunchInput = yup.InferType<typeof locationLaunchSchema>;
