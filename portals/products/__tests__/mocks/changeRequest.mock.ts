import type { MockedResponse } from '@apollo/client/testing';
import type { ApprovalDetail, ApprovalRequest, EcommBrand, InventoryProduct } from '@duncit/gql-types';
import {
  MY_ECOMM_CHANGE_REQUESTS,
  REQUEST_BRANDS,
  REQUEST_PRODUCTS,
  SUBMIT_ECOMM_CHANGE,
} from '../../src/pages/ecomm/ecomm-requests/queries';

/**
 * Mocks for the "edit-as-request" flow (Brand/Product change requests).
 *
 * The `myEcommChangeRequests` query resolves to `ApprovalRequest`, but the
 * portal renders `status` as a plain string and deliberately tolerates values
 * outside the `ApprovalStatus` enum (unknown → default chip colour). The mock
 * therefore projects the queried `ApprovalRequest` fields and widens `status`
 * to `string`, keeping every other field bound to the generated schema so drift
 * still surfaces at typecheck time. `__typename` on every object satisfies the
 * MockedProvider cache (no `addTypename={false}` needed).
 */
export type ChangeRequestDetailMock = Pick<ApprovalDetail, 'label' | 'value'> & {
  __typename?: 'ApprovalDetail';
};
export type ChangeRequestMock = Pick<
  ApprovalRequest,
  'id' | 'title' | 'summary' | 'created_at' | 'review_notes'
> & {
  __typename?: 'ApprovalRequest';
  status: string;
  details: ChangeRequestDetailMock[];
};

export const makeChangeRequestDetail = (
  over: Partial<ChangeRequestDetailMock> = {},
): ChangeRequestDetailMock => ({
  __typename: 'ApprovalDetail',
  label: 'Brand name',
  value: 'Acme 2',
  ...over,
});

export const makeChangeRequest = (over: Partial<ChangeRequestMock> = {}): ChangeRequestMock => ({
  __typename: 'ApprovalRequest',
  id: 'c1',
  title: 'Rename brand',
  status: 'PENDING',
  summary: null,
  created_at: null,
  review_notes: null,
  details: [],
  ...over,
});

/** The brands a requester may propose edits to (`RequestableBrands`). */
export type RequestableBrandMock = Pick<
  EcommBrand,
  'id' | 'brand_name' | 'tagline' | 'description' | 'website_url'
> & { __typename?: 'EcommBrand' };

export const makeRequestableBrand = (
  over: Partial<RequestableBrandMock> = {},
): RequestableBrandMock => ({
  __typename: 'EcommBrand',
  id: 'b1',
  brand_name: 'Acme',
  tagline: 'Old',
  description: '',
  website_url: '',
  ...over,
});

/** The products a requester may propose edits to (`RequestableProducts`). */
export type RequestableProductMock = Pick<
  InventoryProduct,
  'id' | 'product_name' | 'short_description' | 'description' | 'selling_price'
> & { __typename?: 'InventoryProduct' };

export const makeRequestableProduct = (
  over: Partial<RequestableProductMock> = {},
): RequestableProductMock => ({
  __typename: 'InventoryProduct',
  id: 'p1',
  product_name: 'Mug',
  short_description: 'Nice',
  description: '',
  selling_price: 100,
  ...over,
});

export const requestBrandsMock = (
  brands: RequestableBrandMock[] = [makeRequestableBrand()],
): MockedResponse => ({
  request: { query: REQUEST_BRANDS },
  result: { data: { marketplaceBrands: brands } },
  maxUsageCount: 10,
});

export const requestProductsMock = (
  products: RequestableProductMock[] = [makeRequestableProduct()],
): MockedResponse => ({
  request: { query: REQUEST_PRODUCTS },
  result: { data: { inventoryProducts: products } },
  maxUsageCount: 10,
});

export const myEcommChangeRequestsMock = (
  kind: 'BRAND' | 'PRODUCT',
  requests: ChangeRequestMock[] = [],
): MockedResponse => ({
  request: { query: MY_ECOMM_CHANGE_REQUESTS, variables: { kind } },
  result: { data: { myEcommChangeRequests: requests } },
  maxUsageCount: 10,
});

export const submitEcommChangeMock = (over: { fail?: boolean } = {}): MockedResponse => ({
  request: { query: SUBMIT_ECOMM_CHANGE },
  variableMatcher: () => true,
  result: over.fail
    ? { errors: [{ message: 'submit failed' }] }
    : {
        data: {
          submitEcommChangeRequest: { __typename: 'ApprovalRequest', id: 'cr1', status: 'PENDING' },
        },
      },
  maxUsageCount: 10,
});
