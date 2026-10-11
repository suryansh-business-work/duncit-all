export const brandPickupLocationTypeDefs = /* GraphQL */ `
  enum PickupOwnerKind {
    DUNCIT
    BRAND
  }

  type BrandPickupLocation {
    id: ID!
    owner_kind: PickupOwnerKind!
    brand_id: ID
    "Partner-warehouse approval gate: PENDING | APPROVED | REJECTED (Duncit-owned + legacy are APPROVED)."
    review_status: String!
    nickname: String!
    contact_name: String!
    phone: String!
    email: String!
    address_line1: String!
    address_line2: String!
    city: String!
    state: String!
    pincode: String!
    country: String!
    is_default: Boolean!
    "Enabled for use. A disabled pickup address cannot be chosen for a product or made primary."
    is_active: Boolean!
    shiprocket_registered: Boolean!
    "Why the last registration attempt did not land ('' once registered)."
    shiprocket_error: String!
    shiprocket_pickup_id: String!
    created_at: String!
    updated_at: String!
  }

  input BrandPickupLocationInput {
    owner_kind: PickupOwnerKind!
    brand_id: ID
    nickname: String!
    contact_name: String
    phone: String
    email: String
    address_line1: String
    address_line2: String
    city: String
    state: String
    pincode: String
    country: String
    is_default: Boolean
  }

  "A product that ships from a pickup address — what has to be moved before the address can be disabled or deleted."
  type PickupProductRef {
    id: ID!
    name: String!
    "The product's own status (ACTIVE, PAUSED, ARCHIVED…)."
    status: String!
    "PET_STORE for a pet-store product, POD_SHOP for a pod-shop one."
    channel: String!
  }

  "Everything that still ships from one pickup address."
  type BrandPickupUsage {
    "How many products ship from it, across both shops."
    count: Int!
    "Those products, by name (the first 100)."
    products: [PickupProductRef!]!
  }

  "A brand's pickup addresses after a check against the ShipRocket account it ships on."
  type BrandPickupSync {
    warehouses: [BrandPickupLocation!]!
    "Why ShipRocket could not be read ('' when it was) — the warehouses are still listed."
    shiprocket_error: String!
    "Pickup addresses taken in from the brand's own ShipRocket account on this sync."
    adopted: Int!
    synced_at: String!
  }

  extend type Query {
    "Pickup addresses of a Duncit or brand owner (Products portal)."
    brandPickupLocations(owner_kind: PickupOwnerKind, brand_doc_id: ID): [BrandPickupLocation!]!
    "Pickup addresses of one of the caller's OWN brands (partner portal Brand Settings)."
    myBrandPickupLocations(brand_doc_id: ID!): [BrandPickupLocation!]!
    "Products portal: the products that ship from a pickup address."
    brandPickupLocationUsage(id: ID!): BrandPickupUsage!
    "Partner: the products of an own-brand pickup address — shown before it is disabled or deleted."
    myBrandPickupLocationUsage(brand_doc_id: ID!, id: ID!): BrandPickupUsage!
  }

  extend type Mutation {
    saveBrandPickupLocation(id: ID, input: BrandPickupLocationInput!): BrandPickupLocation!
    deleteBrandPickupLocation(id: ID!): Boolean!
    setDefaultBrandPickupLocation(id: ID!): BrandPickupLocation!
    "Register the location with ShipRocket so SHIP orders can pick up from it."
    registerBrandPickupWithShiprocket(id: ID!): BrandPickupLocation!
    "Products portal: enable or disable a pickup address. Disabling is refused while products ship from it or while it is the primary one."
    setBrandPickupLocationActive(id: ID!, active: Boolean!): BrandPickupLocation!
    "Check an own brand's pickup addresses against its ShipRocket account; on its own account, take in pickups it has there."
    syncMyBrandPickupLocations(brand_doc_id: ID!): BrandPickupSync!
    "Create/update a pickup address on one of the caller's OWN brands (owner_kind/brand_id are forced server-side)."
    saveMyBrandPickupLocation(brand_doc_id: ID!, id: ID, input: BrandPickupLocationInput!): BrandPickupLocation!
    "Delete an own-brand pickup address. Blocked while any product still ships from it — see myBrandPickupLocationUsage."
    deleteMyBrandPickupLocation(brand_doc_id: ID!, id: ID!): Boolean!
    setDefaultMyBrandPickupLocation(brand_doc_id: ID!, id: ID!): BrandPickupLocation!
    "Partner: enable or disable an own-brand pickup address. Disabling is refused while products ship from it or while it is the primary one."
    setMyBrandPickupLocationActive(brand_doc_id: ID!, id: ID!, active: Boolean!): BrandPickupLocation!
  }
`;
