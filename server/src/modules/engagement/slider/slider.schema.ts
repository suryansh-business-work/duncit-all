export const sliderTypeDefs = /* GraphQL */ `
  enum SliderScope {
    GLOBAL
    LOCATION
    ZONE
  }

  enum SliderMediaType {
    IMAGE
    VIDEO
  }

  enum SliderLinkType {
    INTERNAL
    EXTERNAL
  }

  enum SliderLinkTargetKind {
    POD
    CLUB
  }

  type Slider {
    id: ID!
    slider_id: String!
    title: String!
    description: String
    media_url: String!
    media_type: SliderMediaType!
    link_type: SliderLinkType!
    link_target_kind: SliderLinkTargetKind
    link_target_id: ID
    link_target_slug: String
    link_target_title: String
    link_target_parent_slug: String
    link_url: String
    effective_link_url: String!
    scope: SliderScope!
    super_category_slug: String
    location_id: ID
    zone_name: String
    sort_order: Int!
    starts_at: String
    ends_at: String
    is_active: Boolean!
    created_at: String!
    updated_at: String!
  }

  "Server-side table page for the shared table engine (slidersTable)."
  type SliderTablePage {
    rows: [Slider!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  input SliderFilterInput {
    scope: SliderScope
    super_category_slug: String
    location_id: ID
    zone_name: String
    is_active: Boolean
    search: String
  }

  input CreateSliderInput {
    slider_id: String
    title: String!
    description: String
    media_url: String!
    media_type: SliderMediaType
    link_type: SliderLinkType
    link_target_kind: SliderLinkTargetKind
    link_target_id: ID
    link_url: String
    scope: SliderScope!
    super_category_slug: String
    location_id: ID
    zone_name: String
    sort_order: Int
    starts_at: String
    ends_at: String
    is_active: Boolean
  }

  input UpdateSliderInput {
    title: String
    description: String
    media_url: String
    media_type: SliderMediaType
    link_type: SliderLinkType
    link_target_kind: SliderLinkTargetKind
    link_target_id: ID
    link_url: String
    scope: SliderScope
    super_category_slug: String
    location_id: ID
    zone_name: String
    sort_order: Int
    starts_at: String
    ends_at: String
    is_active: Boolean
  }

  extend type Query {
    sliders(filter: SliderFilterInput): [Slider!]!
    slidersTable(query: TableQueryInput): SliderTablePage!
    slider(slider_doc_id: ID!): Slider
  }

  extend type Mutation {
    createSlider(input: CreateSliderInput!): Slider!
    updateSlider(slider_doc_id: ID!, input: UpdateSliderInput!): Slider!
    deleteSlider(slider_doc_id: ID!): Boolean!
  }
`;
