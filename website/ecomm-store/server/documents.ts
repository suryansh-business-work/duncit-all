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
    }
  }
`;

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

export type SitemapKind = 'PRODUCT' | 'CATEGORY' | 'COLLECTION' | 'PET_TYPE';

export const SEO_SITEMAP = /* GraphQL */ `
  query EcommSeoSitemap {
    storeSitemap {
      kind
      slug
      updated_at
    }
  }
`;
