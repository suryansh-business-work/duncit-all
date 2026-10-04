import { gql, type TypedDocumentNode } from '@apollo/client';
import type {
  MutationDeletePartnerIntegrationArgs,
  MutationRecheckPartnerIntegrationArgs,
  MutationSavePartnerIntegrationArgs,
  MutationUseBrandIntegrationArgs,
} from '@duncit/gql-types';
import { BRAND_INTEGRATION_FIELDS, type BrandIntegrationProvider, type BrandIntegrationStatus } from '../queries';

export interface PartnerIntegration {
  id: string;
  provider: BrandIntegrationProvider;
  label: string;
  status: BrandIntegrationStatus;
  brands: { id: string; brand_name: string }[];
}

export interface MyPartnerIntegrationsData {
  myPartnerIntegrations: PartnerIntegration[];
}

export interface SavePartnerIntegrationData {
  savePartnerIntegration: PartnerIntegration;
}

/** One saved connection as the Integrations page and the wizard's picker read it. */
const PARTNER_INTEGRATION_FIELDS = `
  id
  provider
  label
  status { ${BRAND_INTEGRATION_FIELDS} }
  brands { id brand_name }
`;

export const MY_PARTNER_INTEGRATIONS: TypedDocumentNode<MyPartnerIntegrationsData, Record<string, never>> = gql`
  query MyPartnerIntegrations {
    myPartnerIntegrations { ${PARTNER_INTEGRATION_FIELDS} }
  }
`;

export const SAVE_PARTNER_INTEGRATION: TypedDocumentNode<SavePartnerIntegrationData, MutationSavePartnerIntegrationArgs> = gql`
  mutation SavePartnerIntegration($id: ID, $provider: BrandIntegrationProvider!, $input: PartnerIntegrationInput!) {
    savePartnerIntegration(id: $id, provider: $provider, input: $input) { ${PARTNER_INTEGRATION_FIELDS} }
  }
`;

export const RECHECK_PARTNER_INTEGRATION: TypedDocumentNode<
  { recheckPartnerIntegration: PartnerIntegration },
  MutationRecheckPartnerIntegrationArgs
> = gql`
  mutation RecheckPartnerIntegration($id: ID!) {
    recheckPartnerIntegration(id: $id) { ${PARTNER_INTEGRATION_FIELDS} }
  }
`;

export const DELETE_PARTNER_INTEGRATION: TypedDocumentNode<
  { deletePartnerIntegration: boolean },
  MutationDeletePartnerIntegrationArgs
> = gql`
  mutation DeletePartnerIntegration($id: ID!) {
    deletePartnerIntegration(id: $id)
  }
`;

/** Pick a saved connection for a brand — the server copies it onto the brand. */
export const USE_BRAND_INTEGRATION: TypedDocumentNode<
  { useBrandIntegration: BrandIntegrationStatus },
  MutationUseBrandIntegrationArgs
> = gql`
  mutation UseBrandIntegration($brand_doc_id: ID!, $provider: BrandIntegrationProvider!, $integration_id: ID!) {
    useBrandIntegration(brand_doc_id: $brand_doc_id, provider: $provider, integration_id: $integration_id) {
      ${BRAND_INTEGRATION_FIELDS}
    }
  }
`;
