import { gql } from '@apollo/client';
import type { CmsSiteDns } from '@duncit/gql-types';

export const CMS_SITE_DNS = gql`
  query CmsSiteDns($siteId: ID!) {
    cmsSiteDns(site_id: $siteId) {
      configured
      zone
      hosts {
        host
        name
        in_zone
        records { id type data ttl }
      }
    }
  }
`;

export interface CmsSiteDnsData {
  cmsSiteDns: CmsSiteDns;
}

export const SET_CMS_SITE_A_RECORD = gql`
  mutation SetCmsSiteARecord($siteId: ID!, $input: CmsSiteARecordInput!) {
    setCmsSiteARecord(site_id: $siteId, input: $input)
  }
`;
