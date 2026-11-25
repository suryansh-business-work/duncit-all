import { z } from 'zod';

import type { Translate } from './translate';

/** What the server accepts for a discovery (leadResearch.discovery DISCOVERY_LIMITS). */
export const DISCOVERY_LIMITS = {
  target: { min: 1, max: 100, initial: 20 },
  score: { min: 0, max: 100 },
  place: 80,
  text: 200,
} as const;

/** The sources a discovery can search; WEB is only ever handed in by an AI assistant. */
export const DISCOVERY_SOURCES = ['INSTAGRAM', 'GOOGLE_MAPS'] as const;

/** The CRM lead types a discovery can look for, in the order the form lists them. */
export const DISCOVERY_LEAD_TYPES = ['HOST_LEAD', 'VENUE_LEAD', 'COMMUNITY_LEAD', 'CREATOR_LEAD', 'ECOMM_LEAD'] as const;

/** The server keeps scores to hundredths and refuses anything finer. */
const hasAtMostTwoDecimals = (value: number) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-6;

/**
 * CRM › Lead Research › Discover leads: what to search for, where, and how many
 * qualifying leads to find. The CRM portal and the Duncit CRM app both start
 * discoveries with these rules.
 */
export const makeLeadDiscoverySchema = (t: Translate) => {
  const { target, score, place, text } = DISCOVERY_LIMITS;
  const targetMessage = t('crm.leadResearch.targetRange', { vars: { min: target.min, max: target.max } });
  const scoreMessage = t('crm.leadResearch.minScoreRange', { vars: { min: score.min, max: score.max } });
  const placeMessage = t('crm.leadResearch.tooLong', { vars: { max: place } });
  return z.object({
    lead_type: z.enum(DISCOVERY_LEAD_TYPES),
    city: z.string().trim().min(2, t('crm.leadResearch.cityRequired')).max(place, placeMessage),
    area: z.string().trim().max(place, placeMessage),
    category: z.string().trim().max(place, placeMessage),
    keywords: z.string().trim().max(text, t('crm.leadResearch.tooLong', { vars: { max: text } })),
    target_count: z.number({ error: targetMessage }).int(targetMessage).min(target.min, targetMessage).max(target.max, targetMessage),
    min_score: z
      .number({ error: scoreMessage })
      .min(score.min, scoreMessage)
      .max(score.max, scoreMessage)
      .refine(hasAtMostTwoDecimals, scoreMessage)
      .nullable(),
    sources: z.array(z.enum(DISCOVERY_SOURCES)),
    ai_evidence: z.boolean(),
  });
};

export type LeadDiscoveryValues = z.infer<ReturnType<typeof makeLeadDiscoverySchema>>;

export const leadDiscoveryDefaults: LeadDiscoveryValues = {
  lead_type: 'VENUE_LEAD',
  city: '',
  area: '',
  category: '',
  keywords: '',
  target_count: DISCOVERY_LIMITS.target.initial,
  min_score: null,
  sources: [],
  ai_evidence: true,
};

/** The startCrmLeadDiscovery input the form sends. */
export interface LeadDiscoveryInput {
  lead_type: LeadDiscoveryValues['lead_type'];
  city: string;
  locality: string | null;
  category: string | null;
  keywords: string | null;
  target_count: number;
  min_score: number | null;
  sources: Array<(typeof DISCOVERY_SOURCES)[number]> | null;
  ai_evidence: boolean;
}

/** Blank optional text goes as null, and no ticked source lets the server pick the lead type's default sources. */
export function toLeadDiscoveryInput(values: LeadDiscoveryValues): LeadDiscoveryInput {
  return {
    lead_type: values.lead_type,
    city: values.city,
    locality: values.area || null,
    category: values.category || null,
    keywords: values.keywords || null,
    target_count: values.target_count,
    min_score: values.min_score,
    sources: values.sources.length > 0 ? [...values.sources] : null,
    ai_evidence: values.ai_evidence,
  };
}
