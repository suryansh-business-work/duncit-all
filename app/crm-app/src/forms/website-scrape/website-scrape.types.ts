import { z } from 'zod';
import { CRM_WEBSITE_SCRAPE_LIMIT } from '@duncit/utils';

import type { Translate } from '@/i18n/fallback';

/** How many pages one scrape of the lead's website may discover — the portal's 1 to 200. */
export const makeWebsiteScrapeSchema = (t: Translate) => {
  const { min, max } = CRM_WEBSITE_SCRAPE_LIMIT;
  const message = t('crm.websitePages.limitInvalid', { vars: { min, max } });
  return z.object({
    limit: z.number({ message }).int(message).min(min, message).max(max, message),
  });
};

export type WebsiteScrapeValues = z.infer<ReturnType<typeof makeWebsiteScrapeSchema>>;

export const websiteScrapeDefaults: WebsiteScrapeValues = {
  limit: CRM_WEBSITE_SCRAPE_LIMIT.initial,
};
