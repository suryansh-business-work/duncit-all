import type { MockedResponse } from '@apollo/client/testing';
import { LEAD_QUALITY_ANALYTICS, type LeadQualityAnalytics } from '@/api/leadQuality.gql';
import type { CrmLeadEntityType } from '@/api/crm.types';

type TypeStats = LeadQualityAnalytics['by_type'][number];

const count = (key: string, label: string, n: number) => ({ __typename: 'CrmLeadQualityCount' as const, key, label, count: n });

const BUCKETS = ['0-19', '20-39', '40-59', '60-79', '80-100'];

export function typeStats(entity_type: CrmLeadEntityType, overrides: Partial<TypeStats> = {}): TypeStats {
  return {
    __typename: 'CrmLeadQualityTypeStats',
    entity_type,
    total: 12,
    scored: 10,
    average_score: 61.25,
    qualified: 4,
    not_qualified: 3,
    pending_verification: 3,
    failed_gate_leads: 2,
    pending_items: 17,
    classifications: [count('EXCELLENT', 'Excellent', 4), count('AVERAGE', 'Average', 3), count('WEAK', 'Weak', 3)],
    distribution: BUCKETS.map((bucket, index) => count(bucket, bucket, [1, 2, 3, 0, 4][index] ?? 0)),
    ...overrides,
  };
}

/** A full analytics answer shaped exactly like the console's selection. */
export function analytics(overrides: Partial<LeadQualityAnalytics> = {}): LeadQualityAnalytics {
  return {
    __typename: 'CrmLeadQualityAnalytics',
    generated_at: '2026-11-22T06:00:00.000Z',
    duplicate_leads: 3,
    by_type: [typeStats('VENUE_LEAD'), typeStats('HOST_LEAD', { total: 5, scored: 5, average_score: 48, qualified: 1 })],
    top_leads: [
      {
        __typename: 'CrmLeadQualityTopLead',
        entity_type: 'VENUE_LEAD',
        id: 'v1',
        name: 'Grand Hall',
        city: 'Mumbai',
        score: 92,
        classification_label: 'Excellent',
        qualification: 'QUALIFIED',
      },
      {
        __typename: 'CrmLeadQualityTopLead',
        entity_type: 'HOST_LEAD',
        id: 'h1',
        name: 'Asha Rao',
        city: 'Pune',
        score: 77.5,
        classification_label: 'Average',
        qualification: 'PENDING_VERIFICATION',
      },
    ],
    cities: [
      { __typename: 'CrmLeadQualityCityStat', city: 'Mumbai', leads: 8, average_score: 66.4, qualified: 3 },
      { __typename: 'CrmLeadQualityCityStat', city: 'Pune', leads: 4, average_score: 51, qualified: 1 },
    ],
    trend: [
      { __typename: 'CrmLeadQualityTrendPoint', week: '2026-W45', leads: 4, average_score: 58 },
      { __typename: 'CrmLeadQualityTrendPoint', week: '2026-W46', leads: 6, average_score: 63.5 },
    ],
    conversion: [
      { __typename: 'CrmLeadQualityConversion', classification: 'EXCELLENT', label: 'Excellent', leads: 4, won: 2, conversion_rate: 50 },
      { __typename: 'CrmLeadQualityConversion', classification: 'WEAK', label: 'Weak', leads: 3, won: 0, conversion_rate: 0 },
    ],
    origins: [
      { __typename: 'CrmLeadQualityOrigin', origin: 'RESEARCH', leads: 6, average_score: 72, qualified: 3 },
      { __typename: 'CrmLeadQualityOrigin', origin: 'MANUAL', leads: 9, average_score: 50.5, qualified: 2 },
    ],
    missing_evidence: [{ __typename: 'CrmLeadQualityMissing', entity_type: 'VENUE_LEAD', criterion: 'Google reviews', leads: 7 }],
    research_queue: [
      { __typename: 'CrmLeadQualityQueueStat', key: 'NEW', label: 'NEW', count: 9, average_score: 64 },
      { __typename: 'CrmLeadQualityQueueStat', key: 'ADDED', label: 'ADDED', count: 4, average_score: 81 },
    ],
    ...overrides,
  };
}

/** Answers the analytics query for one selection (null: every lead type). */
export const analyticsMock = (entity_type: CrmLeadEntityType | null, data: LeadQualityAnalytics): MockedResponse => ({
  request: { query: LEAD_QUALITY_ANALYTICS, variables: { entity_type } },
  result: { data: { crmLeadQualityAnalytics: data } },
});
