import { gql } from '@apollo/client';
import type {
  CatalogDeletionImpact,
  CatalogDeletionKind,
  CatalogDeletionOrder,
  CatalogDeletionProduct,
  CatalogDeletionRequest,
  CatalogDeletionWindow,
} from '@duncit/gql-types';

/** The warning shown before deleting a live item: running orders, open returns, the date window. */
export const CATALOG_DELETION_PREVIEW = gql`
  query PartnerCatalogDeletionPreview($kind: CatalogDeletionKind!, $target_id: ID!) {
    catalogDeletionPreview(kind: $kind, target_id: $target_id) {
      kind
      brand_name
      product_name
      window {
        earliest
        latest
      }
      impact {
        open_orders
        open_returns
        orders {
          id
          order_no
          fulfilment_status
          created_at
          units
        }
        products {
          id
          product_name
          is_active
        }
      }
    }
  }
`;

const REQUEST_FIELDS = `
  id
  kind
  brand_id
  product_id
  parent_id
  status
  scheduled_for
  blocked_reason
`;

/** The partner's deletion requests — what their brand and product rows show. */
export const MY_CATALOG_DELETION_REQUESTS = gql`
  query PartnerMyCatalogDeletionRequests($brand_id: ID) {
    myCatalogDeletionRequests(brand_id: $brand_id) { ${REQUEST_FIELDS} }
  }
`;

export const REQUEST_CATALOG_DELETION = gql`
  mutation PartnerRequestCatalogDeletion($input: RequestCatalogDeletionInput!) {
    requestCatalogDeletion(input: $input) { ${REQUEST_FIELDS} }
  }
`;

export const WITHDRAW_CATALOG_DELETION = gql`
  mutation PartnerWithdrawCatalogDeletion($id: ID!) {
    withdrawCatalogDeletion(id: $id) { ${REQUEST_FIELDS} }
  }
`;

export type DeletionOrder = Pick<CatalogDeletionOrder, 'id' | 'order_no' | 'fulfilment_status' | 'created_at' | 'units'>;
export type DeletionProduct = Pick<CatalogDeletionProduct, 'id' | 'product_name' | 'is_active'>;

export interface DeletionPreview {
  kind: CatalogDeletionKind;
  brand_name: string;
  product_name: string;
  window: Pick<CatalogDeletionWindow, 'earliest' | 'latest'>;
  impact: Pick<CatalogDeletionImpact, 'open_orders' | 'open_returns'> & {
    orders: DeletionOrder[];
    products: DeletionProduct[];
  };
}

export type DeletionRequestRow = Pick<
  CatalogDeletionRequest,
  'id' | 'kind' | 'brand_id' | 'product_id' | 'parent_id' | 'status' | 'scheduled_for' | 'blocked_reason'
>;
