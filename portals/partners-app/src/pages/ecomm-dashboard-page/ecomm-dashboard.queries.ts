import { gql } from '@apollo/client';

/** Owner-scoped e-commerce KPIs for the partner E-Commerce Dashboard. */
export const PARTNER_ECOMM_STATS = gql`
  query PartnerEcommStats($brand_doc_id: ID) {
    partnerEcommStats(brand_doc_id: $brand_doc_id) {
      total_brands
      approved_brands
      total_products
      approved_products
      total_warehouses
      total_orders
      total_items_sold
      gross_revenue
    }
  }
`;

export interface PartnerEcommStats {
  total_brands: number;
  approved_brands: number;
  total_products: number;
  approved_products: number;
  total_warehouses: number;
  total_orders: number;
  total_items_sold: number;
  gross_revenue: number;
}
