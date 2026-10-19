import { gql } from '@apollo/client';
import type { DuncitTabItem } from '@duncit/tabs';
import { NAV_SITES } from '../navigation/queries';
import type { EarnSite, WebsiteEarnSection } from './earn-form';

const EARN_FIELDS = gql`
  fragment WebsiteEarnSectionFields on WebsiteEarnSection {
    site
    enabled
    position
    variant
    accent
    eyebrow
    heading
    heading_muted
    text
    cta_label
    cta_url
    images
    floating_enabled
    floating_label
    updated_at
  }
`;

export const WEBSITE_EARN_SECTIONS = gql`
  query WebsiteEarnSections {
    websiteEarnSections {
      ...WebsiteEarnSectionFields
    }
  }
  ${EARN_FIELDS}
`;

export const SAVE_WEBSITE_EARN_SECTION = gql`
  mutation SaveWebsiteEarnSection($input: WebsiteEarnSectionInput!) {
    saveWebsiteEarnSection(input: $input) {
      ...WebsiteEarnSectionFields
    }
  }
  ${EARN_FIELDS}
`;

export interface WebsiteEarnSectionsData {
  websiteEarnSections: WebsiteEarnSection[];
}

export interface SaveWebsiteEarnSectionData {
  saveWebsiteEarnSection: WebsiteEarnSection;
}

const isEarnSite = (value: string): value is EarnSite => value === 'MAIN' || value === 'PARTNERS' || value === 'ADS';

/** The sites that show the section — every navigation site except earnwith, which is the earn site itself. */
export const EARN_SITE_TABS: DuncitTabItem<EarnSite>[] = NAV_SITES.flatMap(({ value, label }) =>
  isEarnSite(value) ? [{ value, label }] : [],
);
