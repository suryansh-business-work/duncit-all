import { gql } from '@apollo/client';
import type { CmsGoogleFontPage, CmsSite } from '@duncit/gql-types';

export const CMS_SITE_FIELDS = gql`
  fragment CmsSiteFields on CmsSite {
    id
    key
    name
    domains
    legacy_site
    is_active
    favicon_url
    seo { title description og_image_url }
    header_fragment_id
    footer_fragment_id
    collections
    collection_paths { collection path }
    page_count
    updated_at
  }
`;

export type CmsSiteRow = Omit<CmsSite, 'design' | 'head_html' | 'body_end_html' | 'custom_css' | 'custom_js' | 'created_at' | 'seo'> & {
  seo: Pick<CmsSite['seo'], 'title' | 'description' | 'og_image_url'>;
};

export const CMS_SITES = gql`
  query CmsSites {
    cmsSites { ...CmsSiteFields }
  }
  ${CMS_SITE_FIELDS}
`;

export interface CmsSitesData {
  cmsSites: CmsSiteRow[];
}

export const CMS_SITE = gql`
  query CmsSite($id: ID!) {
    cmsSite(site_id: $id) { ...CmsSiteFields }
  }
  ${CMS_SITE_FIELDS}
`;

export interface CmsSiteData {
  cmsSite: CmsSiteRow | null;
}

/** The heavy half of a site — only the Design and Code tabs (and the editor) read it. */
export const CMS_SITE_DESIGN = gql`
  query CmsSiteDesign($id: ID!) {
    cmsSite(site_id: $id) {
      id
      design { tokens { name value group } fonts { family source weights italic role variable fallback files { weight style url } } font_urls base_css }
      head_html
      body_end_html
      custom_css
      custom_js
      updated_at
    }
  }
`;

export interface CmsSiteDesignData {
  cmsSite: Pick<CmsSite, 'id' | 'design' | 'head_html' | 'body_end_html' | 'custom_css' | 'custom_js' | 'updated_at'> | null;
}

export const CREATE_CMS_SITE = gql`
  mutation CreateCmsSite($input: CmsSiteInput!) {
    createCmsSite(input: $input) { ...CmsSiteFields }
  }
  ${CMS_SITE_FIELDS}
`;

export const UPDATE_CMS_SITE = gql`
  mutation UpdateCmsSite($id: ID!, $input: CmsSiteInput!) {
    updateCmsSite(site_id: $id, input: $input) { ...CmsSiteFields }
  }
  ${CMS_SITE_FIELDS}
`;

export const UPDATE_CMS_SITE_DESIGN = gql`
  mutation UpdateCmsSiteDesign($id: ID!, $input: CmsDesignInput!) {
    updateCmsSiteDesign(site_id: $id, input: $input) {
      id
      design { tokens { name value group } fonts { family source weights italic role variable fallback files { weight style url } } font_urls base_css }
    }
  }
`;

export const UPDATE_CMS_SITE_CODE = gql`
  mutation UpdateCmsSiteCode($id: ID!, $input: CmsSiteCodeInput!) {
    updateCmsSiteCode(site_id: $id, input: $input) {
      id
      head_html
      body_end_html
      custom_css
      custom_js
    }
  }
`;

export const DELETE_CMS_SITE = gql`
  mutation DeleteCmsSite($id: ID!) {
    deleteCmsSite(site_id: $id)
  }
`;

export const CMS_GOOGLE_FONTS = gql`
  query CmsGoogleFonts($search: String, $category: String, $offset: Int, $limit: Int) {
    cmsGoogleFonts(search: $search, category: $category, offset: $offset, limit: $limit) {
      total
      categories
      fonts { family category weights italic popularity }
    }
  }
`;

export interface CmsGoogleFontsData {
  cmsGoogleFonts: CmsGoogleFontPage;
}
