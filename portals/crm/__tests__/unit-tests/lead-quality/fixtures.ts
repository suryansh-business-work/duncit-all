import type { MockedResponse } from '@apollo/client/testing';
import {
  LEAD_QUALITY,
  LEAD_QUALITY_HISTORY,
  type LeadQualityDetails,
  type LeadQualityEvent,
} from '@/api/leadQuality.gql';

/**
 * A venue lead scored 70/100 ("Good"): Instagram partly verified (a gate),
 * Google Maps verified, the website half met. Every field the documents select
 * is present, so Apollo reads the mocks back exactly as the server sends them.
 */
export const LEAD_ID = 'venue-1';
export const qualityVars = { entity_type: 'VENUE_LEAD' as const, lead_id: LEAD_ID };
export const historyVars = { ...qualityVars, limit: 50 };

const actor = (name: string, id: string | null = null) => ({ id, name });

const config: LeadQualityDetails['config'] = {
  id: 'cfg-3',
  lead_type: 'VENUE_LEAD',
  version: 3,
  status: 'PUBLISHED',
  min_qualification_score: 60,
  change_note: '',
  revision: 1,
  weightage_total: 100,
  published_at: '2026-11-01T09:00:00.000Z',
  archived_at: null,
  created_at: '2026-11-01T08:00:00.000Z',
  updated_at: '2026-11-01T09:00:00.000Z',
  created_by: actor('Priya Sharma', 'u1'),
  updated_by: actor('Priya Sharma', 'u1'),
  published_by: actor('Priya Sharma', 'u1'),
  bands: [
    { key: 'weak', label: 'Weak', min: 0, tone: 'error' },
    { key: 'good', label: 'Good', min: 40, tone: 'warning' },
    { key: 'excellent', label: 'Excellent', min: 80, tone: 'success' },
  ],
  criteria: [],
};

type Item = NonNullable<LeadQualityDetails['result']>['criteria'][number]['items'][number];
const item = (over: Partial<Item> & Pick<Item, 'key' | 'criterion_key' | 'name' | 'points' | 'earned' | 'status'>): Item => ({
  sub_key: null,
  mandatory: false,
  auto_check: 'NONE',
  threshold: null,
  guidance: null,
  ...over,
});

export const scoredResult: NonNullable<LeadQualityDetails['result']> = {
  score: 70,
  max_score: 100,
  classification: 'good',
  classification_label: 'Good',
  tone: 'warning',
  qualification: 'PENDING_VERIFICATION',
  verification: 'IN_PROGRESS',
  min_qualification_score: 60,
  potential_score: 80,
  verified_items: 3,
  pending_items: 1,
  failed_items: 1,
  gates: [{ key: 'instagram', name: 'Instagram presence', state: 'PASSED' }],
  criteria: [
    {
      key: 'instagram',
      name: 'Instagram presence',
      max: 30,
      earned: 20,
      status: 'PARTIAL',
      mandatory: true,
      items: [
        item({ key: 'instagram.profile', criterion_key: 'instagram', sub_key: 'profile', name: 'Business profile', points: 20, earned: 20, status: 'VERIFIED', auto_check: 'INSTAGRAM_BUSINESS_PROFILE' }),
        item({
          key: 'instagram.followers',
          criterion_key: 'instagram',
          sub_key: 'followers',
          name: 'Followers',
          points: 10,
          earned: 0,
          status: 'PENDING',
          auto_check: 'INSTAGRAM_FOLLOWERS_MIN',
          threshold: 1000,
          guidance: 'Open the profile and read the follower count',
        }),
      ],
    },
    {
      key: 'maps',
      name: 'Google Maps listing',
      max: 40,
      earned: 40,
      status: 'VERIFIED',
      mandatory: false,
      items: [item({ key: 'maps', criterion_key: 'maps', name: 'Google Maps listing', points: 40, earned: 40, status: 'VERIFIED', auto_check: 'GOOGLE_MAPS_LISTING' })],
    },
    {
      key: 'website',
      name: 'Website',
      max: 30,
      earned: 10,
      status: 'PARTIAL',
      mandatory: false,
      items: [
        item({ key: 'website.reachable', criterion_key: 'website', sub_key: 'reachable', name: 'Site responds', points: 10, earned: 10, status: 'VERIFIED', auto_check: 'WEBSITE_REACHABLE' }),
        item({ key: 'website.booking', criterion_key: 'website', sub_key: 'booking', name: 'Online booking', points: 20, earned: 0, status: 'FAILED' }),
      ],
    },
  ],
};

export const DECIDED_AT = '2026-11-20T10:15:00.000Z';
export const SCORED_AT = '2026-11-20T10:16:00.000Z';

export const details = (over: Partial<LeadQualityDetails> = {}): LeadQualityDetails => ({
  entity_type: 'VENUE_LEAD',
  lead_id: LEAD_ID,
  lead_name: 'Grand Hall',
  scored_version: 3,
  published_version: 3,
  stale: false,
  scored_at: SCORED_AT,
  origin: 'MANUAL',
  result: scoredResult,
  evidence: [
    {
      item_key: 'instagram.profile',
      status: 'VERIFIED',
      evidence: 'Business account @grandhall',
      source_url: 'https://instagram.com/grandhall',
      notes: '',
      via: 'SYSTEM',
      decided_at: DECIDED_AT,
      actor: actor('System'),
    },
    {
      item_key: 'website.booking',
      status: 'FAILED',
      evidence: 'No booking page on the site',
      source_url: '',
      notes: 'Checked twice',
      via: 'MANUAL',
      decided_at: DECIDED_AT,
      actor: actor('Priya Sharma', 'u1'),
    },
  ],
  config,
  ...over,
});

/** The same lead after its follower count was verified: 80/100, Excellent, qualified. */
export const rescored = (): LeadQualityDetails =>
  details({
    result: {
      ...scoredResult,
      score: 80,
      classification: 'excellent',
      classification_label: 'Excellent',
      tone: 'success',
      qualification: 'QUALIFIED',
      verification: 'COMPLETE',
      verified_items: 4,
      pending_items: 0,
    },
  });

export const historyEvent = (over: Partial<LeadQualityEvent> = {}): LeadQualityEvent => ({
  id: 'ev-1',
  kind: 'SCORE',
  entity_type: 'VENUE_LEAD',
  lead_id: LEAD_ID,
  trigger: 'RECALCULATE',
  score_before: 50,
  score_after: 70,
  classification: 'Good',
  qualification: 'PENDING_VERIFICATION',
  config_version: 3,
  item_key: '',
  status_before: '',
  status_after: '',
  evidence: '',
  source_url: '',
  via: null,
  note: '',
  created_at: SCORED_AT,
  actor: actor('Priya Sharma', 'u1'),
  ...over,
});

export const qualityMock = (value: LeadQualityDetails, maxUsageCount = 5): MockedResponse => ({
  request: { query: LEAD_QUALITY, variables: qualityVars },
  result: { data: { crmLeadQuality: value } },
  maxUsageCount,
});

export const historyMock = (events: LeadQualityEvent[], maxUsageCount = 5): MockedResponse => ({
  request: { query: LEAD_QUALITY_HISTORY, variables: historyVars },
  result: { data: { crmLeadQualityHistory: events } },
  maxUsageCount,
});
