import { gql, type TypedDocumentNode } from '@apollo/client';
import type { PackageType } from '@duncit/utils';

/** A product's (or one variant's) packaging, as the CSV export carries it. */
export interface PackagingRow {
  product_id: string;
  variant_id: string;
  sku: string;
  product_name: string;
  variant_label: string;
  weight_kg: number;
  length_cm: number;
  breadth_cm: number;
  height_cm: number;
  package_type: PackageType;
  hsn_code: string;
  is_fragile: boolean;
  is_liquid: boolean;
  shelf_life_days: number | null;
  volumetric_weight_kg: number;
  chargeable_weight_kg: number;
  missing: string[];
}

export const STORE_PACKAGING_EXPORT: TypedDocumentNode<{ storePackagingExport: PackagingRow[] }, { product_ids?: string[] | null }> = gql`
  query StorePackagingExport($product_ids: [ID!]) {
    storePackagingExport(product_ids: $product_ids) {
      product_id
      variant_id
      sku
      product_name
      variant_label
      weight_kg
      length_cm
      breadth_cm
      height_cm
      package_type
      hsn_code
      is_fragile
      is_liquid
      shelf_life_days
      volumetric_weight_kg
      chargeable_weight_kg
      missing
    }
  }
`;

/** Values to set; a value left out keeps the saved one. */
export interface PackagingInput {
  weight_kg?: number;
  length_cm?: number;
  breadth_cm?: number;
  height_cm?: number;
  package_type?: PackageType;
  hsn_code?: string;
  is_fragile?: boolean;
  is_liquid?: boolean;
  shelf_life_days?: number;
}

export const BULK_SET_PACKAGING: TypedDocumentNode<
  { storeBulkSetPackaging: number },
  { product_ids: string[]; input: PackagingInput }
> = gql`
  mutation StoreBulkSetPackaging($product_ids: [ID!]!, $input: StorePackagingInput!) {
    storeBulkSetPackaging(product_ids: $product_ids, input: $input)
  }
`;

export interface PackagingImportResult {
  updated: number;
  errors: { row: number; sku: string; message: string }[];
}

export const IMPORT_PACKAGING: TypedDocumentNode<
  { storeImportPackaging: PackagingImportResult },
  { rows: (PackagingInput & { sku: string })[] }
> = gql`
  mutation StoreImportPackaging($rows: [StorePackagingImportRow!]!) {
    storeImportPackaging(rows: $rows) {
      updated
      errors {
        row
        sku
        message
      }
    }
  }
`;
