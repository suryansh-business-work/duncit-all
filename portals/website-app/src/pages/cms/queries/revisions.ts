import { gql } from '@apollo/client';
import type { CmsSiteRevision } from '@duncit/gql-types';

export const CMS_SITE_REVISIONS = gql`
  query CmsSiteRevisions($siteId: ID!, $section: CmsSiteSection) {
    cmsSiteRevisions(site_id: $siteId, section: $section) {
      id
      revision
      section
      restored_from
      created_at
    }
  }
`;

export interface CmsSiteRevisionsData {
  cmsSiteRevisions: Pick<CmsSiteRevision, 'id' | 'revision' | 'section' | 'restored_from' | 'created_at'>[];
}

/** Brings the open tabs back in line with the restored state. */
export const RESTORE_CMS_SITE_REVISION = gql`
  mutation RestoreCmsSiteRevision($id: ID!) {
    restoreCmsSiteRevision(revision_id: $id) {
      id
      updated_at
    }
  }
`;

/** The queries a restore can change: the workspace header and the Design / Code tabs. */
export const REFETCH_AFTER_RESTORE = ['CmsSite', 'CmsSiteDesign', 'CmsSiteRevisions'];
