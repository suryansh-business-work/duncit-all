export const publicPageTypeDefs = /* GraphQL */ `
  "Whose public page: a venue (named by its id) or the signed-in host."
  enum PublicPageKind {
    VENUE
    HOST
  }

  "A published page's tracked duncit.com link."
  type PublicPageLink {
    "The duncit.com short link, or the plain page address when the link is retired."
    url: String!
    code: String
    "The QR that opens the link, as a PNG data URL."
    qr_data_url: String!
  }

  "A page's link and how it is doing — only ever the caller's own page."
  type PublicPageInsights {
    published: Boolean!
    "The page also shows a food menu: the poster says 'Menu & pods', and a table label opens the menu."
    offers_food: Boolean!
    link: PublicPageLink
    stats: ShortLinkStats
    funnel: ShortLinkFunnel
  }

  "The words printed on the poster, in the owner's language."
  input PublicPagePosterCopy {
    headline: String!
    footer: String!
  }

  extend type Query {
    "ref_id is the venue id for VENUE and is ignored for HOST. days 0 = all time."
    myPublicPage(kind: PublicPageKind!, ref_id: ID, days: Int): PublicPageInsights!
    "The printable A4 poster, base64-encoded for the browser or the app to save."
    myPublicPagePosterPdfBase64(
      kind: PublicPageKind!
      ref_id: ID
      copy: PublicPagePosterCopy!
    ): String!
    "A venue's printable table label — the scan panel with the venue's name under it — base64-encoded. headline is printed as given, in the owner's language."
    myVenueTableLabelPdfBase64(venue_id: ID!, headline: String!): String!
  }

  extend type Mutation {
    "Publish the page and get its tracked link. Safe to repeat: one link per page."
    publishPublicPage(kind: PublicPageKind!, ref_id: ID): PublicPageLink!
  }
`;
