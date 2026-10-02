import { gql } from '@apollo/client';

/** Pods that stock a catalogue product — the per-pod cart context so a buyer can
 * add the product from this pod-less standalone page (products stay separate). */
export const PODS_FOR_PRODUCT = gql`
  query PodsForProduct($id: ID!) {
    podsForProduct(product_doc_id: $id) {
      pod_id
      pod_title
      club_slug
      product_name
      unit_cost
      available_count
      free_delivery_above
      image_url
    }
  }
`;
