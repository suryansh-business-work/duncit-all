/**
 * Marketing → Leads: the one pipeline every source feeds. An Instagram
 * search, a CSV import, a lead typed in by hand and, later, a Google Places
 * search all land here as a MarketingLead, are worked on the Leads page, and
 * are handed to the CRM — one way — when sales should take over.
 */
export const LEAD_PIPELINES = ['VENUE', 'HOST', 'BRAND', 'INFLUENCER', 'ADVERTISER', 'GENERAL'] as const;
export type MarketingLeadPipeline = (typeof LEAD_PIPELINES)[number];

export const LEAD_STAGES = ['NEW', 'CONTACTED', 'REPLIED', 'QUALIFIED', 'CONVERTED', 'LOST'] as const;
export type MarketingLeadStage = (typeof LEAD_STAGES)[number];

export const LEAD_SOURCES = ['INSTAGRAM', 'GOOGLE_PLACES', 'WEB_SEARCH', 'IMPORT', 'MANUAL'] as const;
export type MarketingLeadSource = (typeof LEAD_SOURCES)[number];

export const LEAD_TIMELINE_KINDS = ['CREATED', 'STAGE', 'OWNER', 'NOTE', 'PROMOTED', 'IMPORTED', 'SOURCE', 'OUTREACH'] as const;
export type MarketingLeadTimelineKind = (typeof LEAD_TIMELINE_KINDS)[number];

/** The CRM records a lead can become. Each has its own collection and its own create function in crm.service. */
export const LEAD_CRM_KINDS = ['VENUE', 'HOST', 'ECOMM'] as const;
export type MarketingLeadCrmKind = (typeof LEAD_CRM_KINDS)[number];

/** Which CRM record each pipeline may be promoted into. A pipeline absent here cannot be promoted. */
export const CRM_KIND_FOR_PIPELINE: Readonly<Partial<Record<MarketingLeadPipeline, MarketingLeadCrmKind>>> = {
  VENUE: 'VENUE',
  HOST: 'HOST',
  BRAND: 'ECOMM',
  ADVERTISER: 'ECOMM',
};

/** The bounds the API holds a lead to. */
export const LEAD_LIMITS = {
  name: { min: 1, max: 120 },
  company: { max: 120 },
  city: { max: 80 },
  website: { max: 300 },
  handle: { max: 30 },
  note: { min: 1, max: 2000 },
  score_reason: { max: 300 },
  tags: { max: 20, each: 40 },
  contacts: { each: 5 },
  import_rows: { max: 2000 },
} as const;

/** Who did something to a lead, as the timeline names them. */
export interface LeadActor {
  id: string | null;
  name: string;
}

export const SYSTEM_LEAD_ACTOR: LeadActor = { id: null, name: 'System' };

/** What any source hands the pipeline. Everything but the name is optional. */
export interface LeadInput {
  name: string;
  company?: string | null;
  pipeline?: MarketingLeadPipeline | null;
  stage?: MarketingLeadStage | null;
  source?: MarketingLeadSource | null;
  emails?: readonly string[] | null;
  phones?: readonly string[] | null;
  website?: string | null;
  instagram_handle?: string | null;
  city?: string | null;
  score?: number | null;
  score_reason?: string | null;
  tags?: readonly string[] | null;
  source_ref?: { ig_lead_id?: string | null; search_id?: string | null; import_id?: string | null } | null;
}
