import type { WebsitePageType } from '../queries';

export interface WebsiteContentFormValues {
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

/** Shape sent to the createWebsiteContent / updateWebsiteContent mutations. */
export interface WebsiteContentInput
  extends Omit<WebsiteContentFormValues, 'published_at' | 'slug'> {
  type: WebsitePageType;
  slug?: string;
  published_at: string | null;
}
