/**
 * The public reads the HTML server makes, and the shapes they answer with.
 * Plain strings: this bundle ships without a GraphQL client.
 */

export interface SeoSettings {
  store_name: string;
  tagline: string;
  seo_title: string;
  seo_description: string;
  og_image_url: string;
  store_enabled: boolean;
  favicon_url: string;
  /** The festive window open right now; its favicon replaces the store's while it lasts. */
  active_occasion: { favicon_url: string } | null;
}

export const SEO_SETTINGS = /* GraphQL */ `
  query EcommSeoSettings {
    storeSettings {
      store_name
      tagline
      seo_title
      seo_description
      og_image_url
      store_enabled
      favicon_url
      active_occasion { favicon_url }
    }
  }
`;

export interface SeoFaq {
  question: string;
  answer: string;
}

export interface SeoProduct {
  title: string;
  slug: string;
  seo_title: string;
  seo_description: string;
  short_description: string;
  description: string;
  image_url: string;
  images: string[];
  price: number;
  in_stock: boolean;
  rating: number;
  rating_count: number;
  brand_name: string;
  default_variant_id: string | null;
  variants: { id: string; sku: string }[];
  breadcrumbs: { name: string; slug: string }[];
  faqs: SeoFaq[];
}

export const SEO_PRODUCT = /* GraphQL */ `
  query EcommSeoProduct($slug: String!) {
    storeProduct(slug: $slug) {
      title
      slug
      seo_title
      seo_description
      short_description
      description
      image_url
      images
      price
      in_stock
      rating
      rating_count
      brand_name
      default_variant_id
      variants { id sku }
      breadcrumbs { name slug }
      faqs { question answer }
    }
  }
`;

export interface SeoShelf {
  name: string;
  slug: string;
  seo_title?: string;
  seo_description?: string;
  description: string;
  image_url: string;
  banner_url?: string;
  parent?: { name: string; slug: string } | null;
}

export const SEO_CATEGORY = /* GraphQL */ `
  query EcommSeoCategory($slug: String!) {
    storeCategory(slug: $slug) {
      name
      slug
      seo_title
      seo_description
      description
      image_url
      banner_url
      parent { name slug }
    }
  }
`;

export const SEO_COLLECTION = /* GraphQL */ `
  query EcommSeoCollection($slug: String!) {
    storeCollection(slug: $slug) {
      name
      slug
      seo_title
      seo_description
      description
      image_url
      banner_url
    }
  }
`;

export const SEO_PET_TYPE = /* GraphQL */ `
  query EcommSeoPetType($slug: String!) {
    storePetType(slug: $slug) {
      name
      slug
      description
      image_url
    }
  }
`;

export interface SeoBrand {
  id: string;
  name: string;
  slug: string;
  logo_url: string;
  tagline: string;
}

export const SEO_BRANDS = /* GraphQL */ `
  query EcommSeoBrands {
    storeBrands {
      id
      name
      slug
      logo_url
      tagline
    }
  }
`;

export interface SeoPage {
  title: string;
  slug: string;
  seo_title: string;
  seo_description: string;
  updated_at: string;
}

export const SEO_PAGE = /* GraphQL */ `
  query EcommSeoPage($slug: String!) {
    storePage(slug: $slug) {
      title
      slug
      seo_title
      seo_description
      updated_at
    }
  }
`;

export type SitemapKind = 'PRODUCT' | 'CATEGORY' | 'COLLECTION' | 'PET_TYPE' | 'BRAND' | 'PAGE';

export const SEO_SITEMAP = /* GraphQL */ `
  query EcommSeoSitemap {
    storeSitemap {
      kind
      slug
      updated_at
    }
  }
`;
