import { gql } from '@apollo/client';
import type { CmsPage, CmsRenderResult } from '@duncit/gql-types';

/** A page as the table shows it — never the editor JSON. */
export const CMS_PAGE_ROW = gql`
  fragment CmsPageRow on CmsPage {
    id
    site_id
    kind
    collection_type
    title
    path
    is_published
    has_unpublished_changes
    seo { title description og_image_url canonical_url noindex og_title og_description twitter_card keywords json_ld meta_tags { name content } }
    show_header
    show_footer
    head_html
    custom_css
    custom_js
    sort_order
    published { version published_at }
    updated_at
  }
`;

export type CmsPageRow = Omit<CmsPage, 'draft' | 'published' | 'updated_by' | 'created_at'> & {
  published: Pick<CmsPage['published'], 'version' | 'published_at'>;
};

export const CMS_PAGES_TABLE = gql`
  query CmsPagesTable($siteId: ID!, $query: TableQueryInput) {
    cmsPagesTable(site_id: $siteId, query: $query) {
      total
      rows { ...CmsPageRow }
    }
  }
  ${CMS_PAGE_ROW}
`;

/** Everything the editor opens with, the GrapesJS project included. */
export const CMS_PAGE_DRAFT = gql`
  query CmsPageDraft($id: ID!) {
    cmsPage(page_id: $id) {
      ...CmsPageRow
      draft { project html css }
    }
  }
  ${CMS_PAGE_ROW}
`;

export interface CmsPageDraftData {
  cmsPage: (CmsPageRow & { draft: CmsPage['draft'] }) | null;
}

export const CREATE_CMS_PAGE = gql`
  mutation CreateCmsPage($siteId: ID!, $input: CmsPageInput!) {
    createCmsPage(site_id: $siteId, input: $input) { ...CmsPageRow }
  }
  ${CMS_PAGE_ROW}
`;

export const UPDATE_CMS_PAGE = gql`
  mutation UpdateCmsPage($id: ID!, $input: CmsPageInput!) {
    updateCmsPage(page_id: $id, input: $input) { ...CmsPageRow }
  }
  ${CMS_PAGE_ROW}
`;

export const SAVE_CMS_PAGE_DRAFT = gql`
  mutation SaveCmsPageDraft($id: ID!, $input: CmsDraftInput!) {
    saveCmsPageDraft(page_id: $id, input: $input) { id has_unpublished_changes updated_at }
  }
`;

export const PUBLISH_CMS_PAGE = gql`
  mutation PublishCmsPage($id: ID!) {
    publishCmsPage(page_id: $id) { id is_published has_unpublished_changes published { version published_at } updated_at }
  }
`;

export const UNPUBLISH_CMS_PAGE = gql`
  mutation UnpublishCmsPage($id: ID!) {
    unpublishCmsPage(page_id: $id) { id is_published has_unpublished_changes updated_at }
  }
`;

export const DUPLICATE_CMS_PAGE = gql`
  mutation DuplicateCmsPage($id: ID!, $title: String!, $path: String!) {
    duplicateCmsPage(page_id: $id, title: $title, path: $path) { id }
  }
`;

export const DELETE_CMS_PAGE = gql`
  mutation DeleteCmsPage($id: ID!) {
    deleteCmsPage(page_id: $id)
  }
`;

export const CMS_PREVIEW = gql`
  query CmsPreview($pageId: ID!, $entryId: ID) {
    cmsPreview(page_id: $pageId, entry_id: $entryId) {
      status
      title
      html
      css
      head_html
      custom_js
      site { design { tokens { name value group } fonts { family source weights italic role variable fallback files { weight style url } } font_urls base_css } custom_css }
    }
  }
`;

export interface CmsPreviewData {
  cmsPreview: Pick<CmsRenderResult, 'status' | 'title' | 'html' | 'css' | 'head_html' | 'custom_js'> & {
    site: { design: NonNullable<CmsRenderResult['site']>['design']; custom_css: string } | null;
  };
}

/** The draft on the page's own domain, behind a signed short-lived preview flag. */
export const CMS_PREVIEW_LINK = gql`
  query CmsPreviewLink($pageId: ID!) {
    cmsPreviewLink(page_id: $pageId) { url expires_at }
  }
`;

export interface CmsPreviewLinkData {
  cmsPreviewLink: { url: string; expires_at: string };
}
