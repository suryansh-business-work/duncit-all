import { z } from 'zod';
import type { WaCampaignRow } from '../queries';

/**
 * A WhatsApp send. The message body is not here — it lives in the approved
 * template on AiSensy; this form only picks the template, who receives it, and
 * what fills the template's variables.
 */

/** The four ways to say who receives this. Each carries exactly one thing, so
 * the send can never claim two recipient lists at once. */
export const WA_AUDIENCES = [
  'ALL_USERS',
  'AUDIENCE_LIST',
  'SPECIFIC_USERS',
  'MANUAL_NUMBERS',
] as const;
export type WaAudience = (typeof WA_AUDIENCES)[number];

/** A picked account keeps its name in the form so the chip can be read; only
 * the id is sent. */
const pickedUserSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim(),
});

const manualContactSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120, 'Keep the name under 120 characters'),
  extension: z
    .string()
    .trim()
    .regex(/^\d{1,4}$/, 'Country code is 1–4 digits, e.g. 91'),
  number: z
    .string()
    .trim()
    .regex(/^\d{6,12}$/, 'Number is 6–12 digits, without the country code'),
});

export const waCampaignSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(3, 'Give this campaign a name of at least 3 characters')
      .max(120, 'Keep the name under 120 characters'),
    wa_campaign_name: z.string().trim().min(1, 'Pick a WhatsApp campaign name'),
    audience: z.enum(WA_AUDIENCES),
    audience_list_id: z.string().trim(),
    users: z.array(pickedUserSchema),
    contacts: z.array(manualContactSchema),
    template_params: z.array(
      z.object({ value: z.string().trim().min(1, 'Fill this parameter or remove it') })
    ),
    /** ISO time to send at; empty sends as soon as it is submitted. */
    scheduled_at: z.string(),
  })
  .superRefine((values, ctx) => {
    if (values.audience === 'AUDIENCE_LIST' && !values.audience_list_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['audience_list_id'],
        message: 'Pick the audience list to send to',
      });
    }
    if (values.audience === 'SPECIFIC_USERS' && values.users.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['users'],
        message: 'Pick at least one person to send to',
      });
    }
    if (values.audience === 'MANUAL_NUMBERS' && values.contacts.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['contacts'],
        message: 'Add at least one contact to send to',
      });
    }
    // A time already gone would send immediately, which is not what picking a
    // time means — say so rather than sending.
    if (values.scheduled_at && new Date(values.scheduled_at).getTime() <= Date.now()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['scheduled_at'],
        message: 'Pick a time in the future',
      });
    }
  });

export type WaCampaignValues = z.infer<typeof waCampaignSchema>;
export type WaManualContactValue = z.infer<typeof manualContactSchema>;

export interface SendWaCampaignInput {
  name: string;
  wa_campaign_name: string;
  audience: string;
  audience_list_id: string | null;
  user_ids: string[];
  contacts: WaManualContactValue[];
  template_params: string[];
  scheduled_at: string | null;
}

/** No parameter rows to start with: how many a send needs is decided by the
 * WhatsApp template that was picked, so the marketer adds exactly those. */
export const emptyValues = (waCampaignName = ''): WaCampaignValues => ({
  name: '',
  wa_campaign_name: waCampaignName,
  audience: 'ALL_USERS',
  audience_list_id: '',
  users: [],
  contacts: [],
  template_params: [],
  scheduled_at: '',
});

const toAudience = (raw: string): WaAudience =>
  (WA_AUDIENCES as readonly string[]).includes(raw) ? (raw as WaAudience) : 'ALL_USERS';

/** The form values that repeat a past send: same template, same recipients,
 * same params — never its schedule, which belonged to that run. Picked accounts
 * come back as ids without names; the chips fill in as the picker resolves. */
export const valuesFromCampaign = (campaign: WaCampaignRow): WaCampaignValues => ({
  name: `${campaign.name} (copy)`,
  wa_campaign_name: campaign.wa_campaign_name,
  audience: toAudience(campaign.audience),
  audience_list_id: campaign.audience_list_id ?? '',
  users: (campaign.user_ids ?? []).map((id) => ({ id, name: '' })),
  contacts: (campaign.contacts ?? []).map((contact) => ({
    name: contact.name,
    extension: contact.extension,
    number: contact.number,
  })),
  template_params: campaign.template_params.map((value) => ({ value })),
  scheduled_at: '',
});

export const toSendInput = (values: WaCampaignValues): SendWaCampaignInput => ({
  name: values.name.trim(),
  wa_campaign_name: values.wa_campaign_name,
  audience: values.audience,
  audience_list_id: values.audience === 'AUDIENCE_LIST' ? values.audience_list_id : null,
  user_ids: values.audience === 'SPECIFIC_USERS' ? values.users.map((user) => user.id) : [],
  contacts: values.audience === 'MANUAL_NUMBERS' ? values.contacts : [],
  template_params: values.template_params.map((param) => param.value.trim()),
  scheduled_at: values.scheduled_at || null,
});
