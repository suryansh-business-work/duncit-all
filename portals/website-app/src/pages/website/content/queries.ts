import { gql } from '@apollo/client';
import type { SolutionAudience } from '@duncit/utils';

export type WebsitePageType = 'CAREERS' | 'NEWSROOM' | 'BLOG' | 'SOLUTIONS';

/** Per-type page copy (websiteApp.contentTypes.*) so each nav item reuses one content manager. */
export const contentLabels = (t: (key: string) => string, type: WebsitePageType) => ({
  title: t(`websiteApp.contentTypes.${type}.title`),
  description: t(`websiteApp.contentTypes.${type}.description`),
});

export interface WebsiteContentItem {
  id: string;
  type: WebsitePageType;
  title: string;
  slug: string;
  summary: string;
  body: string;
  category: string;
  image_url: string;
  cta_label: string;
  cta_url: string;
  published_at: string | null;
  is_published: boolean;
  sort_order: number;
  /** SOLUTIONS only: the duncit.com/solutions section it is listed under; null otherwise. */
  audience: SolutionAudience | null;
  /** SOLUTIONS only: announced, not on sale yet. */
  coming_soon: boolean;
  /** Selected by CONTENT_TABLE only (Created filter column); absent on WEBSITE_CONTENT rows. */
  created_at?: string;
  updated_at: string;
}

export const WEBSITE_CONTENT = gql`
  query WebsiteContent($type: WebsitePageType) {
    websiteContent(type: $type) {
      id
      type
      title
      slug
      summary
      body
      category
      image_url
      cta_label
      cta_url
      published_at
      is_published
      sort_order
      audience
      coming_soon
      updated_at
    }
  }
`;

/** Same selection as WEBSITE_CONTENT rows so table rows can feed the edit dialog. */
const CONTENT_ROW_FIELDS = gql`
  fragment WebsiteContentRowFields on WebsiteContentItem {
    id
    type
    title
    slug
    summary
    body
    category
    image_url
    cta_label
    cta_url
    published_at
    is_published
    sort_order
    audience
    coming_soon
    created_at
    updated_at
  }
`;

export const CONTENT_TABLE = gql`
  query WebsiteContentTable($query: TableQueryInput) {
    websiteContentTable(query: $query) {
      total
      rows {
        ...WebsiteContentRowFields
      }
    }
  }
  ${CONTENT_ROW_FIELDS}
`;

export const CREATE_CONTENT = gql`
  mutation CreateWebsiteContent($input: WebsiteContentInput!) {
    createWebsiteContent(input: $input) {
      id
    }
  }
`;

export const UPDATE_CONTENT = gql`
  mutation UpdateWebsiteContent($id: ID!, $input: WebsiteContentInput!) {
    updateWebsiteContent(content_id: $id, input: $input) {
      id
    }
  }
`;

export const DELETE_CONTENT = gql`
  mutation DeleteWebsiteContent($id: ID!) {
    deleteWebsiteContent(content_id: $id)
  }
`;
