export const appPopupTypeDefs = /* GraphQL */ `
  "Which builds a popup is aimed at. BOTH reaches every client."
  enum AppPopupPlatform {
    IOS
    ANDROID
    BOTH
  }

  """
  What a client reports about itself when it asks for a popup. WEB is mWeb in a
  desktop browser; on a phone browser mWeb reports the underlying IOS/ANDROID,
  so platform targeting means the same thing on both surfaces.
  """
  enum AppPopupClientPlatform {
    IOS
    ANDROID
    WEB
  }

  "Everyone, or the people currently matching a saved marketing audience list."
  enum AppPopupAudience {
    ALL_USERS
    AUDIENCE_LIST
  }

  type AppPopup {
    id: ID!
    "Internal label for the marketing table — never rendered in the app."
    name: String!
    image_url: String!
    start_at: String!
    end_at: String!
    enabled: Boolean!
    platform: AppPopupPlatform!
    "Whether the ✕ is drawn. Tapping outside the image always closes it."
    close_button_enabled: Boolean!
    cta_label: String!
    cta_url: String!
    audience_type: AppPopupAudience!
    "Set only for AUDIENCE_LIST — membership is recomputed on every app open."
    audience_list_id: ID
    created_at: String!
    updated_at: String!
  }

  "Server-side table page for the shared table engine (appPopupsTable)."
  type AppPopupTablePage {
    rows: [AppPopup!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  input AppPopupInput {
    name: String!
    image_url: String!
    start_at: String!
    end_at: String!
    enabled: Boolean
    platform: AppPopupPlatform
    close_button_enabled: Boolean
    cta_label: String
    cta_url: String
    audience_type: AppPopupAudience
    "Required when audience_type is AUDIENCE_LIST."
    audience_list_id: ID
  }

  extend type Query {
    appPopupsTable(query: TableQueryInput): AppPopupTablePage!
    """
    The one popup this signed-in user should see right now, or null. Enabled,
    inside its date window, matching the caller's platform and audience, and
    not already dismissed by this user.
    """
    activeAppPopup(platform: AppPopupClientPlatform!): AppPopup
  }

  extend type Mutation {
    createAppPopup(input: AppPopupInput!): AppPopup!
    updateAppPopup(id: ID!, input: AppPopupInput!): AppPopup!
    deleteAppPopup(id: ID!): Boolean!
    "Record that the signed-in user closed this popup, so it never returns."
    dismissAppPopup(id: ID!): Boolean!
  }
`;
