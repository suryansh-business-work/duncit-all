import { gql } from '@apollo/client';
import type { CrmLeadMedia as GqlLeadMedia, CrmLeadMediaKind } from '@duncit/gql-types';
import type { CrmLeadEntityType } from './crm.types';

/** Lead Details › Logos & Images — any of the five CRM lead kinds. */

/** Any of the five lead kinds — the shared `CrmEntityType`. */
export type CrmLeadMediaEntity = CrmLeadEntityType;
export type { CrmLeadMediaKind } from '@duncit/gql-types';

/** The fields FIELDS selects. */
export type CrmLeadMedia = Pick<
  GqlLeadMedia,
  'id' | 'kind' | 'url' | 'name' | 'mime_type' | 'size_bytes' | 'width' | 'height' | 'sort_order' | 'created_at'
>;

export interface CrmLeadMediaInput {
  kind: CrmLeadMediaKind;
  url: string;
  name: string;
  mime_type: string;
  size_bytes: number;
  width: number | null;
  height: number | null;
}

const FIELDS = 'id kind url name mime_type size_bytes width height sort_order created_at';

export const CRM_LEAD_MEDIA = gql`
  query CrmLeadMedia($entity_type: CrmEntityType!, $lead_id: ID!) {
    crmLeadMedia(entity_type: $entity_type, lead_id: $lead_id) { ${FIELDS} }
  }
`;

export const ADD_CRM_LEAD_MEDIA = gql`
  mutation AddCrmLeadMedia($entity_type: CrmEntityType!, $lead_id: ID!, $items: [CrmLeadMediaInput!]!) {
    addCrmLeadMedia(entity_type: $entity_type, lead_id: $lead_id, items: $items) { ${FIELDS} }
  }
`;

export const UPDATE_CRM_LEAD_MEDIA = gql`
  mutation UpdateCrmLeadMedia($id: ID!, $input: CrmLeadMediaUpdateInput!) {
    updateCrmLeadMedia(id: $id, input: $input) { ${FIELDS} }
  }
`;

export const DELETE_CRM_LEAD_MEDIA = gql`
  mutation DeleteCrmLeadMedia($id: ID!) {
    deleteCrmLeadMedia(id: $id)
  }
`;
