export const productCartTypeDefs = /* GraphQL */ `
  "Products portal > Cart > Cart Settings: the in-app cart nudge and the cart reminder email."
  type ProductCartSettings {
    "Show the bottom 'your cart is calling' nudge on mWeb and the app."
    nudge_enabled: Boolean!
    "Minutes after the app opens (and after each nudge hides) before the next nudge (1-1440)."
    nudge_delay_minutes: Int!
    "Seconds a nudge stays on screen before hiding itself (3-60)."
    nudge_auto_hide_seconds: Int!
    "Send the cart reminder email."
    email_enabled: Boolean!
    "Hours after the cart last changed before the first reminder email (1-720)."
    email_first_delay_hours: Int!
    "Hours between reminder emails for the same unchanged cart (1-720)."
    email_repeat_hours: Int!
    "Most reminder emails one unchanged cart gets (1-20)."
    email_max_count: Int!
    updated_at: String
  }

  input UpdateProductCartSettingsInput {
    nudge_enabled: Boolean
    nudge_delay_minutes: Int
    nudge_auto_hide_seconds: Int
    email_enabled: Boolean
    email_first_delay_hours: Int
    email_repeat_hours: Int
    email_max_count: Int
  }

  "One Pod Shop cart line as the device holds it — ids and quantity only."
  input ProductCartLineInput {
    pod_id: ID!
    product_id: ID!
    variant_id: String
    quantity: Int!
  }

  extend type Query {
    "Public: the apps read it to time the cart nudge."
    productCartSettings: ProductCartSettings!
  }

  extend type Mutation {
    updateProductCartSettings(input: UpdateProductCartSettingsInput!): ProductCartSettings!
    "Mirror the signed-in member's device cart so the reminder email knows what is waiting. An empty list clears it."
    syncMyProductCart(lines: [ProductCartLineInput!]!): Boolean!
  }
`;
