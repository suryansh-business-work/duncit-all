import { GraphQLError, parse } from 'graphql';
import { z } from 'zod';
import { defineTool } from '../define';
import { assertTarget, CRM_LISTING, DATA_RULE, defined, leadTarget, leadTypeSchema, runCrm } from './lead-tools.shared';

/**
 * Read-only CRM lead tools: search existing leads by quality score, read one
 * lead's (or candidate's) score breakdown with its evidence and the item keys
 * to verify, check a lead for duplicates, and read the published scoring model.
 */

export const SEARCH_CRM_LEADS = parse(/* GraphQL */ `
  query McpSearchCrmLeads($input: CrmLeadSearchInput!) {
    searchCrmLeads(input: $input) {
      total
      page
      page_size
      rows {
        entity_type
        id
        name
        city
        area
        lead_status
        instagram_link
        website
        phones
        emails
        created_at
        quality {
          score
          classification_label
          qualification
          verification
          failed_gates
          pending_gates
          pending_items
          config_version
          scored_at
        }
      }
    }
  }
`);

export const LEAD_QUALITY_DETAILS = parse(/* GraphQL */ `
  query McpLeadQualityDetails($entity_type: CrmEntityType!, $lead_id: ID!) {
    crmLeadQuality(entity_type: $entity_type, lead_id: $lead_id) {
      entity_type
      lead_id
      lead_name
      stale
      scored_version
      published_version
      scored_at
      origin
      result {
        score
        classification_label
        qualification
        verification
        min_qualification_score
        potential_score
        gates {
          key
          name
          state
        }
        criteria {
          key
          name
          max
          earned
          status
          mandatory
          items {
            key
            name
            points
            earned
            status
            mandatory
            auto_check
            guidance
          }
        }
      }
      evidence {
        item_key
        status
        evidence
        source_url
        notes
        via
        decided_at
        actor {
          name
        }
      }
    }
  }
`);

export const CANDIDATE_DETAILS = parse(/* GraphQL */ `
  query McpLeadCandidate($id: ID!) {
    crmLeadCandidate(id: $id) {
      id
      lead_type
      status
      name
      city
      area
      address
      phones
      emails
      website
      instagram_url
      score
      qualification
      classification_label
      missing_evidence
      skipped_checks
      crm_lead_id
      duplicates {
        entity_type
        lead_id
        lead_name
        match
      }
      sources {
        kind
        url
        title
      }
      result {
        score
        qualification
        gates {
          key
          name
          state
        }
        criteria {
          key
          name
          max
          earned
          status
          items {
            key
            name
            points
            earned
            status
            auto_check
            guidance
          }
        }
      }
      evidence {
        item_key
        status
        evidence
        source_url
        via
      }
    }
  }
`);

export const CHECK_DUPLICATES = parse(/* GraphQL */ `
  query McpCheckLeadDuplicates($lead_type: CrmEntityType!, $input: CrmLeadCandidateInput!) {
    checkCrmLeadDuplicates(lead_type: $lead_type, input: $input) {
      lead_type
      is_duplicate
      crm_matches {
        entity_type
        lead_id
        lead_name
        match
      }
      queued_candidates {
        candidate_id
        name
        lead_type
        status
      }
    }
  }
`);

export const QUALITY_SETTINGS = parse(/* GraphQL */ `
  query McpLeadQualitySettings($lead_type: CrmEntityType!) {
    crmLeadQualitySettings(lead_type: $lead_type) {
      lead_type
      published {
        version
        weightage_total
        min_qualification_score
        published_at
        bands {
          label
          min
          tone
        }
        criteria {
          key
          name
          weightage
          enabled
          mandatory
          auto_check
          threshold
          guidance
          sub_criteria {
            key
            name
            points
            mandatory
            auto_check
            threshold
            guidance
          }
        }
      }
      draft {
        version
        weightage_total
        revision
        updated_at
      }
    }
  }
`);

export const searchCrmLeadsTool = defineTool({
  name: 'search_crm_leads',
  title: 'Search CRM leads',
  description: [
    '[CRM · Read-only] Searches existing CRM leads of all five types (Host, Venue, Community, Creator, E-commerce) by name, city and Lead Quality Score, sorted server-side across the whole CRM.',
    'Examples: every lead below 60 → max_score 59.99; best venue leads in Lucknow → lead_types [VENUE_LEAD], city Lucknow, sort SCORE_DESC; leads still to verify → verification PENDING or qualification PENDING_VERIFICATION; never scored → unscored true.',
    'Returns each lead with its score out of 100, classification, qualification, verification progress and gate counts. Use get_lead_quality_details for the criterion-wise breakdown.',
    DATA_RULE,
  ].join(' '),
  category: 'crm',
  listedOn: CRM_LISTING,
  schema: z
    .object({
      lead_types: z.array(leadTypeSchema).max(5).optional().describe('Which lead types; all five when omitted.'),
      search: z.string().max(100).optional().describe('Name, city, phone, email or Instagram link contains this.'),
      city: z.string().max(80).optional(),
      min_score: z.number().min(0).max(100).optional(),
      max_score: z.number().min(0).max(100).optional(),
      classification: z.string().max(40).optional().describe('A band key, e.g. excellent, good, moderate, low, very_low.'),
      qualification: z.enum(['QUALIFIED', 'NOT_QUALIFIED', 'PENDING_VERIFICATION']).optional(),
      verification: z.enum(['COMPLETE', 'IN_PROGRESS', 'PENDING']).optional(),
      has_failed_gates: z.boolean().optional(),
      unscored: z.boolean().optional(),
      sort: z.enum(['SCORE_DESC', 'SCORE_ASC', 'NEWEST']).default('SCORE_DESC'),
      page: z.number().int().min(1).max(50).default(1),
      page_size: z.number().int().min(1).max(100).default(25),
    })
    .strict(),
  async run(context, args) {
    const { lead_types, ...rest } = args;
    return runCrm(context, SEARCH_CRM_LEADS, { input: defined({ ...rest, entity_types: lead_types }) }, 'searchCrmLeads');
  },
});

export const getLeadQualityDetailsTool = defineTool({
  name: 'get_lead_quality_details',
  title: 'Get lead quality details',
  description: [
    '[CRM · Read-only] One lead\'s Lead Quality Score: score out of 100, classification, qualification, mandatory gates, the criterion-wise table (maximum, earned, status) and every item with its key, plus the evidence recorded with source links, who verified it and when.',
    'Pass entity_type + lead_id for a CRM lead, or candidate_id for a Lead Research candidate. Items with status PENDING are what is left to verify — research them, then record what you find with verify_lead_evidence using the item keys shown here.',
    DATA_RULE,
  ].join(' '),
  category: 'crm',
  listedOn: CRM_LISTING,
  schema: z.object(leadTarget).strict(),
  async run(context, args) {
    if (assertTarget(args) === 'LEAD') {
      return runCrm(context, LEAD_QUALITY_DETAILS, { entity_type: args.entity_type, lead_id: args.lead_id }, 'crmLeadQuality');
    }
    const candidate = await runCrm(context, CANDIDATE_DETAILS, { id: args.candidate_id }, 'crmLeadCandidate');
    if (!candidate) throw new GraphQLError('Candidate not found', { extensions: { code: 'NOT_FOUND' } });
    return candidate;
  },
});

export const checkLeadDuplicatesTool = defineTool({
  name: 'check_lead_duplicates',
  title: 'Check lead duplicates',
  description: [
    '[CRM · Read-only] Says whether a lead is already in the CRM: compares its phone numbers, emails, website and Instagram profile with every lead of all five types, and with candidates already in the Lead Research queue.',
    'Run it before saving or adding a lead. A lead with crm_matches can never be added.',
  ].join(' '),
  category: 'crm',
  listedOn: CRM_LISTING,
  schema: z
    .object({
      lead_type: leadTypeSchema,
      name: z.string().min(2).max(120),
      phones: z.array(z.string().min(7).max(30)).max(5).optional(),
      emails: z.array(z.email()).max(5).optional(),
      website: z.string().max(500).optional(),
      instagram: z.string().max(200).optional(),
      city: z.string().max(80).optional(),
    })
    .strict(),
  async run(context, args) {
    const { lead_type, ...input } = args;
    return runCrm(context, CHECK_DUPLICATES, { lead_type, input: defined(input) }, 'checkCrmLeadDuplicates');
  },
});

export const getLeadQualitySettingsTool = defineTool({
  name: 'get_lead_quality_settings',
  title: 'Get lead quality settings',
  description: [
    '[CRM · Read-only] The published Lead Quality Score model of a lead type: every criterion with its weightage (always totalling 100), sub-criteria with points and keys, mandatory gates, automatic checks, classification bands and the minimum qualifying score — plus whether a draft is being edited.',
    'Read it before researching leads of that type, so you know exactly what evidence earns points.',
  ].join(' '),
  category: 'crm',
  listedOn: CRM_LISTING,
  schema: z.object({ lead_type: leadTypeSchema }).strict(),
  async run(context, args) {
    return runCrm(context, QUALITY_SETTINGS, { lead_type: args.lead_type }, 'crmLeadQualitySettings');
  },
});
