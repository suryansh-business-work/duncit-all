import { gql } from '@apollo/client';

export const INVENTORY_PRODUCT_DETAIL = gql`
  query InventoryProductDetail($id: ID!) {
    inventoryProduct(product_doc_id: $id) {
      id
      product_name
      sku
      barcode
      short_description
      description
      category_id
      brand_name
      product_type
      unit_type
      image_url
      images
      min_order_qty
      max_order_qty
      low_stock_alert
      inventory_count
      reserved_count
      damaged_count
      requested_count
      available_count
      vendor_name
      supplier_contact
      unit_cost
      purchase_price
      selling_price
      tax_percent
      discount_percent
      weight_volume
      expiry_date
      manufacturing_date
      batch_number
      storage_instructions
      status
      visibility
      tags
      pod_available
      host_request_allowed
      delivery_available
      delivery_charge
      is_active
      last_updated_by_id
      last_updated_by_name
      created_at
      updated_at
    }
  }
`;

export const INVENTORY_CATEGORIES = gql`
  query InventoryCategories {
    categories {
      id
      name
      level
    }
  }
`;

export const INVENTORY_ACTIVITY_LOGS = gql`
  query InventoryActivityLogs($id: ID!) {
    inventoryActivityLogs(product_doc_id: $id, limit: 100) {
      id
      user_id
      user_name
      action
      changed_fields
      notes
      created_at
    }
  }
`;

export const INVENTORY_STOCK_MOVEMENTS = gql`
  query InventoryStockMovements($id: ID!) {
    inventoryStockMovements(product_doc_id: $id, limit: 100) {
      id
      user_name
      type
      quantity
      reason
      balance_after
      created_at
    }
  }
`;

export const INVENTORY_ANALYTICS = gql`
  query InventoryAnalytics($id: ID!) {
    inventoryAnalytics(product_doc_id: $id, days: 30) {
      date
      in_qty
      out_qty
      net_qty
    }
  }
`;

export const GENERATE_INVENTORY_SKU = gql`
  mutation GenerateInventorySku {
    generateInventorySku
  }
`;

export const RECORD_STOCK_MOVEMENT = gql`
  mutation RecordInventoryStockMovement($id: ID!, $input: StockMovementInput!) {
    recordInventoryStockMovement(product_doc_id: $id, input: $input) {
      id
      inventory_count
      reserved_count
      damaged_count
    }
  }
`;

export const ARCHIVE_INVENTORY_PRODUCT = gql`
  mutation ArchiveInventoryProduct($id: ID!) {
    archiveInventoryProduct(product_doc_id: $id) {
      id
      status
      is_active
    }
  }
`;

export const RESTORE_INVENTORY_PRODUCT = gql`
  mutation RestoreInventoryProduct($id: ID!) {
    restoreInventoryProduct(product_doc_id: $id) {
      id
      status
      is_active
    }
  }
`;

export const DUPLICATE_INVENTORY_PRODUCT = gql`
  mutation DuplicateInventoryProduct($id: ID!) {
    duplicateInventoryProduct(product_doc_id: $id) {
      id
    }
  }
`;

export const INVENTORY_LINKED_PODS = gql`
  query InventoryLinkedPods($id: ID!) {
    inventoryProductLinkedPods(product_doc_id: $id) {
      id
      pod_id
      pod_title
      is_active
    }
  }
`;

export const PERMANENT_DELETE_INVENTORY_PRODUCT = gql`
  mutation PermanentlyDeleteInventoryProduct($id: ID!) {
    permanentlyDeleteInventoryProduct(product_doc_id: $id)
  }
`;

export const AI_DESCRIBE_PRODUCT = gql`
  mutation AiDescribeInventoryProduct($input: AiProductDescribeInput!) {
    aiDescribeInventoryProduct(input: $input)
  }
`;
