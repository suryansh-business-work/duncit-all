export const slotTemplateTypeDefs = /* GraphQL */ `
  type SlotTemplatePerDayPrice {
    weekday: Int!
    price: Int!
  }

  type SlotTemplateConfig {
    weekdays: [Int!]!
    start_time: String!
    end_time: String!
    default_price: Int!
    per_day_price: [SlotTemplatePerDayPrice!]!
    skip_weekly_off: Boolean!
    skip_holidays: Boolean!
  }

  type SlotTemplate {
    id: ID!
    venue_id: ID
    name: String!
    description: String!
    category: String!
    visibility: String!
    is_default: Boolean!
    config: SlotTemplateConfig!
    created_at: String!
    updated_at: String!
  }

  input SlotTemplatePerDayPriceInput {
    weekday: Int!
    price: Int!
  }

  input SlotTemplateConfigInput {
    weekdays: [Int!]!
    start_time: String!
    end_time: String!
    default_price: Int
    per_day_price: [SlotTemplatePerDayPriceInput!]
    skip_weekly_off: Boolean
    skip_holidays: Boolean
  }

  input CreateSlotTemplateInput {
    venue_id: ID
    name: String!
    description: String
    category: String
    visibility: String
    is_default: Boolean
    config: SlotTemplateConfigInput!
  }

  extend type Query {
    "The signed-in owner's saved recurring-slot templates (optionally scoped to a venue)."
    mySlotTemplates(venue_id: ID): [SlotTemplate!]!
  }

  extend type Mutation {
    createSlotTemplate(input: CreateSlotTemplateInput!): SlotTemplate!
    deleteSlotTemplate(id: ID!): Boolean!
    setDefaultSlotTemplate(id: ID!): SlotTemplate!
  }
`;
