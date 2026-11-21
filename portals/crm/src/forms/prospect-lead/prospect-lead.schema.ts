import { z } from 'zod';
import type { useTranslation } from '@duncit/shell';
import { contactsSchema, numeric, urlish } from '../validation/lead-rules';

type Translate = ReturnType<typeof useTranslation>['t'];

/** A required display name between 2 and 120 characters. */
const displayName = (t: Translate, required: string, tooShort: string, tooLong: string) =>
  z.string().trim().min(1, t(required)).min(2, t(tooShort)).max(120, t(tooLong));

/** The lead backbone shared by both kinds. */
const backbone = (t: Translate) => ({
  super_category_id: z.string().trim().min(1, t('crm.prospectLeads.superCategoryRequired')),
  website: urlish('Website'),
  instagram_link: z.string().trim().max(2048, t('crm.prospectLeads.linkTooLong')),
  contacts: contactsSchema,
  lead_status: z.string().min(1, t('crm.prospectLeads.statusRequired')),
  priority: z.string().min(1, t('crm.prospectLeads.priorityRequired')),
});

/** Blank, or a number from 0 to 100 (decimals allowed). */
const percent = (message: string) =>
  z
    .string()
    .trim()
    .refine((v) => v === '' || (Number.isFinite(Number(v)) && Number(v) >= 0 && Number(v) <= 100), message);

export const creatorLeadSchema = (t: Translate) =>
  z.object({
    ...backbone(t),
    creator_name: displayName(
      t,
      'crm.creatorLeads.nameRequired',
      'crm.creatorLeads.nameTooShort',
      'crm.creatorLeads.nameTooLong'
    ),
    handle: z.string().trim().max(80, t('crm.creatorLeads.handleTooLong')),
    followers_count: numeric(t('crm.creatorLeads.followers')),
    engagement_rate: percent(t('crm.creatorLeads.engagementInvalid')),
    rate_card: z.string().trim().max(500, t('crm.creatorLeads.rateCardTooLong')),
  });

export const communityLeadSchema = (t: Translate) =>
  z.object({
    ...backbone(t),
    community_name: displayName(
      t,
      'crm.communityLeads.nameRequired',
      'crm.communityLeads.nameTooShort',
      'crm.communityLeads.nameTooLong'
    ),
    member_count: numeric(t('crm.communityLeads.members')),
    community_link: z.string().trim().max(2048, t('crm.prospectLeads.linkTooLong')),
  });
