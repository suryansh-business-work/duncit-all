export const websiteEarnTypeDefs = /* GraphQL */ `
  "A marketing site that shows the Earn with Duncit section (earnwith is the earn site itself)."
  enum EarnSite {
    MAIN
    PARTNERS
    ADS
  }

  "Where the Earn section sits on the home page."
  enum EarnPosition {
    AFTER_REELS
    AFTER_DOWNLOAD
    BEFORE_FOOTER
  }

  "WALL = the drifting photo wall; SPLIT = copy beside a photo collage."
  enum EarnVariant {
    WALL
    SPLIT
  }

  "A brand colour token the section is accented with."
  enum EarnAccent {
    PRIMARY
    SECONDARY
    TERTIARY
  }

  "One site's Earn with Duncit section and floating pill, from Website portal > Earn with Duncit. Blank copy = the localized default."
  type WebsiteEarnSection {
    site: EarnSite!
    enabled: Boolean!
    position: EarnPosition!
    variant: EarnVariant!
    accent: EarnAccent!
    eyebrow: String!
    heading: String!
    heading_muted: String!
    text: String!
    cta_label: String!
    "Blank = the earnwith site's own address."
    cta_url: String!
    "Blank = the bundled photo wall."
    images: [String!]!
    floating_enabled: Boolean!
    floating_label: String!
    "ISO time of the last save, or null while the site still runs on defaults."
    updated_at: String
  }

  input WebsiteEarnSectionInput {
    site: EarnSite!
    enabled: Boolean
    position: EarnPosition
    variant: EarnVariant
    accent: EarnAccent
    eyebrow: String
    heading: String
    heading_muted: String
    text: String
    cta_label: String
    cta_url: String
    images: [String!]
    floating_enabled: Boolean
    floating_label: String
  }

  extend type Query {
    "Public: what one site's home page draws for its Earn section and pill. Asked for at page load."
    publicWebsiteEarnSection(site: EarnSite!): WebsiteEarnSection!
    "Every site's Earn section, saved or default, for the Website portal."
    websiteEarnSections: [WebsiteEarnSection!]!
  }

  extend type Mutation {
    "Saves one site's Earn section and pill."
    saveWebsiteEarnSection(input: WebsiteEarnSectionInput!): WebsiteEarnSection!
  }
`;
