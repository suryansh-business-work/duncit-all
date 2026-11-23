import { z } from 'zod';
import type { CrmLeadDiscoveryInput } from '@duncit/gql-types';
import { LEAD_TYPES } from '../../components/lead-quality/qualityLabels';
import type { Translate } from './lead-discovery.types';

/** What the server accepts for a discovery (leadResearch.discovery DISCOVERY_LIMITS). */
export const DISCOVERY_LIMITS = {
  target: { min: 1, max: 100, initial: 20 },
  score: { min: 0, max: 100 },
  place: 80,
  text: 200,
} as const;

/** The sources a discovery can search; WEB is only ever handed in by an AI assistant. */
export const DISCOVERY_SOURCES = ['INSTAGRAM', 'GOOGLE_MAPS'] as const;

/** The server keeps scores to hundredths and refuses anything finer. */
const hasAtMostTwoDecimals = (value: number) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-6;

/** CRM › Lead Research › Discover leads: what to search for, where, and how many qualifying leads to find. */
export const leadDiscoverySchema = (t: Translate) => {
  const { target, score, place, text } = DISCOVERY_LIMITS;
  const targetMessage = t('crm.leadResearch.targetRange', { vars: { min: target.min, max: target.max } });
  const scoreMessage = t('crm.leadResearch.minScoreRange', { vars: { min: score.min, max: score.max } });
  const placeMessage = t('crm.leadResearch.tooLong', { vars: { max: place } });
  return z.object({
    lead_type: z.enum(LEAD_TYPES),
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

export type LeadDiscoveryFormValues = z.infer<ReturnType<typeof leadDiscoverySchema>>;

export const leadDiscoveryDefaults: LeadDiscoveryFormValues = {
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

/**
 * The startCrmLeadDiscovery input. Blank optional text goes as null, and no
 * ticked source lets the server pick the lead type's default sources.
 */
export function toDiscoveryInput(values: LeadDiscoveryFormValues): CrmLeadDiscoveryInput {
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
