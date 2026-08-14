import crypto from 'node:crypto';
import { openAsBlob } from 'node:fs';
import { GraphQLError } from 'graphql';
import { logs } from '@observability/log';
import { getRuntimeEnvValue } from '@config/runtimeEnv';
import { outboundFetch } from '@utils/outboundFetch';
import { getUrlConfigs } from '../../../config/url-configs';
import { issueUploadTicket } from './uploadTicket';
import { EnvEntryModel } from '@modules/platform/envEntry/envEntry.model';
import { mediaScanService } from '@modules/platform/uploadSetting/uploadSetting.service';
import {
  getUploadSettingsSafe,
  isProcessableImage,
  processImageBytes,
  type CropRect,
} from './mediaProcessing';

const IMAGEKIT_UPLOAD_URL = 'https://upload.imagekit.io/api/v1/files/upload';

/**
 * The one place the ImageKit credentials are read. Also the media library's.
 *
 * ONE read for all three values, from ONE entry.
 *
 * They used to be three independent lookups — a separate
 * `findOne({ category, is_active, is_default })` per key. Three queries with
 * the same filter are only guaranteed to return the same document while
 * exactly one matches it; with two entries left active and default, Mongo may
 * answer them from different records, and the public key of one account gets
 * signed with the private key of another. ImageKit calls that an "invalid
 * signature parameter", which says nothing about where it came from — and the
 * Tech portal's test, which reads a single entry by id, could never reproduce
 * it.
 *
 * A signed request has to carry one credential set. This reads one record.
 */
export async function getImagekitConfig() {
  const entries = await EnvEntryModel.find({
    category: 'IMAGEKIT',
    is_active: true,
    is_default: true,
  }).lean();

  if (entries.length > 1) {
    const names = entries.map((entry: any) => entry.name).join(', ');
    logs.server.error('upload', 'getImagekitConfig', {
      error: `Multiple default ImageKit entries: ${names}`,
    });
    throw new GraphQLError(
      `More than one ImageKit entry is marked active and default (${names}). Uploads sign with one entry's private key and send another's public key, which ImageKit rejects as an invalid signature. Leave exactly one default in Tech portal → Environment Variables → ImageKit.`,
      { extensions: { code: 'CONFIG_ERROR' } }
    );
  }

  const config = (entries[0]?.config ?? {}) as Record<string, unknown>;
  const read = (field: string) => {
    const value = config[field];
    return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
  };
  return {
    publicKey: read('public_key'),
    privateKey: read('private_key'),
    urlEndpoint: read('url_endpoint'),
  };
}

/**
 * Nothing here signs an upload any more, and that is deliberate.
 *
 * ImageKit's browser upload authenticates with a public key plus an
 * HMAC-SHA1(privateKey, token+expire) signature. That only works while the two
 * keys are a matched pair from ONE account, and when they are not, ImageKit
 * rejects every upload as an "invalid signature parameter" — a message that
 * names neither key nor cause. Every upload now goes out over Basic auth with
 * the private key alone, which is one credential that either works or does not.
 *
 * The public key is consequently unused by any upload path. It stays a
 * configurable field (ImageKit's own client SDKs want it) but no upload, and no
 * test of an upload, may depend on it again.
 */

/**
 * Where the browser should send a file, and the one-shot pass that lets it.
 *
 * This used to return an ImageKit signature so the browser could upload straight
 * to ImageKit. That only works while the public and private keys are a matched
 * pair — and a mismatched pair fails every upload with a message that names no
 * cause, which is exactly what happened. Uploads now come through the server on
 * the private key alone, so there is no signature to get wrong and no public key
 * in play at all.
 *
 * `urlEndpoint` still comes back: callers render from it.
 */
export async function getImagekitAuth(userId: string, folder = '/uploads') {
  const config = await getImagekitConfig();
  if (!config.privateKey) {
    throw new GraphQLError(
      'ImageKit is not configured. Add it in Tech portal → Environment Variables → ImageKit.',
      { extensions: { code: 'CONFIG_ERROR' } }
    );
  }
  const { serverUrl } = await getUrlConfigs();
  return {
    uploadUrl: `${serverUrl.replace(/\/$/, '')}/upload`,
    ticket: issueUploadTicket(userId, folder),
    urlEndpoint: config.urlEndpoint,
  };
}

export interface ImagekitUploadResult {
  url: string;
  fileId: string;
  thumbnailUrl?: string;
}

/**
 * The ONE call that puts a file on ImageKit. Every upload — browser, native,
 * Pexels import, CI artifact, the Tech portal's test — ends up here, so there is
 * a single authentication mechanism to get right.
 *
 * `file` is a Blob rather than a Buffer because a Blob can be backed by a file
 * on disk (fs.openAsBlob), which is what lets a 150 MB build artifact stream
 * through without ever being held in memory.
 */
async function postToImagekit(
  privateKey: string,
  file: Blob,
  opts: { fileName: string; folder?: string; tags?: string[] }
): Promise<ImagekitUploadResult> {
  if (!privateKey) {
    throw new GraphQLError('ImageKit is not configured', {
      extensions: { code: 'CONFIG_ERROR' },
    });
  }
  const form = new FormData();
  form.append('file', file, opts.fileName);
  form.append('fileName', opts.fileName);
  form.append('useUniqueFileName', 'true');
  if (opts.folder) form.append('folder', opts.folder);
  if (opts.tags?.length) form.append('tags', opts.tags.join(','));

  const auth = 'Basic ' + Buffer.from(privateKey + ':').toString('base64');
  const res = await fetch(IMAGEKIT_UPLOAD_URL, {
    method: 'POST',
    headers: { Authorization: auth },
    body: form as any,
  });
  const json: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new GraphQLError(
      `ImageKit upload failed: ${json?.message || res.statusText}`,
      { extensions: { code: 'UPSTREAM_ERROR' } }
    );
  }
  return {
    url: json.url,
    fileId: json.fileId,
    thumbnailUrl: json.thumbnailUrl,
  };
}

/**
 * Server-side upload to ImageKit. Used when importing a URL (e.g. a Pexels
 * stock photo) — the server fetches the image, then posts it to ImageKit so
 * the file ends up on our CDN rather than being hot-linked.
 *
 * `privateKey` overrides the configured credentials so the Tech portal can test
 * ONE named entry through this exact function. A test that authenticates its own
 * way is a test that can pass while every real upload fails.
 */
export async function uploadToImagekit(opts: {
  fileBytes: Buffer;
  fileName: string;
  folder?: string;
  tags?: string[];
  privateKey?: string;
}): Promise<ImagekitUploadResult> {
  const privateKey = opts.privateKey ?? (await getImagekitConfig()).privateKey;
  return postToImagekit(privateKey, new Blob([new Uint8Array(opts.fileBytes)]), opts);
}

/**
 * The same upload, streamed from a file on disk instead of from memory.
 *
 * A build artifact is 60–150 MB. Reading one into a Buffer to upload it costs
 * that much resident memory on the API server (twice, while concatenating), for
 * no benefit — openAsBlob hands ImageKit a lazily-read Blob, so the bytes go
 * from disk to socket and peak memory stays flat regardless of file size.
 */
export async function uploadFileToImagekit(opts: {
  filePath: string;
  fileName: string;
  folder?: string;
  tags?: string[];
}): Promise<ImagekitUploadResult> {
  const { privateKey } = await getImagekitConfig();
  return postToImagekit(privateKey, await openAsBlob(opts.filePath), opts);
}

// Documents are only accepted when the caller opts in (support attachments) —
// avatars / pod media stay image+video only.
const DOC_MIME_RE = /^(application\/pdf|application\/msword|application\/vnd\.openxmlformats-officedocument\.[a-z.]+|application\/vnd\.ms-(excel|powerpoint)|text\/plain|text\/csv)$/i;
// Extension fallbacks: browsers / pickers frequently report an empty or generic
// (application/octet-stream) mime for less-common containers, which would
// otherwise let a video slip past the 50 MB cap as an "image". We classify by
// the file extension too so the size rule can't be evaded.
const VIDEO_EXT_RE = /\.(mp4|mov|m4v|avi|webm|mkv|3gp|ts|flv|wmv|mpe?g)$/i;
const DOC_EXT_RE = /\.(pdf|docx?|xlsx?|pptx?|txt|csv)$/i;

type UploadSetting = NonNullable<Awaited<ReturnType<typeof getUploadSettingsSafe>>>;

type UploadKind = { isVideo: boolean; isDocument: boolean; isImage: boolean };

// Documents keep a fixed 100 MB ceiling (support attachments spec). Images and
// videos honour the admin Upload Settings caps; the fallbacks below only apply
// when the settings row is unreadable (no DB — e.g. unit tests).
const DOCUMENT_MAX_MB = 100;
const FALLBACK_IMAGE_MAX_MB = 100;
const FALLBACK_VIDEO_MAX_MB = 50;

const megabytes = (mb: number) => mb * 1024 * 1024;

/**
 * Enforce the upload size ceiling. Images/videos use the per-surface admin
 * limits (max_image_mb / max_video_mb) so raising or lowering them in the admin
 * panel actually takes effect; documents keep the fixed attachment ceiling.
 */
function assertUploadSize(fileBytes: Buffer, kind: UploadKind, setting: UploadSetting | null) {
  if (kind.isVideo) {
    const maxMb = setting?.max_video_mb ?? FALLBACK_VIDEO_MAX_MB;
    if (fileBytes.length > megabytes(maxMb)) {
      throw new GraphQLError(`Video is too large (max ${maxMb} MB)`, {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }
    return;
  }
  const maxMb = kind.isDocument ? DOCUMENT_MAX_MB : (setting?.max_image_mb ?? FALLBACK_IMAGE_MAX_MB);
  if (fileBytes.length > megabytes(maxMb)) {
    const label = kind.isDocument ? 'Document' : 'Image';
    throw new GraphQLError(`${label} is too large (max ${maxMb} MB)`, {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
}

// Classify the upload by mime + extension, throwing when it's none of the
// accepted kinds. Video wins if EITHER the mime or the extension says so, so a
// video with a missing/generic mime is still capped at 50 MB (not a 100 MB image).
function classifyUpload(mimeType: string, fileName: string, allowDocuments?: boolean): UploadKind {
  const isVideo = /^video\//i.test(mimeType) || VIDEO_EXT_RE.test(fileName);
  const isDocument =
    !isVideo &&
    allowDocuments === true &&
    (DOC_MIME_RE.test(mimeType) || DOC_EXT_RE.test(fileName));
  const isImage = !isVideo && !isDocument && /^image\//i.test(mimeType);
  if (!isImage && !isVideo && !isDocument) {
    const msg = allowDocuments
      ? 'Only image, video or document uploads are allowed'
      : 'Only image or video uploads are allowed';
    throw new GraphQLError(msg, { extensions: { code: 'BAD_USER_INPUT' } });
  }
  return { isVideo, isDocument, isImage };
}

function assertVideoFormatAllowed(safeName: string, setting: UploadSetting) {
  const ext = (/\.([a-z0-9]{2,5})$/i.exec(safeName)?.[1] ?? '').toLowerCase();
  if (ext && !setting.allowed_video_formats.includes(ext)) {
    throw new GraphQLError(
      `Video format .${ext} is not allowed (allowed: ${setting.allowed_video_formats.join(', ')})`,
      { extensions: { code: 'BAD_USER_INPUT' } },
    );
  }
}

// Reject a disallowed image format. Processable formats (jpg/png/webp) that fall
// outside the allow-list are transparently re-encoded to JPEG downstream, so we
// only hard-reject NON-processable images (gif/svg/heic, …) that can't be
// converted — this is what makes "remove gif from allowed formats" actually block
// a gif upload instead of letting it pass through untouched.
function assertImageFormatAllowed(safeName: string, mimeType: string, setting: UploadSetting) {
  const ext = (/\.([a-z0-9]{2,5})$/i.exec(safeName)?.[1] ?? '').toLowerCase();
  const normalized = ext === 'jpeg' ? 'jpg' : ext;
  if (!normalized) return;
  const allowed = setting.allowed_image_formats.map((f) => (f === 'jpeg' ? 'jpg' : f));
  if (allowed.includes(normalized) || isProcessableImage(mimeType)) return;
  throw new GraphQLError(
    `Image format .${normalized} is not allowed (allowed: ${allowed.join(', ')})`,
    { extensions: { code: 'BAD_USER_INPUT' } },
  );
}

// Apply admin Upload Settings (crop / compression / format). Processing is an
// enhancement, never a gate — on failure the original bytes/name are returned.
async function processImageForUpload(params: {
  fileBytes: Buffer;
  safeName: string;
  mimeType: string;
  setting: UploadSetting;
  crop?: CropRect | null;
  cropPresetKey?: string | null;
}): Promise<{ fileBytes: Buffer; safeName: string }> {
  let fileBytes = params.fileBytes;
  let safeName = params.safeName;
  try {
    const ext = (/\.([a-z0-9]{2,5})$/i.exec(safeName)?.[1] ?? '').toLowerCase();
    const normalized = ext === 'jpeg' ? 'jpg' : ext;
    const allowed = params.setting.allowed_image_formats.map((f) => (f === 'jpeg' ? 'jpg' : f));
    const forceJpeg =
      !!normalized && !allowed.includes(normalized) && isProcessableImage(params.mimeType);
    fileBytes = await processImageBytes({
      fileBytes,
      mimeType: params.mimeType,
      setting: params.setting,
      crop: params.crop,
      cropPresetKey: params.cropPresetKey,
      forceJpeg,
    });
    if (forceJpeg) safeName = safeName.replace(/\.[a-z0-9]{2,5}$/i, '.jpg');
  } catch (err) {
    logs.server.error('upload', 'processImageForUpload', {
      error: err,
      msg: 'image processing failed, uploading original',
      safeName,
    });
  }
  return { fileBytes, safeName };
}

export async function uploadBase64Image(opts: {
  fileBase64: string;
  fileName: string;
  folder?: string;
  mimeType?: string;
  allowDocuments?: boolean;
  /** Upload Settings surface of the caller (PORTALS | MOBILE | MWEB). */
  surface?: string;
  /** Source-pixel crop rect from the client crop UI (images only). */
  crop?: CropRect | null;
  /** Crop preset key (16:9, Pod Feature, …) to resize the crop to. */
  cropPresetKey?: string | null;
  /** Uploader, recorded on the AI image-monitoring scan. */
  userId?: string | null;
}) {
  const mimeType = (opts.mimeType || '').trim() || 'image/jpeg';
  const fileName = opts.fileName || '';
  const { isVideo, isDocument, isImage } = classifyUpload(mimeType, fileName, opts.allowDocuments);

  const raw = opts.fileBase64.includes(',')
    ? opts.fileBase64.split(',').pop() || ''
    : opts.fileBase64;
  let fileBytes: Buffer = Buffer.from(raw, 'base64');
  if (!fileBytes.length) {
    throw new GraphQLError('Upload file is empty', { extensions: { code: 'BAD_USER_INPUT' } });
  }

  let safeName = (opts.fileName || `upload-${Date.now()}`)
    .replace(/[^a-zA-Z0-9_.-]/g, '_')
    .slice(0, 120);

  // Admin Upload Settings (size caps / crop / compression / formats). Settings
  // being unreadable (no DB) never blocks the upload — the file goes up as-is.
  const setting = await getUploadSettingsSafe(opts.surface);
  assertUploadSize(fileBytes, { isVideo, isDocument, isImage }, setting);
  if (isVideo && setting) {
    assertVideoFormatAllowed(safeName, setting);
  }
  if (isImage && setting) {
    assertImageFormatAllowed(safeName, mimeType, setting);
    const processed = await processImageForUpload({
      fileBytes,
      safeName,
      mimeType,
      setting,
      crop: opts.crop,
      cropPresetKey: opts.cropPresetKey,
    });
    fileBytes = processed.fileBytes;
    safeName = processed.safeName;
  }

  const uploaded = await uploadToImagekit({
    fileBytes,
    fileName: safeName,
    folder: opts.folder,
  });
  if (isImage) {
    // Best-effort AI image monitoring (images only) — never blocks the upload.
    mediaScanService
      .record({
        url: uploaded.url,
        fileName: safeName,
        folder: opts.folder,
        surface: opts.surface,
        userId: opts.userId,
      })
      .catch(() => undefined);
  }
  return uploaded;
}

const ALLOWED_REMOTE_HOSTS = [
  /(^|\.)pexels\.com$/i,
  /(^|\.)imagekit\.io$/i,
  /(^|\.)unsplash\.com$/i,
];

const ALLOWED_REMOTE_MEDIA_HOSTS = [
  /(^|\.)pexels\.com$/i,
  /(^|\.)imagekit\.io$/i,
  /(^|\.)unsplash\.com$/i,
];

/**
 * Fetch a remote image (whitelisted hosts only) and upload it to ImageKit.
 * This is used to "import" a Pexels stock image — the URL we hand back to
 * the client lives on our ImageKit CDN, not the third-party origin.
 */
/** The stock-photo host as a person would name it — `images.pexels.com` is not it. */
function remoteImageServiceName(hostname: string): string {
  const host = hostname.toLowerCase();
  if (host.includes('pexels')) return 'Pexels';
  if (host.includes('unsplash')) return 'Unsplash';
  if (host.includes('imagekit')) return 'ImageKit';
  return 'The image host';
}

export async function importRemoteImage(opts: {
  remoteUrl: string;
  folder?: string;
  fileName?: string;
  tags?: string[];
}) {
  let parsed: URL;
  try {
    parsed = new URL(opts.remoteUrl);
  } catch {
    throw new GraphQLError('Invalid remote URL', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
  if (!/^https?:$/.test(parsed.protocol)) {
    throw new GraphQLError('Only http(s) URLs are allowed', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
  if (!ALLOWED_REMOTE_HOSTS.some((re) => re.test(parsed.hostname))) {
    throw new GraphQLError(
      `Only Pexels / Unsplash / ImageKit URLs may be imported (got ${parsed.hostname})`,
      { extensions: { code: 'BAD_USER_INPUT' } }
    );
  }
  // Named, so a failure reads "Pexels did not respond in time" rather than the
  // undici code for it. The allowlist above already fixed which hosts these
  // can be, so the label is derived from the host rather than guessed.
  const service = remoteImageServiceName(parsed.hostname);
  const remote = await outboundFetch(service, parsed.toString());
  if (!remote.ok)
    throw new GraphQLError(
      `${service} could not send that image (${remote.status} ${remote.statusText}).`,
      { extensions: { code: 'UPSTREAM_ERROR', reason: `${remote.status} ${remote.statusText}` } }
    );
  const mime = remote.headers.get('content-type') || 'image/jpeg';
  if (!/^image\//i.test(mime))
    throw new GraphQLError(`Remote URL did not return an image (got ${mime})`, {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  const buf = Buffer.from(await remote.arrayBuffer());
  // 15 MB hard cap on remote pulls
  if (buf.length > 15 * 1024 * 1024)
    throw new GraphQLError('Remote image is too large (max 15 MB)', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  const ext = (mime.split('/')[1] || 'jpg').replace('jpeg', 'jpg').split(';')[0];
  const fileName =
    (opts.fileName || `import-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`).replace(
      /[^a-zA-Z0-9_.-]/g,
      '_'
    ) + (opts.fileName?.includes('.') ? '' : `.${ext}`);
  return uploadToImagekit({
    fileBytes: buf,
    fileName,
    folder: opts.folder,
    tags: opts.tags,
  });
}

/**
 * Search Pexels for stock photos. Wrapped server-side so the API key never
 * ships to the browser.
 */
export async function pexelsSearch(opts: {
  query?: string;
  page?: number;
  perPage?: number;
  orientation?: string;
}) {
  const pexelsApiKey = (await getRuntimeEnvValue('PEXELS_API_KEY')).trim();
  if (!pexelsApiKey) {
    throw new GraphQLError('Pexels is not configured', {
      extensions: { code: 'CONFIG_ERROR' },
    });
  }
  const query = (opts.query || '').trim();
  const page = Math.max(1, opts.page || 1);
  const perPage = Math.min(80, Math.max(1, opts.perPage || 24));
  const orientationParam =
    opts.orientation && ['landscape', 'portrait', 'square'].includes(opts.orientation)
      ? `&orientation=${opts.orientation}`
      : '';

  const url = query
    ? `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${perPage}&page=${page}${orientationParam}`
    : `https://api.pexels.com/v1/curated?per_page=${perPage}&page=${page}`;

  const res = await fetch(url, { headers: { Authorization: pexelsApiKey } });
  const json: any = await res.json().catch(() => ({}));
  if (!res.ok)
    throw new GraphQLError(`Pexels search failed: ${json?.error || res.statusText}`, {
      extensions: { code: 'UPSTREAM_ERROR' },
    });
  const wantOrient = opts.orientation && ['landscape', 'portrait', 'square'].includes(opts.orientation)
    ? opts.orientation
    : null;
  const matchesOrient = (w: number, h: number) => {
    if (!wantOrient || !w || !h) return true;
    const ratio = w / h;
    if (wantOrient === 'landscape') return ratio > 1.1;
    if (wantOrient === 'portrait') return ratio < 0.9;
    return ratio >= 0.9 && ratio <= 1.1; // square
  };
  const photos = (json.photos || [])
    .filter((p: any) => matchesOrient(p.width, p.height))
    .map((p: any) => ({
      id: String(p.id),
      width: p.width,
      height: p.height,
      photographer: p.photographer,
      photographer_url: p.photographer_url,
      avg_color: p.avg_color,
      alt: p.alt || '',
      url: p.url,
      src_original: p.src?.original,
      src_large: p.src?.large2x || p.src?.large,
      src_medium: p.src?.medium,
      src_tiny: p.src?.tiny,
    }));
  return {
    page: json.page ?? page,
    per_page: json.per_page ?? perPage,
    total_results: json.total_results ?? photos.length,
    next_page: json.next_page ?? null,
    photos,
  };
}

/**
 * Search Pexels for stock videos. Wrapped server-side so the API key never
 * ships to the browser.
 */
export async function pexelsSearchVideos(opts: {
  query?: string;
  page?: number;
  perPage?: number;
  orientation?: string;
}) {
  const pexelsApiKey = (await getRuntimeEnvValue('PEXELS_API_KEY')).trim();
  if (!pexelsApiKey) {
    throw new GraphQLError('Pexels is not configured', {
      extensions: { code: 'CONFIG_ERROR' },
    });
  }
  const query = (opts.query || '').trim();
  const page = Math.max(1, opts.page || 1);
  const perPage = Math.min(80, Math.max(1, opts.perPage || 24));
  const orientationParam =
    opts.orientation && ['landscape', 'portrait', 'square'].includes(opts.orientation)
      ? `&orientation=${opts.orientation}`
      : '';

  const url = query
    ? `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=${perPage}&page=${page}${orientationParam}`
    : `https://api.pexels.com/videos/popular?per_page=${perPage}&page=${page}`;

  const res = await fetch(url, { headers: { Authorization: pexelsApiKey } });
  const json: any = await res.json().catch(() => ({}));
  if (!res.ok)
    throw new GraphQLError(`Pexels video search failed: ${json?.error || res.statusText}`, {
      extensions: { code: 'UPSTREAM_ERROR' },
    });
  const wantOrientV = opts.orientation && ['landscape', 'portrait', 'square'].includes(opts.orientation)
    ? opts.orientation
    : null;
  const matchesOrientV = (w: number, h: number) => {
    if (!wantOrientV || !w || !h) return true;
    const ratio = w / h;
    if (wantOrientV === 'landscape') return ratio > 1.1;
    if (wantOrientV === 'portrait') return ratio < 0.9;
    return ratio >= 0.9 && ratio <= 1.1;
  };
  const videos = (json.videos || [])
    .filter((v: any) => matchesOrientV(v.width, v.height))
    .map((v: any) => {
    const files = (v.video_files || [])
      .filter((f: any) => /^video\/mp4$/i.test(f.file_type || ''))
      .map((f: any) => ({
        id: String(f.id),
        quality: f.quality || '',
        width: f.width || 0,
        height: f.height || 0,
        link: f.link,
      }));
    const pictures = (v.video_pictures || []).map((p: any) => p.picture).find(Boolean);
    return {
      id: String(v.id),
      width: v.width,
      height: v.height,
      duration: v.duration,
      url: v.url,
      image: v.image,
      user_name: v.user?.name || '',
      user_url: v.user?.url || '',
      preview: pictures || v.image,
      video_files: files,
    };
  });
  return {
    page: json.page ?? page,
    per_page: json.per_page ?? perPage,
    total_results: json.total_results ?? videos.length,
    next_page: json.next_page ?? null,
    videos,
  };
}

/**
 * Fetch a remote image OR video (whitelisted hosts) and upload to ImageKit.
 */
export async function importRemoteMedia(opts: {
  remoteUrl: string;
  folder?: string;
  fileName?: string;
  tags?: string[];
}) {
  let parsed: URL;
  try {
    parsed = new URL(opts.remoteUrl);
  } catch {
    throw new GraphQLError('Invalid remote URL', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
  if (!/^https?:$/.test(parsed.protocol)) {
    throw new GraphQLError('Only http(s) URLs are allowed', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
  if (!ALLOWED_REMOTE_MEDIA_HOSTS.some((re) => re.test(parsed.hostname))) {
    throw new GraphQLError(
      `Only Pexels / Unsplash / ImageKit URLs may be imported (got ${parsed.hostname})`,
      { extensions: { code: 'BAD_USER_INPUT' } }
    );
  }
  // Named, so a failure reads "Pexels did not respond in time" rather than the
  // undici code for it. The allowlist above already fixed which hosts these
  // can be, so the label is derived from the host rather than guessed.
  const service = remoteImageServiceName(parsed.hostname);
  const remote = await outboundFetch(service, parsed.toString());
  if (!remote.ok)
    throw new GraphQLError(
      `${service} could not send that image (${remote.status} ${remote.statusText}).`,
      { extensions: { code: 'UPSTREAM_ERROR', reason: `${remote.status} ${remote.statusText}` } }
    );
  const mime = remote.headers.get('content-type') || 'application/octet-stream';
  const isImage = /^image\//i.test(mime);
  const isVideo = /^video\//i.test(mime);
  if (!isImage && !isVideo)
    throw new GraphQLError(`Remote URL must be image or video (got ${mime})`, {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  const buf = Buffer.from(await remote.arrayBuffer());
  const cap = isVideo ? 200 * 1024 * 1024 : 15 * 1024 * 1024;
  if (buf.length > cap)
    throw new GraphQLError(
      isVideo ? 'Remote video is too large (max 200 MB)' : 'Remote image is too large (max 15 MB)',
      { extensions: { code: 'BAD_USER_INPUT' } }
    );
  const ext = (mime.split('/')[1] || (isVideo ? 'mp4' : 'jpg'))
    .replace('jpeg', 'jpg')
    .split(';')[0];
  const fileName =
    (opts.fileName || `import-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`).replace(
      /[^a-zA-Z0-9_.-]/g,
      '_'
    ) + (opts.fileName?.includes('.') ? '' : `.${ext}`);
  return uploadToImagekit({
    fileBytes: buf,
    fileName,
    folder: opts.folder,
    tags: opts.tags,
  });
}
