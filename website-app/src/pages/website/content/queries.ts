import { gql } from '@apollo/client';

export type WebsitePageType = 'CAREERS' | 'NEWSROOM' | 'BLOG';

/** Per-type page copy so each nav item reuses one content manager. */
export const CONTENT_LABELS: Record<WebsitePageType, { title: string; description: string }> = {
  CAREERS: {
    title: 'Career',
    description: 'Manage career and job posts published on duncit.com.',
  },
  NEWSROOM: {
    title: 'Newsroom',
    description: 'Manage newsroom and press entries published on duncit.com.',
  },
  BLOG: {
    title: 'Blog',
    description: 'Manage blog articles published on duncit.com.',
  },
};

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
      updated_at
    }
  }
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
