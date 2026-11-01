/**
 * The Integrations page's tabs: one per social network's app (Instagram,
 * Facebook and Threads are three apps, never one Meta app), then the keys the
 * research, lead and AI features run on. Each tab is one environment category,
 * edited with the Tech console's own Environment Variables editor behind the
 * same emailed root-admin code; the server lets a marketing manager reach these
 * categories and no other.
 *
 * Keys are written out in full so the translation gate can see each one.
 */
export type IntegrationCategory =
  | 'SOCIAL_INSTAGRAM'
  | 'SOCIAL_FACEBOOK'
  | 'SOCIAL_THREADS'
  | 'SOCIAL_YOUTUBE'
  | 'SOCIAL_LINKEDIN'
  | 'SOCIAL_X'
  | 'SERPER'
  | 'ANTHROPIC';

export interface IntegrationTab {
  category: IntegrationCategory;
  labelKey: string;
  hintKey: string;
  /** A social app: it must register the one redirect URL, shown above its entries. */
  social: boolean;
}

export const INTEGRATION_TABS: readonly IntegrationTab[] = [
  {
    category: 'SOCIAL_INSTAGRAM',
    labelKey: 'marketing.integrations.tabInstagram',
    hintKey: 'marketing.integrations.hintInstagram',
    social: true,
  },
  {
    category: 'SOCIAL_FACEBOOK',
    labelKey: 'marketing.integrations.tabFacebook',
    hintKey: 'marketing.integrations.hintFacebook',
    social: true,
  },
  {
    category: 'SOCIAL_THREADS',
    labelKey: 'marketing.integrations.tabThreads',
    hintKey: 'marketing.integrations.hintThreads',
    social: true,
  },
  {
    category: 'SOCIAL_YOUTUBE',
    labelKey: 'marketing.integrations.tabYoutube',
    hintKey: 'marketing.integrations.hintYoutube',
    social: true,
  },
  {
    category: 'SOCIAL_LINKEDIN',
    labelKey: 'marketing.integrations.tabLinkedin',
    hintKey: 'marketing.integrations.hintLinkedin',
    social: true,
  },
  { category: 'SOCIAL_X', labelKey: 'marketing.integrations.tabX', hintKey: 'marketing.integrations.hintX', social: true },
  {
    category: 'SERPER',
    labelKey: 'marketing.integrations.tabSerper',
    hintKey: 'marketing.integrations.hintSerper',
    social: false,
  },
  {
    category: 'ANTHROPIC',
    labelKey: 'marketing.integrations.tabAnthropic',
    hintKey: 'marketing.integrations.hintAnthropic',
    social: false,
  },
];

export const DEFAULT_INTEGRATION_TAB: IntegrationCategory = 'SOCIAL_INSTAGRAM';

/** The tab a category names, or the first tab for an address that names none. */
export function integrationTabFor(category: string): IntegrationTab {
  return INTEGRATION_TABS.find((tab) => tab.category === category) ?? INTEGRATION_TABS[0];
}
