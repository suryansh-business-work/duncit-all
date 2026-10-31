import { gql } from '@apollo/client';

/** What the lead is to Duncit — which team's pitch fits it. */
export type MarketingLeadPipeline = 'VENUE' | 'HOST' | 'BRAND' | 'INFLUENCER' | 'ADVERTISER' | 'GENERAL';
/** Where the conversation stands. CONVERTED and LOST are final. */
export type MarketingLeadStage = 'NEW' | 'CONTACTED' | 'REPLIED' | 'QUALIFIED' | 'CONVERTED' | 'LOST';
export type MarketingLeadSource = 'INSTAGRAM' | 'GOOGLE_PLACES' | 'WEB_SEARCH' | 'IMPORT' | 'MANUAL';
export type MarketingLeadTimelineKind = 'CREATED' | 'STAGE' | 'OWNER' | 'NOTE' | 'PROMOTED' | 'IMPORTED' | 'SOURCE';
/** The CRM record a lead can become. */
export type MarketingLeadCrmKind = 'VENUE' | 'HOST' | 'ECOMM';
export type MarketingLeadImportOutcome = 'ADDED' | 'MERGED' | 'SKIPPED';

export interface MarketingLeadCrmRef {
  kind: MarketingLeadCrmKind;
  id: string;
  promoted_at: string | null;
  promoted_by: string;
}

/** What the table lists: no notes, no history. */
export interface MarketingLeadRow {
  id: string;
  name: string;
  company: string;
  pipeline: MarketingLeadPipeline;
  stage: MarketingLeadStage;
  source: MarketingLeadSource;
  emails: string[];
  phones: string[];
  website: string;
  instagram_handle: string;
  instagram_url: string;
  city: string;
  score: number | null;
  score_reason: string;
  owner_user_id: string | null;
  owner_name: string | null;
  tags: string[];
  crm_ref: MarketingLeadCrmRef | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface MarketingLeadNote {
  at: string | null;
  by_user_id: string | null;
  by_name: string;
  text: string;
}

export interface MarketingLeadTimelineEntry {
  at: string | null;
  kind: MarketingLeadTimelineKind;
  text: string;
  by_name: string;
}

export interface MarketingLeadSourceRef {
  ig_lead_id: string;
  search_id: string;
  import_id: string;
}

/** Everything the drawer shows. */
export interface MarketingLeadDetail extends MarketingLeadRow {
  notes: MarketingLeadNote[];
  timeline: MarketingLeadTimelineEntry[];
  source_ref: MarketingLeadSourceRef;
}

export interface MarketingLeadSummary {
  total: number;
  stages: Array<{ stage: MarketingLeadStage; count: number }>;
  pipelines: Array<{ pipeline: MarketingLeadPipeline; count: number }>;
}

export interface MarketingLeadInput {
  name: string;
  company?: string;
  pipeline?: MarketingLeadPipeline;
  stage?: MarketingLeadStage;
  source?: MarketingLeadSource;
  emails?: string[];
  phones?: string[];
  website?: string;
  instagram_handle?: string;
  city?: string;
  tags?: string[];
}

/** Which column of the file holds which field; a field left out has no column. */
export interface MarketingLeadImportMapping {
  name: number;
  company?: number;
  email?: number;
  phone?: number;
  website?: number;
  instagram_handle?: number;
  city?: number;
  tags?: number;
  pipeline?: MarketingLeadPipeline;
}

export interface MarketingLeadImportRowResult {
  row: number;
  outcome: MarketingLeadImportOutcome;
  reason: string;
  lead_id: string;
}

export interface MarketingLeadImportResult {
  added: number;
  merged: number;
  skipped: number;
  run_id: string;
  rows: MarketingLeadImportRowResult[];
}

const LEAD_ROW_FIELDS = gql`
  fragment MarketingLeadRowFields on MarketingLead {
    id
    name
    company
    pipeline
    stage
    source
    emails
    phones
    website
    instagram_handle
    instagram_url
    city
    score
    score_reason
    owner_user_id
    owner_name
    tags
    crm_ref {
      kind
      id
      promoted_at
      promoted_by
    }
    created_at
    updated_at
  }
`;

const LEAD_DETAIL_FIELDS = gql`
  fragment MarketingLeadDetailFields on MarketingLead {
    ...MarketingLeadRowFields
    notes {
      at
      by_user_id
      by_name
      text
    }
    timeline {
      at
      kind
      text
      by_name
    }
    source_ref {
      ig_lead_id
      search_id
      import_id
    }
  }
  ${LEAD_ROW_FIELDS}
`;

export const MARKETING_LEADS_TABLE = gql`
  query MarketingLeadsTable($query: TableQueryInput) {
    marketingLeadsTable(query: $query) {
      total
      rows {
        ...MarketingLeadRowFields
      }
    }
  }
  ${LEAD_ROW_FIELDS}
`;

export const MARKETING_LEAD = gql`
  query MarketingLead($id: ID!) {
    marketingLead(id: $id) {
      ...MarketingLeadDetailFields
    }
  }
  ${LEAD_DETAIL_FIELDS}
`;

export const MARKETING_LEAD_SUMMARY = gql`
  query MarketingLeadSummary {
    marketingLeadSummary {
      total
      stages {
        stage
        count
      }
      pipelines {
        pipeline
        count
      }
    }
  }
`;

export const CREATE_MARKETING_LEAD = gql`
  mutation CreateMarketingLead($input: MarketingLeadInput!) {
    createMarketingLead(input: $input) {
      merged
      lead {
        ...MarketingLeadDetailFields
      }
    }
  }
  ${LEAD_DETAIL_FIELDS}
`;

export const SET_MARKETING_LEAD_STAGE = gql`
  mutation SetMarketingLeadStage($id: ID!, $stage: MarketingLeadStage!, $note: String) {
    setMarketingLeadStage(id: $id, stage: $stage, note: $note) {
      ...MarketingLeadDetailFields
    }
  }
  ${LEAD_DETAIL_FIELDS}
`;

export const ASSIGN_MARKETING_LEAD_OWNER = gql`
  mutation AssignMarketingLeadOwner($id: ID!, $owner_user_id: ID) {
    assignMarketingLeadOwner(id: $id, owner_user_id: $owner_user_id) {
      ...MarketingLeadDetailFields
    }
  }
  ${LEAD_DETAIL_FIELDS}
`;

export const ADD_MARKETING_LEAD_NOTE = gql`
  mutation AddMarketingLeadNote($id: ID!, $text: String!) {
    addMarketingLeadNote(id: $id, text: $text) {
      ...MarketingLeadDetailFields
    }
  }
  ${LEAD_DETAIL_FIELDS}
`;

export const IMPORT_MARKETING_LEADS = gql`
  mutation ImportMarketingLeads($rows: [[String!]!]!, $mapping: MarketingLeadImportMapping!) {
    importMarketingLeads(rows: $rows, mapping: $mapping) {
      added
      merged
      skipped
      run_id
      rows {
        row
        outcome
        reason
        lead_id
      }
    }
  }
`;

export const PROMOTE_MARKETING_LEAD = gql`
  mutation PromoteMarketingLeadToCrm($id: ID!, $kind: MarketingLeadCrmKind!) {
    promoteMarketingLeadToCrm(id: $id, kind: $kind) {
      ...MarketingLeadDetailFields
    }
  }
  ${LEAD_DETAIL_FIELDS}
`;
