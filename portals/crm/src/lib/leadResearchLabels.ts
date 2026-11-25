import type { ChipProps } from '@mui/material';
import type { Translate } from '@duncit/shell';
import { CRM_CANDIDATE_STATUS_KEY, CRM_CANDIDATE_STATUS_TONE } from '@duncit/utils';

/**
 * Copy keys and chip colours for the Lead Research values the API returns:
 * a candidate's review status and origin, an approval's outcome, a source
 * page's kind and a discovery job's status. Literal keys, so the
 * localization gate sees each one. Shared by Lead Research and the Lead
 * Quality analytics page (research queue counts).
 */

type ChipColor = ChipProps['color'];

/* Candidate status copy and colours live in @duncit/utils (crm-quality-labels), shared with the Duncit CRM app. */
export const CANDIDATE_STATUS_KEY: Record<string, string> = { ...CRM_CANDIDATE_STATUS_KEY };

export const CANDIDATE_STATUS_COLOR: Record<string, ChipColor> = { ...CRM_CANDIDATE_STATUS_TONE };

export const CANDIDATE_ORIGIN_KEY: Record<string, string> = {
  DISCOVERY: 'crm.leadResearch.originDiscovery',
  MCP: 'crm.leadResearch.originMcp',
};

export const OUTCOME_KEY: Record<string, string> = {
  ADDED: 'crm.leadResearch.outcomeAdded',
  DUPLICATE: 'crm.leadResearch.outcomeDuplicate',
  NOT_QUALIFIED: 'crm.leadResearch.outcomeNotQualified',
  SKIPPED: 'crm.leadResearch.outcomeSkipped',
  FAILED: 'crm.leadResearch.outcomeFailed',
};

export const OUTCOME_COLOR: Record<string, ChipColor> = {
  ADDED: 'success',
  DUPLICATE: 'warning',
  NOT_QUALIFIED: 'warning',
  SKIPPED: 'default',
  FAILED: 'error',
};

export const SOURCE_KIND_KEY: Record<string, string> = {
  INSTAGRAM: 'crm.leadResearch.sourceInstagram',
  GOOGLE_MAPS: 'crm.leadResearch.sourceGoogleMaps',
  WEB: 'crm.leadResearch.sourceWeb',
};

export const JOB_STATUS_KEY: Record<string, string> = {
  RUNNING: 'crm.leadResearch.jobRunning',
  COMPLETED: 'crm.leadResearch.jobCompleted',
  FAILED: 'crm.leadResearch.jobFailed',
  CANCELLED: 'crm.leadResearch.jobCancelled',
};

export const JOB_STATUS_COLOR: Record<string, ChipColor> = {
  RUNNING: 'info',
  COMPLETED: 'success',
  FAILED: 'error',
  CANCELLED: 'default',
};

/** A value's copy, or the raw value when the server sends one this build does not know yet. */
export const labelOf = (t: Translate, map: Record<string, string>, value: string | null | undefined): string => {
  const key = value ? map[value] : undefined;
  return key ? t(key) : (value ?? '');
};
