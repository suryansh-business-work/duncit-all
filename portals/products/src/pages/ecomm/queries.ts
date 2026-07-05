import { gql } from '@apollo/client';

export const MARKETPLACE_BRANDS = gql`
  query MarketplaceBrands($status: EcommBrandStatus) {
    marketplaceBrands(status: $status) {
      id
      brand_name
      logo_url
      status
      approved_product_count
      default_pickup_location_id
      city
      state
      contact_email
      contact_phone
    }
  }
`;

export const MARKETPLACE_BRAND_PRODUCTS = gql`
  query MarketplaceBrandProducts($brand_doc_id: ID!) {
    marketplaceBrandProducts(brand_doc_id: $brand_doc_id) {
      id
      product_name
      sku
      image_url
      unit_cost
      selling_price
      inventory_count
      available_count
      status
      commission_pct
      height_cm
      length_cm
      breadth_cm
      weight_kg
    }
  }
`;

export const BRAND_PICKUP_LOCATIONS = gql`
  query BrandPickupLocations($owner_kind: PickupOwnerKind, $brand_doc_id: ID) {
    brandPickupLocations(owner_kind: $owner_kind, brand_doc_id: $brand_doc_id) {
      id
      owner_kind
      brand_id
      nickname
      contact_name
      phone
      email
      address_line1
      address_line2
      city
      state
      pincode
      country
      is_default
      shiprocket_registered
      shiprocket_pickup_id
    }
  }
`;

export const SAVE_BRAND_PICKUP_LOCATION = gql`
  mutation SaveBrandPickupLocation($id: ID, $input: BrandPickupLocationInput!) {
    saveBrandPickupLocation(id: $id, input: $input) {
      id
    }
  }
`;

export const DELETE_BRAND_PICKUP_LOCATION = gql`
  mutation DeleteBrandPickupLocation($id: ID!) {
    deleteBrandPickupLocation(id: $id)
  }
`;

export const SET_DEFAULT_BRAND_PICKUP_LOCATION = gql`
  mutation SetDefaultBrandPickupLocation($id: ID!) {
    setDefaultBrandPickupLocation(id: $id) {
      id
      is_default
    }
  }
`;

export const REGISTER_BRAND_PICKUP_WITH_SHIPROCKET = gql`
  mutation RegisterBrandPickupWithShiprocket($id: ID!) {
    registerBrandPickupWithShiprocket(id: $id) {
      id
      shiprocket_registered
      shiprocket_pickup_id
    }
  }
`;
