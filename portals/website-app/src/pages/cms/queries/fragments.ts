import { gql } from '@apollo/client';
import type { CmsFragment, CmsVersion } from '@duncit/gql-types';

export const CMS_FRAGMENT_ROW = gql`
  fragment CmsFragmentRow on CmsFragment {
    id
    site_id
    key
    name
    kind
    is_published
    has_unpublished_changes
    published { version published_at }
    updated_at
  }
`;

export type CmsFragmentRow = Pick<CmsFragment, 'id' | 'site_id' | 'key' | 'name' | 'kind' | 'is_published' | 'has_unpublished_changes' | 'updated_at'> & {
  published: Pick<CmsFragment['published'], 'version' | 'published_at'>;
};

export const CMS_FRAGMENTS_TABLE = gql`
  query CmsFragmentsTable($siteId: ID!, $query: TableQueryInput) {
    cmsFragmentsTable(site_id: $siteId, query: $query) {
      total
      rows { ...CmsFragmentRow }
    }
  }
  ${CMS_FRAGMENT_ROW}
`;

/** Every fragment of a site with its published markup — the editor's blocks
 * and the header/footer pickers both read this one list. */
export const CMS_FRAGMENT_OPTIONS = gql`
  query CmsFragmentOptions($siteId: ID!) {
    cmsFragments(site_id: $siteId) {
      ...CmsFragmentRow
      published { html css }
    }
  }
  ${CMS_FRAGMENT_ROW}
`;

export interface CmsFragmentOptionsData {
  cmsFragments: (CmsFragmentRow & { published: CmsFragmentRow['published'] & Pick<CmsFragment['published'], 'html' | 'css'> })[];
}

export const CMS_FRAGMENT_DRAFT = gql`
  query CmsFragmentDraft($id: ID!) {
    cmsFragment(fragment_id: $id) {
      ...CmsFragmentRow
      draft { project html css }
    }
  }
  ${CMS_FRAGMENT_ROW}
`;

export interface CmsFragmentDraftData {
  cmsFragment: (CmsFragmentRow & { draft: CmsFragment['draft'] }) | null;
}

export const CREATE_CMS_FRAGMENT = gql`
  mutation CreateCmsFragment($siteId: ID!, $input: CmsFragmentInput!) {
    createCmsFragment(site_id: $siteId, input: $input) { ...CmsFragmentRow }
  }
  ${CMS_FRAGMENT_ROW}
`;

export const UPDATE_CMS_FRAGMENT = gql`
  mutation UpdateCmsFragment($id: ID!, $input: CmsFragmentInput!) {
    updateCmsFragment(fragment_id: $id, input: $input) { ...CmsFragmentRow }
  }
  ${CMS_FRAGMENT_ROW}
`;

export const SAVE_CMS_FRAGMENT_DRAFT = gql`
  mutation SaveCmsFragmentDraft($id: ID!, $input: CmsDraftInput!) {
    saveCmsFragmentDraft(fragment_id: $id, input: $input) { id has_unpublished_changes updated_at }
  }
`;

export const PUBLISH_CMS_FRAGMENT = gql`
  mutation PublishCmsFragment($id: ID!) {
    publishCmsFragment(fragment_id: $id) { id is_published has_unpublished_changes published { version published_at } updated_at }
  }
`;

export const DELETE_CMS_FRAGMENT = gql`
  mutation DeleteCmsFragment($id: ID!) {
    deleteCmsFragment(fragment_id: $id)
  }
`;

export const CMS_VERSIONS = gql`
  query CmsVersions($owner: CmsVersionOwner!, $id: ID!) {
    cmsVersions(owner_kind: $owner, owner_id: $id) { id version published_by created_at preview_url }
  }
`;

export interface CmsVersionsData {
  cmsVersions: Pick<CmsVersion, 'id' | 'version' | 'published_by' | 'created_at' | 'preview_url'>[];
}

/** Makes one saved version live: it becomes the draft and is published. */
export const PUBLISH_CMS_VERSION = gql`
  mutation PublishCmsVersion($id: ID!) {
    publishCmsVersion(version_id: $id)
  }
`;

export const RESTORE_CMS_VERSION = gql`
  mutation RestoreCmsVersion($id: ID!) {
    restoreCmsVersion(version_id: $id)
  }
`;
