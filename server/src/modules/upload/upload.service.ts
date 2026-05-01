import crypto from 'crypto';
import { GraphQLError } from 'graphql';

const IMAGEKIT_PUBLIC_KEY = (
  process.env.IMAGEKIT_PUBLIC_KEY || 'public_kgj5PULxw6pfjeO2IGwEVundBIQ='
).trim();
const IMAGEKIT_PRIVATE_KEY = (
  process.env.IMAGEKIT_PRIVATE_KEY || 'private_n4IdSlg7DbXXn88rRAVqZhCgGVw='
).trim();
const IMAGEKIT_URL_ENDPOINT = (
  process.env.IMAGEKIT_URL_ENDPOINT || 'https://ik.imagekit.io/esdata1'
).trim();
const PEXELS_API_KEY = (
  process.env.PEXELS_API_KEY ||
  '3rBEfoT7NWCeZxOp9BpvsT8AVf6PTRRYs5vhVDGO7ZYxzt7eWjSUpofK'
).trim();

const IMAGEKIT_UPLOAD_URL = 'https://upload.imagekit.io/api/v1/files/upload';

/**
 * Generate the auth params required by the ImageKit browser-side upload SDK.
 * The browser uses this to upload directly to ImageKit without ever seeing
 * the private key.
 *
 * Per ImageKit docs the signature must equal:
 *   HMAC-SHA1(privateKey, token + expire)  (hex digest)
 * where expire is a Unix timestamp (seconds), at most 1 hour ahead of now.
 */
export function getImagekitAuth(expireSeconds = 30 * 60) {
  if (!IMAGEKIT_PRIVATE_KEY) {
    throw new GraphQLError('ImageKit is not configured', {
      extensions: { code: 'CONFIG_ERROR' },
    });
  }
  // Hex-only token — some HTTP clients mangle UUID hyphens or padding chars.
  const token = crypto.randomBytes(16).toString('hex');
  const expire = Math.floor(Date.now() / 1000) + expireSeconds;
  // The string concatenation here is what ImageKit re-derives on its side.
  const signature = crypto
    .createHmac('sha1', IMAGEKIT_PRIVATE_KEY)
    .update(`${token}${expire}`)
    .digest('hex');
  return {
    token,
    expire,
    signature,
    publicKey: IMAGEKIT_PUBLIC_KEY,
    urlEndpoint: IMAGEKIT_URL_ENDPOINT,
  };
}

/**
 * Server-side upload to ImageKit. Used when importing a URL (e.g. a Pexels
 * stock photo) — the server fetches the image, then posts it to ImageKit so
 * the file ends up on our CDN rather than being hot-linked.
 */
async function uploadToImagekit(opts: {
  fileBytes: Buffer;
  fileName: string;
  folder?: string;
  tags?: string[];
}): Promise<{ url: string; fileId: string; thumbnailUrl?: string }> {
  if (!IMAGEKIT_PRIVATE_KEY) {
    throw new GraphQLError('ImageKit is not configured', {
      extensions: { code: 'CONFIG_ERROR' },
    });
  }
  const form = new FormData();
  const blob = new Blob([new Uint8Array(opts.fileBytes)]);
  form.append('file', blob, opts.fileName);
  form.append('fileName', opts.fileName);
  form.append('useUniqueFileName', 'true');
  if (opts.folder) form.append('folder', opts.folder);
  if (opts.tags?.length) form.append('tags', opts.tags.join(','));

  const auth = 'Basic ' + Buffer.from(IMAGEKIT_PRIVATE_KEY + ':').toString('base64');
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

const ALLOWED_REMOTE_HOSTS = [
  /(^|\.)pexels\.com$/i,
  /(^|\.)imagekit\.io$/i,
  /(^|\.)unsplash\.com$/i,
];

/**
 * Fetch a remote image (whitelisted hosts only) and upload it to ImageKit.
 * This is used to "import" a Pexels stock image — the URL we hand back to
 * the client lives on our ImageKit CDN, not the third-party origin.
 */
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
  const remote = await fetch(parsed.toString());
  if (!remote.ok)
    throw new GraphQLError(`Remote fetch failed: ${remote.status} ${remote.statusText}`, {
      extensions: { code: 'UPSTREAM_ERROR' },
    });
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
}) {
  if (!PEXELS_API_KEY) {
    throw new GraphQLError('Pexels is not configured', {
      extensions: { code: 'CONFIG_ERROR' },
    });
  }
  const query = (opts.query || '').trim();
  const page = Math.max(1, opts.page || 1);
  const perPage = Math.min(80, Math.max(1, opts.perPage || 24));

  const url = query
    ? `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${perPage}&page=${page}`
    : `https://api.pexels.com/v1/curated?per_page=${perPage}&page=${page}`;

  const res = await fetch(url, { headers: { Authorization: PEXELS_API_KEY } });
  const json: any = await res.json().catch(() => ({}));
  if (!res.ok)
    throw new GraphQLError(`Pexels search failed: ${json?.error || res.statusText}`, {
      extensions: { code: 'UPSTREAM_ERROR' },
    });
  const photos = (json.photos || []).map((p: any) => ({
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
