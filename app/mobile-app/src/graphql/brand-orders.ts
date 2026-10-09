import { gql } from '@/generated/graphql';

/**
 * Brand Studio → Brand Orders: the Pod Shop orders of the signed-in partner's
 * own brands. The server scopes every operation to those brands. RN twin of
 * mWeb's pages/brand-orders-page/queries.
 */

export const BrandOrdersTableDocument = gql(`
  query MobileBrandProductOrdersTable($query: TableQueryInput) {
    brandProductOrdersTable(query: $query) {
      total
      page
      page_size
      rows {
        id
        order_no
        buyer_name
        fulfilment_method
        fulfilment_status
        currency_symbol
        total
        created_at
        line_items {
          qty
        }
        shiprocket {
          awb
        }
      }
    }
  }
`);

/** Everything the order screen and its actions read — each mutation answers
 * with the same selection, so the screen swaps the order in. */
export const BrandOrderDetailFragment = gql(`
  fragment MobileBrandOrderDetail on ProductOrder {
    id
    order_no
    buyer_name
    fulfilment_method
    fulfilment_status
    currency_symbol
    total
    created_at
    cancelled_at
    last_error
    line_items {
      product_id
      variant_id
      variant_label
      name
      image_url
      qty
      gross
    }
    shipping_address {
      name
      phone
      email
      line1
      line2
      landmark
      city
      state
      pincode
      country
    }
    shiprocket {
      order_id
      shipment_id
      awb
      courier_name
      tracking_status
      etd
      pickup_scheduled_date
      label_url
      invoice_url
      manifest_url
    }
  }
`);

/** One order of the partner's brands. */
export const BrandOrderDocument = gql(`
  query MobileBrandProductOrder($id: ID!) {
    brandProductOrder(id: $id) {
      ...MobileBrandOrderDetail
    }
  }
`);

export const BrandBookShipmentDocument = gql(`
  mutation MobileBrandBookProductOrderShipment($id: ID!) {
    brandBookProductOrderShipment(id: $id) {
      ...MobileBrandOrderDetail
    }
  }
`);

export const BrandRefreshTrackingDocument = gql(`
  mutation MobileBrandRefreshProductOrderTracking($id: ID!) {
    brandRefreshProductOrderTracking(id: $id) {
      ...MobileBrandOrderDetail
    }
  }
`);

export const BrandUpdateAddressDocument = gql(`
  mutation MobileBrandUpdateProductOrderAddress($id: ID!, $address: OrderShippingAddressInput!) {
    brandUpdateProductOrderAddress(id: $id, address: $address) {
      ...MobileBrandOrderDetail
    }
  }
`);

export const BrandShipmentFileDocument = gql(`
  mutation MobileBrandProductOrderShipmentFile($ids: [ID!]!, $kind: ShipmentDocumentKind!) {
    brandProductOrderShipmentFile(ids: $ids, kind: $kind) {
      filename
      mime
      content_base64
    }
  }
`);
