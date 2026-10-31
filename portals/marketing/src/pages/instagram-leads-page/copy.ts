import type { IgLeadSearchStatus, IgLeadStatus } from './queries';

/**
 * Every enum the page renders, mapped to its Localization key. The keys are
 * written out in full — never assembled from the enum — so the translation
 * gate can see that each one is used.
 */
export const LEAD_STATUSES: readonly IgLeadStatus[] = ['NEW', 'CONTACTED', 'REPLIED', 'CONVERTED', 'LOST'];

export const LEAD_STATUS_LABEL: Record<IgLeadStatus, string> = {
  NEW: 'marketing.igLeads.statusNew',
  CONTACTED: 'marketing.igLeads.statusContacted',
  REPLIED: 'marketing.igLeads.statusReplied',
  CONVERTED: 'marketing.igLeads.statusConverted',
  LOST: 'marketing.igLeads.statusLost',
};

export const LEAD_STATUS_COLOR: Record<IgLeadStatus, 'default' | 'info' | 'success' | 'primary' | 'error'> = {
  NEW: 'default',
  CONTACTED: 'info',
  REPLIED: 'success',
  CONVERTED: 'primary',
  LOST: 'error',
};

export const SEARCH_STATUS_LABEL: Record<IgLeadSearchStatus, string> = {
  RUNNING: 'marketing.igLeads.searchRunning',
  DONE: 'marketing.igLeads.searchDone',
  FAILED: 'marketing.igLeads.searchFailed',
};

/** A conversation in one of these is over; the composer is closed. */
export const CLOSED: readonly IgLeadStatus[] = ['REPLIED', 'CONVERTED', 'LOST'];
