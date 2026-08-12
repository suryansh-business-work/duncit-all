export const linkPreviewTypeDefs = /* GraphQL */ `
  "Which kind of page a shared mWeb link points at."
  enum LinkPreviewKind {
    POD
    CLUB
    USER
    POST
    VENUE
    PRODUCT
  }

  """
  The public slice of an entity that a link-preview card renders: a title, a
  short plain-text description and one image. Nothing else ever crosses this
  boundary — no contact, finance or membership data.
  """
  type LinkPreview {
    title: String!
    description: String
    image_url: String
  }

  extend type Query {
    """
    Hydrates the meta tags mWeb's HTML server injects for social crawlers.

    Deliberately unauthenticated: WhatsApp/Slack/X fetch a shared link with no
    session, and the unfurled card must still show the pod instead of a bare
    logo. The resolver returns null (never an error) for anything unknown,
    deleted or inactive, so a stale link degrades to the app's default card.
    """
    linkPreview(kind: LinkPreviewKind!, id: String!, secondary_id: String): LinkPreview
  }
`;
