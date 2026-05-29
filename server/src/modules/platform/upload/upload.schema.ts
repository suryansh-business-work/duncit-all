export const uploadTypeDefs = /* GraphQL */ `
  type ImagekitAuth {
    token: String!
    expire: Int!
    signature: String!
    publicKey: String!
    urlEndpoint: String!
  }

  type UploadedImage {
    url: String!
    fileId: String!
    thumbnailUrl: String
  }

  type PexelsPhoto {
    id: ID!
    width: Int!
    height: Int!
    photographer: String!
    photographer_url: String
    avg_color: String
    alt: String
    url: String!
    src_original: String!
    src_large: String!
    src_medium: String!
    src_tiny: String!
  }

  type PexelsSearchResult {
    page: Int!
    per_page: Int!
    total_results: Int!
    next_page: String
    photos: [PexelsPhoto!]!
  }

  type PexelsVideoFile {
    id: ID!
    quality: String!
    width: Int!
    height: Int!
    link: String!
  }

  type PexelsVideo {
    id: ID!
    width: Int!
    height: Int!
    duration: Int!
    url: String!
    image: String!
    preview: String!
    user_name: String!
    user_url: String
    video_files: [PexelsVideoFile!]!
  }

  type PexelsVideoSearchResult {
    page: Int!
    per_page: Int!
    total_results: Int!
    next_page: String
    videos: [PexelsVideo!]!
  }

  extend type Query {
    pexelsSearch(query: String, page: Int, perPage: Int, orientation: String): PexelsSearchResult!
    pexelsSearchVideos(
      query: String
      page: Int
      perPage: Int
      orientation: String
    ): PexelsVideoSearchResult!
  }

  extend type Mutation {
    """
    Returns short-lived auth params so the browser can upload directly to
    ImageKit using the official upload widget. The private key never leaves
    the server.
    """
    getImagekitAuth: ImagekitAuth!

    """
    Server-side import of a remote image (e.g. a Pexels stock photo) into our
    own ImageKit account. Returns the final ImageKit URL.
    """
    importRemoteImageToImagekit(
      remoteUrl: String!
      folder: String
      fileName: String
    ): UploadedImage!

    """
    Server-side import of a remote image OR video (e.g. Pexels stock video).
    Returns the final ImageKit URL.
    """
    importRemoteMediaToImagekit(
      remoteUrl: String!
      folder: String
      fileName: String
    ): UploadedImage!

    """
    Server-side ImageKit upload for admin/device files. This avoids browser
    signature failures by keeping the private-key upload on the API server.
    """
    uploadImageToImagekit(
      fileBase64: String!
      fileName: String!
      mimeType: String
      folder: String
    ): UploadedImage!
  }
`;
