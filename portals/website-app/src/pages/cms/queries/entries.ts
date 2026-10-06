import { gql } from '@apollo/client';
import type { CmsEntry } from '@duncit/gql-types';

export const CMS_ENTRY_ROW = gql`
  fragment CmsEntryRow on CmsEntry {
    id
    site_id
    collection_type
    title
    slug
    summary
    cover_image_url
    category
    author_name
    is_published
    published_at
    sort_order
    updated_at
  }
`;

export type CmsEntryRow = Pick<
  CmsEntry,
  | 'id'
  | 'site_id'
  | 'collection_type'
  | 'title'
  | 'slug'
  | 'summary'
  | 'cover_image_url'
  | 'category'
  | 'author_name'
  | 'is_published'
  | 'published_at'
  | 'sort_order'
  | 'updated_at'
>;

export const CMS_ENTRIES_TABLE = gql`
  query CmsEntriesTable($siteId: ID!, $collection: CmsCollection!, $query: TableQueryInput) {
    cmsEntriesTable(site_id: $siteId, collection_type: $collection, query: $query) {
      total
      rows { ...CmsEntryRow }
    }
  }
  ${CMS_ENTRY_ROW}
`;

export const CMS_ENTRY = gql`
  query CmsEntry($id: ID!) {
    cmsEntry(entry_id: $id) {
      ...CmsEntryRow
      body_html
      tags
      fields { key value }
      seo { title description og_image_url canonical_url noindex og_title og_description twitter_card keywords json_ld meta_tags { name content } }
    }
  }
  ${CMS_ENTRY_ROW}
`;

export interface CmsEntryData {
  cmsEntry: (CmsEntryRow & Pick<CmsEntry, 'body_html' | 'tags' | 'fields' | 'seo'>) | null;
}

export const CREATE_CMS_ENTRY = gql`
  mutation CreateCmsEntry($siteId: ID!, $input: CmsEntryInput!) {
    createCmsEntry(site_id: $siteId, input: $input) { id }
  }
`;

export const UPDATE_CMS_ENTRY = gql`
  mutation UpdateCmsEntry($id: ID!, $input: CmsEntryInput!) {
    updateCmsEntry(entry_id: $id, input: $input) { id }
  }
`;

export const DELETE_CMS_ENTRY = gql`
  mutation DeleteCmsEntry($id: ID!) {
    deleteCmsEntry(entry_id: $id)
  }
`;
