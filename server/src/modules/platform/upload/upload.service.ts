import crypto from 'crypto';
import { GraphQLError } from 'graphql';
import { getRuntimeEnvValue } from '@config/runtimeEnv';

const IMAGEKIT_UPLOAD_URL = 'https://upload.imagekit.io/api/v1/files/upload';

async function getImagekitConfig() {
  const [publicKey, privateKey, urlEndpoint] = await Promise.all([
    getRuntimeEnvValue('IMAGEKIT_PUBLIC_KEY'),
    getRuntimeEnvValue('IMAGEKIT_PRIVATE_KEY'),
    getRuntimeEnvValue('IMAGEKIT_URL_ENDPOINT'),
  ]);
  return {
    publicKey: publicKey.trim(),
    privateKey: privateKey.trim(),
    urlEndpoint: urlEndpoint.trim(),
  };
}

/**
 * Generate the auth params required by the ImageKit browser-side upload SDK.
 * The browser uses this to upload directly to ImageKit without ever seeing
 * the private key.
 *
 * Per ImageKit docs the signature must equal:
 *   HMAC-SHA1(privateKey, token + expire)  (hex digest)
 * where expire is a Unix timestamp (seconds), at most 1 hour ahead of now.
 */
export async function getImagekitAuth(expireSeconds = 30 * 60) {
  const config = await getImagekitConfig();
  if (!config.privateKey || !config.publicKey || !config.urlEndpoint) {
    throw new GraphQLError('ImageKit is not configured', {
      extensions: { code: 'CONFIG_ERROR' },
    });
  }
  // Hex-only token — some HTTP clients mangle UUID hyphens or padding chars.
  const token = crypto.randomBytes(16).toString('hex');
  const expire = Math.floor(Date.now() / 1000) + expireSeconds;
  // The string concatenation here is what ImageKit re-derives on its side.
  const signature = crypto
    .createHmac('sha1', config.privateKey)
    .update(`${token}${expire}`)
    .digest('hex');
  return {
    token,
    expire,
    signature,
    publicKey: config.publicKey,
    urlEndpoint: config.urlEndpoint,
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
  const config = await getImagekitConfig();
  if (!config.privateKey) {
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

  const auth = 'Basic ' + Buffer.from(config.privateKey + ':').toString('base64');
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

// Documents are only accepted when the caller opts in (support attachments) —
// avatars / pod media stay image+video only.
const DOC_MIME_RE = /^(application\/pdf|application\/msword|application\/vnd\.openxmlformats-officedocument\.[a-z.]+|application\/vnd\.ms-(excel|powerpoint)|text\/plain|text\/csv)$/i;
// Extension fallbacks: browsers / pickers frequently report an empty or generic
// (application/octet-stream) mime for less-common containers, which would
// otherwise let a video slip past the 50 MB cap as an "image". We classify by
// the file extension too so the size rule can't be evaded.
const VIDEO_EXT_RE = /\.(mp4|mov|m4v|avi|webm|mkv|3gp|ts|flv|wmv|mpe?g)$/i;
const DOC_EXT_RE = /\.(pdf|docx?|xlsx?|pptx?|txt|csv)$/i;

export async function uploadBase64Image(opts: {
  fileBase64: string;
  fileName: string;
  folder?: string;
  mimeType?: string;
  allowDocuments?: boolean;
}) {
  const mimeType = (opts.mimeType || '').trim() || 'image/jpeg';
  const fileName = opts.fileName || '';
  // Video wins if EITHER the mime or the extension says so, so a video with a
  // missing/generic mime is still capped at 50 MB (not treated as a 100 MB image).
  const isVideo = /^video\//i.test(mimeType) || VIDEO_EXT_RE.test(fileName);
  const isDocument =
    !isVideo &&
    opts.allowDocuments === true &&
    (DOC_MIME_RE.test(mimeType) || DOC_EXT_RE.test(fileName));
  const isImage = !isVideo && !isDocument && /^image\//i.test(mimeType);
  if (!isImage && !isVideo && !isDocument) {
    const msg = opts.allowDocuments
      ? 'Only image, video or document uploads are allowed'
      : 'Only image or video uploads are allowed';
    throw new GraphQLError(msg, { extensions: { code: 'BAD_USER_INPUT' } });
  }

  const raw = opts.fileBase64.includes(',')
    ? opts.fileBase64.split(',').pop() || ''
    : opts.fileBase64;
  const fileBytes = Buffer.from(raw, 'base64');
  if (!fileBytes.length) {
    throw new GraphQLError('Upload file is empty', { extensions: { code: 'BAD_USER_INPUT' } });
  }
  // Videos are capped at 50 MB; images and documents keep the 100 MB ceiling
  // (support attachments spec). Non-attachment callers (avatars, pod media)
  // still upload images that are far smaller than this.
  if (isVideo) {
    const maxVideoBytes = 50 * 1024 * 1024;
    if (fileBytes.length > maxVideoBytes) {
      throw new GraphQLError('Video is too large (max 50 MB)', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }
  } else {
    const maxBytes = 100 * 1024 * 1024;
    if (fileBytes.length > maxBytes) {
      const kind = isDocument ? 'Document' : 'Image';
      throw new GraphQLError(`${kind} is too large (max 100 MB)`, {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }
  }

  const safeName = (opts.fileName || `upload-${Date.now()}`)
    .replace(/[^a-zA-Z0-9_.-]/g, '_')
    .slice(0, 120);

  return uploadToImagekit({
    fileBytes,
    fileName: safeName,
    folder: opts.folder,
  });
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
    const pictures = (v.video_pictures || []).map((p: any) => p.picture).filter(Boolean);
    return {
      id: String(v.id),
      width: v.width,
      height: v.height,
      duration: v.duration,
      url: v.url,
      image: v.image,
      user_name: v.user?.name || '',
      user_url: v.user?.url || '',
      preview: pictures[0] || v.image,
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
  const remote = await fetch(parsed.toString());
  if (!remote.ok)
    throw new GraphQLError(`Remote fetch failed: ${remote.status} ${remote.statusText}`, {
      extensions: { code: 'UPSTREAM_ERROR' },
    });
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
