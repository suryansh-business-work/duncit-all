import { gql } from '@apollo/client';

export type WebsitePageType = 'CAREERS' | 'NEWSROOM' | 'BLOG';

export const PAGE_TYPES: { value: WebsitePageType; label: string }[] = [
  { value: 'CAREERS', label: 'Careers' },
  { value: 'NEWSROOM', label: 'Newsroom' },
  { value: 'BLOG', label: 'Blog' },
];

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
    createWebsiteContent(input: $input) { id }
  }
`;

export const UPDATE_CONTENT = gql`
  mutation UpdateWebsiteContent($id: ID!, $input: WebsiteContentInput!) {
    updateWebsiteContent(content_id: $id, input: $input) { id }
  }
`;

export const DELETE_CONTENT = gql`
  mutation DeleteWebsiteContent($id: ID!) {
    deleteWebsiteContent(content_id: $id)
  }
`;

export interface WebsiteContentForm {
  id?: string;
  type: WebsitePageType;
  title: string;
  slug: string;
  summary: string;
  body: string;
  category: string;
  image_url: string;
  cta_label: string;
  cta_url: string;
  published_at: string;
  is_published: boolean;
  sort_order: number;
}

export const blankContentForm = (type: WebsitePageType): WebsiteContentForm => ({
  type,
  title: '',
  slug: '',
  summary: '',
  body: '',
  category: '',
  image_url: '',
  cta_label: '',
  cta_url: '',
  published_at: new Date().toISOString().slice(0, 16),
  is_published: true,
  sort_order: 0,
});

export const toContentForm = (item: any): WebsiteContentForm => ({
  id: item.id,
  type: item.type,
  title: item.title ?? '',
  slug: item.slug ?? '',
  summary: item.summary ?? '',
  body: item.body ?? '',
  category: item.category ?? '',
  image_url: item.image_url ?? '',
  cta_label: item.cta_label ?? '',
  cta_url: item.cta_url ?? '',
  published_at: item.published_at ? new Date(item.published_at).toISOString().slice(0, 16) : '',
  is_published: item.is_published !== false,
  sort_order: item.sort_order ?? 0,
});

export const toContentInput = (form: WebsiteContentForm) => ({
  type: form.type,
  title: form.title,
  slug: form.slug || undefined,
  summary: form.summary,
  body: form.body,
  category: form.category,
  image_url: form.image_url,
  cta_label: form.cta_label,
  cta_url: form.cta_url,
  published_at: form.published_at ? new Date(form.published_at).toISOString() : null,
  is_published: form.is_published,
  sort_order: Number(form.sort_order) || 0,
});