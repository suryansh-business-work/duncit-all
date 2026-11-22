import type { CrmLeadQualityConfigInput, CrmLeadQualityCriterionInput, CrmLeadQualitySettings } from '@duncit/gql-types';
import type { LeadQualityConfig, LeadQualityEvent } from '@/api/leadQuality.gql';

/**
 * A Host scoring model that is exactly publishable: 20 + 50 + 30 = 100, and
 * the Instagram criterion's sub-criteria (30 + 20) give out its 50. Typed the
 * way the API answers (`__typename` on every object) so Apollo's cache keeps
 * every field.
 */

const actor = (name: string) => ({ __typename: 'CrmLeadQualityActor' as const, id: `u-${name.toLowerCase()}`, name });

export const configFixture = (overrides: Partial<LeadQualityConfig> = {}): LeadQualityConfig => ({
  __typename: 'CrmLeadQualityConfig',
  id: 'cfg-4',
  lead_type: 'HOST_LEAD',
  version: 4,
  status: 'DRAFT',
  min_qualification_score: 60,
  change_note: 'Tuned weights',
  revision: 7,
  weightage_total: 100,
  published_at: null,
  archived_at: null,
  created_at: '2026-11-20T10:00:00.000Z',
  updated_at: '2026-11-21T10:00:00.000Z',
  created_by: actor('Asha'),
  updated_by: actor('Asha'),
  published_by: null,
  bands: [
    { __typename: 'CrmLeadQualityBand', key: 'high', label: 'High', min: 70, tone: 'success' },
    { __typename: 'CrmLeadQualityBand', key: 'mid', label: 'Mid', min: 40, tone: 'warning' },
    { __typename: 'CrmLeadQualityBand', key: 'low', label: 'Low', min: 0, tone: 'error' },
  ],
  criteria: [
    {
      __typename: 'CrmLeadQualityCriterion',
      key: 'uniqueness',
      name: 'CRM uniqueness',
      weightage: 20,
      enabled: true,
      mandatory: true,
      auto_check: 'CRM_UNIQUENESS',
      threshold: null,
      guidance: 'No other lead shares its phone.',
      sub_criteria: [],
    },
    {
      __typename: 'CrmLeadQualityCriterion',
      key: 'instagram',
      name: 'Instagram',
      weightage: 50,
      enabled: true,
      mandatory: false,
      auto_check: 'NONE',
      threshold: null,
      guidance: '',
      sub_criteria: [
        {
          __typename: 'CrmLeadQualitySubCriterion',
          key: 'followers',
          name: 'Followers',
          points: 30,
          mandatory: false,
          auto_check: 'INSTAGRAM_FOLLOWERS_MIN',
          threshold: 1000,
          guidance: '',
        },
        {
          __typename: 'CrmLeadQualitySubCriterion',
          key: 'profile',
          name: 'Business profile',
          points: 20,
          mandatory: true,
          auto_check: 'INSTAGRAM_BUSINESS_PROFILE',
          threshold: null,
          guidance: 'Readable as a business account.',
        },
      ],
    },
    {
      __typename: 'CrmLeadQualityCriterion',
      key: 'website',
      name: 'Website',
      weightage: 30,
      enabled: true,
      mandatory: false,
      auto_check: 'WEBSITE_REACHABLE',
      threshold: null,
      guidance: '',
      sub_criteria: [],
    },
  ],
  ...overrides,
});

export const publishedFixture = (overrides: Partial<LeadQualityConfig> = {}): LeadQualityConfig =>
  configFixture({
    id: 'cfg-3',
    version: 3,
    status: 'PUBLISHED',
    revision: 2,
    change_note: 'Default scoring model',
    published_at: '2026-11-01T09:30:00.000Z',
    published_by: actor('Ravi'),
    ...overrides,
  });

export const settingsFixture = (withDraft: boolean): CrmLeadQualitySettings => ({
  __typename: 'CrmLeadQualitySettings',
  lead_type: 'HOST_LEAD',
  published: publishedFixture(),
  draft: withDraft ? configFixture() : null,
});

/** The exact API input the fixture's draft turns into (keys kept, numbers as numbers, no typenames). */
export const fixtureInput = (): CrmLeadQualityConfigInput & { criteria: CrmLeadQualityCriterionInput[] } => ({
  criteria: [
    {
      key: 'uniqueness',
      name: 'CRM uniqueness',
      weightage: 20,
      enabled: true,
      mandatory: true,
      auto_check: 'CRM_UNIQUENESS',
      threshold: null,
      guidance: 'No other lead shares its phone.',
      sub_criteria: [],
    },
    {
      key: 'instagram',
      name: 'Instagram',
      weightage: 50,
      enabled: true,
      mandatory: false,
      auto_check: 'NONE',
      threshold: null,
      guidance: '',
      sub_criteria: [
        { key: 'followers', name: 'Followers', points: 30, mandatory: false, auto_check: 'INSTAGRAM_FOLLOWERS_MIN', threshold: 1000, guidance: '' },
        {
          key: 'profile',
          name: 'Business profile',
          points: 20,
          mandatory: true,
          auto_check: 'INSTAGRAM_BUSINESS_PROFILE',
          threshold: null,
          guidance: 'Readable as a business account.',
        },
      ],
    },
    { key: 'website', name: 'Website', weightage: 30, enabled: true, mandatory: false, auto_check: 'WEBSITE_REACHABLE', threshold: null, guidance: '', sub_criteria: [] },
  ],
  min_qualification_score: 60,
  bands: [
    { key: 'high', label: 'High', min: 70, tone: 'success' },
    { key: 'mid', label: 'Mid', min: 40, tone: 'warning' },
    { key: 'low', label: 'Low', min: 0, tone: 'error' },
  ],
});

export const eventFixture = (overrides: Partial<LeadQualityEvent>): LeadQualityEvent => ({
  __typename: 'CrmLeadQualityEvent',
  id: 'e1',
  kind: 'CONFIG_DRAFT',
  entity_type: 'HOST_LEAD',
  lead_id: null,
  trigger: null,
  score_before: null,
  score_after: null,
  classification: '',
  qualification: '',
  config_version: 4,
  item_key: '',
  status_before: '',
  status_after: '',
  evidence: '',
  source_url: '',
  via: null,
  note: 'Tuned weights',
  created_at: '2026-11-21T10:00:00.000Z',
  actor: actor('Asha'),
  ...overrides,
});
