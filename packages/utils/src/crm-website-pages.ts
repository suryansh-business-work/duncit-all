/**
 * A CRM lead's Website tab: how each saved page's status reads, how many pages
 * one scrape may discover, and which pages still need their content fetched.
 * Shared by the CRM portal's tab and the Duncit CRM app's.
 */
import type { CrmTone } from './crm-quality-labels';

export const CRM_WEBSITE_PAGE_STATUS_TONE: Readonly<Record<string, CrmTone>> = {
  DISCOVERED: 'default',
  FETCHED: 'success',
  ERROR: 'error',
};

/** Pages one scrape may discover — the server refuses anything outside it. */
export const CRM_WEBSITE_SCRAPE_LIMIT = { min: 1, max: 200, initial: 20 } as const;

/** The pages "Fetch all" still has to read, in list order. */
export const crmUnfetchedPages = <T extends { status: string }>(pages: readonly T[]): T[] =>
  pages.filter((page) => page.status !== 'FETCHED');
