/**
 * The banner kit on a venue and on a host: what pod promotion banners are made
 * from (resolver: bannerKit.resolver).
 */
export const bannerKitTypeDefs = /* GraphQL */ `
  "One photo of a banner kit, with the line shown under it on a slide."
  type BannerKitPhoto {
    url: String!
    caption: String!
  }

  """
  What a venue's or a host's pod banners are made from. A kit nobody has saved
  yet reads as prefilled from what is already on file (a venue's cover and
  gallery, a host's photo); nothing is stored until the first save.
  """
  type BannerKit {
    logo_url: String!
    "Lowercase, without the @ or the instagram.com address."
    instagram_handle: String!
    "A venue's space, or a host's portraits; at most 12."
    photos: [BannerKitPhoto!]!
    "A host's past events; at most 12."
    event_photos: [BannerKitPhoto!]!
    "At most 80 characters."
    tagline: String!
    "At most 400 characters."
    bio: String!
    "A colour like #1a2b3c, or empty for the banner's own colours."
    brand_color: String!
    "Whether Duncit may invite instagram_handle as a collaborator on the pod's Instagram post."
    collab_opt_in: Boolean!
    "Photos already on file (media library only) that the kit can use with one click."
    suggested_photos: [String!]!
  }

  input BannerKitPhotoInput {
    url: String!
    caption: String
  }

  "Every field is optional: a field left out keeps its saved value."
  input BannerKitInput {
    "A media library address, or empty to remove it."
    logo_url: String
    "A handle, an @handle or an instagram.com link; empty removes it."
    instagram_handle: String
    "Replaces the whole list, in this order."
    photos: [BannerKitPhotoInput!]
    "Replaces the whole list, in this order."
    event_photos: [BannerKitPhotoInput!]
    tagline: String
    bio: String
    brand_color: String
    collab_opt_in: Boolean
  }

  extend type Venue {
    banner_kit: BannerKit!
  }

  extend type Host {
    banner_kit: BannerKit!
  }

  extend type Mutation {
    "Save a venue's banner kit: its owner, or a Venues console editor."
    updateVenueBannerKit(venue_id: ID!, input: BannerKitInput!): Venue!
    "Save a host's banner kit: the host themself, or a Hosts console editor."
    updateHostBannerKit(host_id: ID!, input: BannerKitInput!): Host!
  }
`;
