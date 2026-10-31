import type { StatusChipColor } from '@duncit/ui';
import type {
  MarketingLeadCrmKind,
  MarketingLeadPipeline,
  MarketingLeadSource,
  MarketingLeadStage,
  MarketingLeadTimelineKind,
} from './queries';

/**
 * Every enum the Leads page renders, mapped to its Localization key. The keys
 * are written out in full — never assembled from the enum — so the
 * translation gate can see that each one is used.
 */
export const PIPELINES: readonly MarketingLeadPipeline[] = ['VENUE', 'HOST', 'BRAND', 'INFLUENCER', 'ADVERTISER', 'GENERAL'];

export const PIPELINE_LABEL: Record<MarketingLeadPipeline, string> = {
  VENUE: 'marketing.leads.pipelineVenue',
  HOST: 'marketing.leads.pipelineHost',
  BRAND: 'marketing.leads.pipelineBrand',
  INFLUENCER: 'marketing.leads.pipelineInfluencer',
  ADVERTISER: 'marketing.leads.pipelineAdvertiser',
  GENERAL: 'marketing.leads.pipelineGeneral',
};

/** In the order a lead moves: open stages first, then the two it ends in. */
export const STAGES: readonly MarketingLeadStage[] = ['NEW', 'CONTACTED', 'REPLIED', 'QUALIFIED', 'CONVERTED', 'LOST'];

export const STAGE_LABEL: Record<MarketingLeadStage, string> = {
  NEW: 'marketing.leads.stageNew',
  CONTACTED: 'marketing.leads.stageContacted',
  REPLIED: 'marketing.leads.stageReplied',
  QUALIFIED: 'marketing.leads.stageQualified',
  CONVERTED: 'marketing.leads.stageConverted',
  LOST: 'marketing.leads.stageLost',
};

export const STAGE_COLORS: Record<MarketingLeadStage, StatusChipColor> = {
  NEW: 'default',
  CONTACTED: 'info',
  REPLIED: 'primary',
  QUALIFIED: 'warning',
  CONVERTED: 'success',
  LOST: 'error',
};

export const SOURCES: readonly MarketingLeadSource[] = ['INSTAGRAM', 'GOOGLE_PLACES', 'WEB_SEARCH', 'IMPORT', 'MANUAL'];

export const SOURCE_LABEL: Record<MarketingLeadSource, string> = {
  INSTAGRAM: 'marketing.leads.sourceInstagram',
  GOOGLE_PLACES: 'marketing.leads.sourceGooglePlaces',
  WEB_SEARCH: 'marketing.leads.sourceWebSearch',
  IMPORT: 'marketing.leads.sourceImport',
  MANUAL: 'marketing.leads.sourceManual',
};

export const CRM_KIND_LABEL: Record<MarketingLeadCrmKind, string> = {
  VENUE: 'marketing.leads.crmVenue',
  HOST: 'marketing.leads.crmHost',
  ECOMM: 'marketing.leads.crmEcomm',
};

/** Which CRM record each pipeline becomes; a pipeline absent here cannot be promoted. Mirrors the server's rule. */
export const CRM_KIND_FOR_PIPELINE: Readonly<Partial<Record<MarketingLeadPipeline, MarketingLeadCrmKind>>> = {
  VENUE: 'VENUE',
  HOST: 'HOST',
  BRAND: 'ECOMM',
  ADVERTISER: 'ECOMM',
};

export const TIMELINE_LABEL: Record<MarketingLeadTimelineKind, string> = {
  CREATED: 'marketing.leads.timelineCreated',
  STAGE: 'marketing.leads.timelineStage',
  OWNER: 'marketing.leads.timelineOwner',
  NOTE: 'marketing.leads.timelineNote',
  PROMOTED: 'marketing.leads.timelinePromoted',
  IMPORTED: 'marketing.leads.timelineImported',
  SOURCE: 'marketing.leads.timelineSource',
};

/** The bounds the form holds a lead to — the server's own (marketingLead.types LEAD_LIMITS). */
export const LEAD_LIMITS = { name: 120, company: 120, city: 80, website: 300, note: 2000, importRows: 2000 } as const;

/** Whether a value read off the URL names a stage or a pipeline — anything else is ignored, not pinned. */
export const isLeadStage = (value: string | null): value is MarketingLeadStage => STAGES.some((stage) => stage === value);

export const isLeadPipeline = (value: string | null): value is MarketingLeadPipeline =>
  PIPELINES.some((pipeline) => pipeline === value);

/** A lead in one of these has a conversation that is over. */
export const FINAL_STAGES: readonly MarketingLeadStage[] = ['CONVERTED', 'LOST'];
