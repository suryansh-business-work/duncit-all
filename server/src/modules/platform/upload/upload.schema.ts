export const uploadTypeDefs = /* GraphQL */ `
  """
  Where to send a file, and the one-shot pass that lets you.

  Files go to ImageKit THROUGH the server, on the private key alone. A browser
  cannot sign an ImageKit upload, and the signed-from-the-browser scheme only
  works while the public and private keys are a matched pair — a mismatched pair
  rejects every upload and names no cause.
  """
  type ImagekitAuth {
    "POST the raw file here, with the ticket and fileName on the query string."
    uploadUrl: String!
    "Single use, ten minutes. It also fixes which folder the file lands in."
    ticket: String!
    "The CDN base callers render from."
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

  "Source-pixel crop rectangle from the client crop UI (react-easy-crop)."
  input UploadCropRectInput {
    x: Float!
    y: Float!
    width: Float!
    height: Float!
  }

  type VideoCompressionJob {
    job_id: String!
    status: String!
    pct: Int!
    url: String
    error: String
  }


  """
  One file (or folder) in the ImageKit media library.

  Nothing about it is stored here — it is ImageKit's record, read through the
  private key, which is why the browser cannot ask for it directly.
  """
  type MediaItem {
    fileId: ID!
    name: String!
    filePath: String!
    url: String!
    thumbnail: String
    "file or folder."
    type: String!
    "image or non-image, as ImageKit classifies it."
    fileType: String
    mime: String
    size: Int!
    width: Int
    height: Int
    tags: [String!]!
    createdAt: String
    updatedAt: String
    versionId: String
  }

  extend type Query {
    pexelsSearch(query: String, page: Int, perPage: Int, orientation: String): PexelsSearchResult!
    pexelsSearchVideos(
      query: String
      page: Int
      perPage: Int
      orientation: String
    ): PexelsVideoSearchResult!
    """
    A page of the media library. Search matches the file name, fileType is
    image or non-image, and sort takes ImageKit's own values (DESC_CREATED
    by default).
    """
    mediaFiles(
      search: String
      path: String
      fileType: String
      skip: Int
      limit: Int
      sort: String
    ): [MediaItem!]!
    "Everything ImageKit knows about one file — the details panel."
    mediaFile(fileId: ID!): MediaItem!
    "Poll a running FFmpeg compression job for its real progress percentage."
    videoCompressionJob(job_id: String!): VideoCompressionJob!
  }

  extend type Mutation {
    """
    Ask for somewhere to put a file. The folder is fixed on the pass, so one
    issued for avatars cannot be spent writing somewhere else.
    """
    getImagekitAuth(folder: String, surface: UploadSurface): ImagekitAuth!

    "Delete files by id. Returns how many ImageKit actually removed."
    deleteMediaFiles(fileIds: [ID!]!): Int!
    "Rename in place. Purging the CDN copy costs a purge credit, so it is opt-in."
    renameMediaFile(fileId: ID!, newFileName: String!, purgeCache: Boolean): MediaItem!
    "Tags, and the focus rectangle a smart crop uses."
    updateMediaFile(fileId: ID!, tags: [String!], customCoordinates: String): MediaItem!
    "Drop a URL from ImageKit's CDN cache, after replacing what sits behind it."
    purgeMediaCache(url: String!): String!


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
      "Allow document files (PDF/Office/txt/csv) in addition to image/video — used by support chat attachments."
      allow_documents: Boolean
      "Upload Settings surface of the caller (PORTALS | MOBILE | MWEB)."
      surface: String
      "Optional crop rect (source pixels) applied server-side with sharp — images only."
      crop: UploadCropRectInput
      "Crop preset key (NO_CROP / RATIO_16_9 / POD_FEATURE / …) to resize the crop to."
      crop_preset: String
    ): UploadedImage!

    """
    Compress an already direct-uploaded ImageKit video with FFmpeg and re-upload
    the result. Poll videoCompressionJob(job_id) for the real percentage.
    An optional trim window (start + duration, seconds) cuts the video during
    the FFmpeg pass — used by 15s video stories; trim always re-encodes even
    when compression is disabled for the surface.
    """
    startVideoCompression(
      remote_url: String!
      folder: String
      surface: String
      trim_start_seconds: Float
      trim_duration_seconds: Float
      """
      Run the FFmpeg pass even when compression is disabled for the surface.
      Used by callers that need the mp4 container itself, not smaller bytes —
      a browser call recording arrives as webm, and skipping the pass would
      hand back that webm under the name of an mp4.
      """
      force_transcode: Boolean
    ): VideoCompressionJob!
  }
`;
