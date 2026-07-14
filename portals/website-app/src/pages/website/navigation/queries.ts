import { gql } from '@apollo/client';

export const WEBSITE_NAV = gql`
  query WebsiteNav($site: WebsiteNavSite) {
    websiteNav(site: $site) {
      id
      site
      area
      group_label
      label
      url
      sort_order
      is_active
    }
  }
`;

export const WEBSITE_NAV_TABLE = gql`
  query WebsiteNavTable($query: TableQueryInput) {
    websiteNavTable(query: $query) {
      total
      rows {
        id
        site
        area
        group_label
        label
        url
        sort_order
        is_active
        created_at
      }
    }
  }
`;

export const CREATE_NAV_ITEM = gql`
  mutation CreateWebsiteNavItem($input: WebsiteNavItemInput!) {
    createWebsiteNavItem(input: $input) {
      id
    }
  }
`;

export const UPDATE_NAV_ITEM = gql`
  mutation UpdateWebsiteNavItem($id: ID!, $input: WebsiteNavItemInput!) {
    updateWebsiteNavItem(item_id: $id, input: $input) {
      id
    }
  }
`;

export const DELETE_NAV_ITEM = gql`
  mutation DeleteWebsiteNavItem($id: ID!) {
    deleteWebsiteNavItem(item_id: $id)
  }
`;

export type WebsiteNavSite = 'MAIN' | 'PARTNERS' | 'ADS' | 'EARNWITH';
export type WebsiteNavArea = 'HEADER' | 'FOOTER';

export interface WebsiteNavItem {
  id: string;
  site: WebsiteNavSite;
  area: WebsiteNavArea;
  group_label: string;
  label: string;
  url: string;
  sort_order: number;
  is_active: boolean;
  /** Selected by WEBSITE_NAV_TABLE only (Created filter column); absent on WEBSITE_NAV rows. */
  created_at?: string;
}

export const NAV_SITES: { value: WebsiteNavSite; label: string }[] = [
  { value: 'MAIN', label: 'duncit.com' },
  { value: 'PARTNERS', label: 'partners.duncit.com' },
  { value: 'ADS', label: 'ads.duncit.com' },
  { value: 'EARNWITH', label: 'earnwith.duncit.com' },
];

export const NAV_AREAS: WebsiteNavArea[] = ['HEADER', 'FOOTER'];
