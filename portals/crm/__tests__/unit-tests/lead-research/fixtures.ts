import type { MockedResponse } from '@apollo/client/testing';
import {
  LEAD_CANDIDATE,
  LEAD_CANDIDATES_TABLE,
  LEAD_DISCOVERY_JOBS,
  type LeadCandidate,
  type LeadDiscoveryJob,
} from '@/api/leadResearch.gql';

/** Matches any variables; a test that cares about them passes its own function. */
export const anyVariables = () => true;

const actor = (name: string) => ({ __typename: 'CrmLeadQualityActor' as const, id: `u-${name}`, name });

/** A researched candidate shaped exactly like the console's candidate selection. */
export function candidate(overrides: Partial<LeadCandidate> = {}): LeadCandidate {
  return {
    __typename: 'CrmLeadCandidate',
    id: 'c1',
    lead_type: 'VENUE_LEAD',
    job_id: 'job1',
    origin: 'DISCOVERY',
    name: 'The Barn Cafe',
    city: 'Mumbai',
    area: 'Bandra',
    address: '12 Hill Road',
    category: 'Cafe',
    description: 'Board games and coffee.',
    phones: ['+91 98765 43210'],
    emails: ['hello@thebarn.in'],
    website: 'https://thebarn.in',
    instagram_handle: 'thebarn',
    instagram_url: 'https://instagram.com/thebarn',
    score: 84,
    qualification: 'QUALIFIED',
    classification_label: 'Excellent',
    tone: 'success',
    config_version: 3,
    missing_evidence: ['Google reviews'],
    status: 'NEW',
    crm_lead_id: null,
    decided_at: null,
    decision_note: '',
    skipped_checks: ['Instagram followers: Instagram did not answer'],
    created_at: '2026-11-20T10:00:00.000Z',
    updated_at: '2026-11-20T10:00:00.000Z',
    decided_by: null,
    created_by: actor('Discovery'),
    duplicates: [],
    sources: [
      {
        __typename: 'CrmLeadCandidateSource',
        kind: 'INSTAGRAM',
        url: 'https://instagram.com/thebarn',
        title: 'The Barn (@thebarn)',
        text: 'Board game cafe in Bandra. DM for bookings.',
      },
    ],
    evidence: [
      {
        __typename: 'CrmLeadQualityEvidence',
        item_key: 'presence.instagram',
        status: 'VERIFIED',
        evidence: 'Business profile with 4,200 followers',
        source_url: 'https://instagram.com/thebarn',
        notes: '',
        via: 'AI',
        decided_at: '2026-11-20T10:00:00.000Z',
        actor: actor('Discovery AI'),
      },
    ],
    result: {
      __typename: 'CrmLeadQualityResult',
      score: 84,
      max_score: 100,
      classification: 'EXCELLENT',
      classification_label: 'Excellent',
      tone: 'success',
      qualification: 'QUALIFIED',
      verification: 'IN_PROGRESS',
      potential_score: 100,
      verified_items: 1,
      pending_items: 1,
      failed_items: 0,
      gates: [{ __typename: 'CrmLeadQualityGate', key: 'unique', name: 'Not already in the CRM', state: 'PASSED' }],
      criteria: [
        {
          __typename: 'CrmLeadQualityCriterionResult',
          key: 'presence',
          name: 'Online presence',
          max: 40,
          earned: 24,
          status: 'PARTIAL',
          mandatory: false,
          items: [
            {
              __typename: 'CrmLeadQualityItemResult',
              key: 'presence.instagram',
              criterion_key: 'presence',
              name: 'Instagram business profile',
              points: 24,
              earned: 24,
              status: 'VERIFIED',
              mandatory: false,
              auto_check: 'INSTAGRAM_BUSINESS_PROFILE',
            },
          ],
        },
      ],
    },
    ...overrides,
  };
}

/** A second candidate that matches a CRM lead and has not qualified. */
export const duplicateCandidate = (): LeadCandidate =>
  candidate({
    id: 'c2',
    name: 'Hill Top Studio',
    score: 35,
    qualification: 'NOT_QUALIFIED',
    classification_label: 'Weak',
    tone: 'error',
    status: 'DUPLICATE',
    phones: ['+91 90000 00001', '+91 90000 00002'],
    duplicates: [
      { __typename: 'CrmLeadCandidateDuplicate', entity_type: 'HOST_LEAD', lead_id: 'h7', lead_name: 'Hill Top (host)', match: 'PHONE +91 90000 00001' },
    ],
  });

/**
 * The queue as the server holds it. Pass a function when a test changes that
 * state (a decision): every reload then answers with the rows as they are now.
 */
export const tableMock = (
  rows: LeadCandidate[] | (() => LeadCandidate[]),
  variables: (vars: Record<string, unknown>) => boolean = anyVariables
): MockedResponse => ({
  request: { query: LEAD_CANDIDATES_TABLE, variables },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: () => {
    const current = typeof rows === 'function' ? rows() : rows;
    return { data: { crmLeadCandidatesTable: { __typename: 'CrmLeadCandidateTablePage', total: current.length, page: 1, page_size: 25, rows: current } } };
  },
});

export const candidateMock = (row: LeadCandidate): MockedResponse => ({
  request: { query: LEAD_CANDIDATE, variables: { id: row.id } },
  result: { data: { crmLeadCandidate: row } },
});

/** A discovery job shaped like the console's job selection. */
export function job(overrides: Partial<LeadDiscoveryJob> = {}): LeadDiscoveryJob {
  return {
    __typename: 'CrmLeadDiscoveryJob',
    id: 'job1',
    status: 'COMPLETED',
    label: 'Discover 20 venue leads in Bandra, Mumbai',
    total: 20,
    succeeded: 12,
    failed: 1,
    error_message: '',
    created_at: '2026-11-20T09:00:00.000Z',
    finished_at: '2026-11-20T09:20:00.000Z',
    lead_type: 'VENUE_LEAD',
    city: 'Mumbai',
    locality: 'Bandra',
    category: 'Cafe',
    keywords: 'board games',
    target_count: 20,
    min_score: 60,
    sources: ['GOOGLE_MAPS', 'INSTAGRAM'],
    queries: ['board game cafe Bandra Mumbai', 'cafe Bandra instagram'],
    plan_note: 'Cafes first, then Instagram pages.',
    searches_run: 2,
    failures: [{ __typename: 'BackgroundJobFailure', id: 'cafe Bandra instagram', message: 'Serper rate limit reached' }],
    stats: { __typename: 'CrmLeadDiscoveryStats', found: 30, saved: 18, qualifying: 12, duplicates: 4, already_queued: 5, refused: 3 },
    candidates: [],
    ...overrides,
  };
}

export const jobsMock = (jobs: LeadDiscoveryJob[]): MockedResponse => ({
  request: { query: LEAD_DISCOVERY_JOBS, variables: { limit: 20 } },
  result: { data: { crmLeadDiscoveryJobs: jobs } },
});
