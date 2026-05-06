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

  type Slider {
    id: ID!
    slider_id: String!
    title: String!
    description: String
    media_url: String!
    media_type: SliderMediaType!
    link_url: String
    scope: SliderScope!
    location_id: ID
    zone_name: String
    sort_order: Int!
    starts_at: String
    ends_at: String
    is_active: Boolean!
    created_at: String!
    updated_at: String!
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
    slider(slider_doc_id: ID!): Slider
  }

  extend type Mutation {
    createSlider(input: CreateSliderInput!): Slider!
    updateSlider(slider_doc_id: ID!, input: UpdateSliderInput!): Slider!
    deleteSlider(slider_doc_id: ID!): Boolean!
  }
`;
