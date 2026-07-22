import mongoose from 'mongoose';
import { GraphQLError } from 'graphql';
import { getRuntimeEnvValue } from '@config/runtimeEnv';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import {
  MediaScanLogModel,
  UploadSettingModel,
  UPLOAD_SURFACES,
  type IMediaScanLog,
  type IUploadCropPreset,
  type IUploadSetting,
  type UploadSurface,
} from './uploadSetting.model';

/**
 * Crop presets seeded per surface — resolutions researched from the actual
 * render sites across the apps:
 * - NO_CROP: upload as picked (default).
 * - RATIO_16_9 1920×1080: ad creatives (AdCard 16/9), venues-card video,
 *   landscape hero media.
 * - VERTICAL_9_16 1080×1920: status/story full-screen viewer + Explore reels
 *   (vertical full-bleed).
 * - POD_FEATURE 1600×800 (2:1): pod cover media — the create-pod field hints
 *   "Min 800×400px" on both mWeb and mobile.
 * - POD_MOMENT 1080×1080 (1:1): club moments MomentTile + profile post grids.
 * - VENUE_PHOTO 1600×1200 (4:3): venue details photo gallery.
 * - AVATAR 720×720 (1:1): profile avatar crop output size.
 */
export const DEFAULT_CROP_PRESETS: IUploadCropPreset[] = [
  { key: 'NO_CROP', label: 'No Crop (Default)', width: 0, height: 0, enabled: true },
  { key: 'RATIO_16_9', label: '16:9 (1920×1080)', width: 1920, height: 1080, enabled: true },
  { key: 'VERTICAL_9_16', label: 'Vertical Image (1080×1920)', width: 1080, height: 1920, enabled: true },
  { key: 'POD_FEATURE', label: 'Pod Feature Image (1600×800)', width: 1600, height: 800, enabled: true },
  { key: 'POD_MOMENT', label: 'Pod Moment (1080×1080)', width: 1080, height: 1080, enabled: true },
  { key: 'VENUE_PHOTO', label: 'Venue Photo (1600×1200)', width: 1600, height: 1200, enabled: true },
  { key: 'AVATAR', label: 'Avatar (720×720)', width: 720, height: 720, enabled: true },
];

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Math.round(value)));

const cleanFormats = (formats: unknown): string[] | undefined => {
  if (!Array.isArray(formats)) return undefined;
  const cleaned = formats
    .map((f) => String(f).trim().toLowerCase().replace(/^\./, ''))
    .filter((f) => /^[a-z0-9]{2,5}$/.test(f));
  return cleaned.length ? [...new Set(cleaned)] : undefined;
};

export interface UpdateUploadSettingInput {
  max_image_mb?: number;
  max_video_mb?: number;
  allowed_image_formats?: string[];
  allowed_video_formats?: string[];
  image_compression_enabled?: boolean;
  image_quality?: number;
  image_max_dimension?: number;
  video_compression_enabled?: boolean;
  video_crf?: number;
  video_max_height?: number;
  ai_image_monitoring_enabled?: boolean;
  default_crop_key?: string;
  crop_presets?: Array<Partial<IUploadCropPreset>>;
}

function assertSurface(surface: string): asserts surface is UploadSurface {
  if (!UPLOAD_SURFACES.includes(surface as UploadSurface)) {
    throw new GraphQLError('Unknown upload surface', { extensions: { code: 'BAD_USER_INPUT' } });
  }
}

function applyCropPresets(doc: IUploadSetting, input: UpdateUploadSettingInput): void {
  if (input.crop_presets === undefined) return;
  const presets = input.crop_presets
    .filter((p) => p && typeof p.key === 'string' && p.key.trim())
    .map((p) => ({
      key: String(p.key).trim().toUpperCase().slice(0, 40),
      label: String(p.label ?? p.key).trim().slice(0, 80),
      width: clamp(Number(p.width) || 0, 0, 8192),
      height: clamp(Number(p.height) || 0, 0, 8192),
      enabled: p.enabled !== false,
    }));
  if (presets.length) doc.crop_presets = presets;
}

export const uploadSettingService = {
  /** Settings row for a surface, seeded with defaults on first read. */
  async get(surface: string): Promise<IUploadSetting> {
    assertSurface(surface);
    const existing = await UploadSettingModel.findOne({ surface });
    if (existing) return existing;
    return UploadSettingModel.findOneAndUpdate(
      { surface },
      { $setOnInsert: { surface, crop_presets: DEFAULT_CROP_PRESETS } },
      { new: true, upsert: true },
    ) as Promise<IUploadSetting>;
  },

  /** Both surfaces (admin Upload Settings pages). */
  async list(): Promise<IUploadSetting[]> {
    return Promise.all(UPLOAD_SURFACES.map((surface) => this.get(surface)));
  },

  async update(surface: string, input: UpdateUploadSettingInput): Promise<IUploadSetting> {
    const doc = await this.get(surface);
    if (input.max_image_mb !== undefined) doc.max_image_mb = clamp(input.max_image_mb, 1, 100);
    if (input.max_video_mb !== undefined) doc.max_video_mb = clamp(input.max_video_mb, 1, 500);
    const imageFormats = cleanFormats(input.allowed_image_formats);
    if (imageFormats) doc.allowed_image_formats = imageFormats;
    const videoFormats = cleanFormats(input.allowed_video_formats);
    if (videoFormats) doc.allowed_video_formats = videoFormats;
    if (input.image_compression_enabled !== undefined) {
      doc.image_compression_enabled = input.image_compression_enabled;
    }
    if (input.image_quality !== undefined) doc.image_quality = clamp(input.image_quality, 1, 100);
    if (input.image_max_dimension !== undefined) {
      doc.image_max_dimension = clamp(input.image_max_dimension, 320, 8192);
    }
    if (input.video_compression_enabled !== undefined) {
      doc.video_compression_enabled = input.video_compression_enabled;
    }
    if (input.video_crf !== undefined) doc.video_crf = clamp(input.video_crf, 18, 40);
    if (input.video_max_height !== undefined) {
      doc.video_max_height = clamp(input.video_max_height, 240, 4320);
    }
    if (input.ai_image_monitoring_enabled !== undefined) {
      doc.ai_image_monitoring_enabled = input.ai_image_monitoring_enabled;
    }
    applyCropPresets(doc, input);
    if (input.default_crop_key !== undefined) {
      const key = String(input.default_crop_key).trim().toUpperCase();
      const known = doc.crop_presets.some((p) => p.key === key);
      if (!known) {
        throw new GraphQLError('default_crop_key must match a crop preset', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }
      doc.default_crop_key = key;
    }
    await doc.save();
    return doc;
  },
};

const IMAGE_SCAN_PROMPT = [
  'You are the upload monitor for Duncit, a social events platform.',
  'You are shown ONE image a user just uploaded. Assess how risky it is to show',
  'publicly: LOW (routine, safe), MEDIUM (borderline — suggestive, aggressive,',
  'spammy or heavily-watermarked content), HIGH (nudity, violence, hate symbols,',
  'illegal activity, or personal data like ID documents in a public folder).',
  'Return STRICT JSON only, no markdown, of shape',
  '{"risk":"LOW"|"MEDIUM"|"HIGH","summary":string} — the summary is one short',
  'sentence for an operations dashboard.',
].join('\n');

/** Parse the strict-JSON AI verdict; null on any shape mismatch. */
export function parseScanVerdict(content: string): { risk: 'LOW' | 'MEDIUM' | 'HIGH'; summary: string } | null {
  try {
    const parsed = JSON.parse(content) as { risk?: unknown; summary?: unknown };
    const risk = (typeof parsed.risk === 'string' ? parsed.risk : '').toUpperCase();
    if (risk !== 'LOW' && risk !== 'MEDIUM' && risk !== 'HIGH') return null;
    return { risk, summary: typeof parsed.summary === 'string' ? parsed.summary.slice(0, 1000) : '' };
  } catch {
    return null;
  }
}

/**
 * Best-effort AI vision review of a stored scan entry (same fallback contract
 * as podAudit.reviewLogWithAi): no key / HTTP failure / bad JSON leave the
 * entry at LOW with a stock summary — an AI outage never blocks uploads.
 */
export async function reviewImageWithAi(log: IMediaScanLog): Promise<void> {
  try {
    const [apiKey, baseUrl] = await Promise.all([
      getRuntimeEnvValue('OPENAI_API_KEY'),
      getRuntimeEnvValue('OPENAI_BASE_URL'),
    ]);
    let risk: IMediaScanLog['risk'] = 'LOW';
    let summary = 'AI review unavailable — no verdict.';
    if (apiKey) {
      const base = (baseUrl || 'https://api.openai.com/v1').replace(/\/$/, '');
      const res = await fetch(`${base}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          temperature: 0,
          max_tokens: 200,
          response_format: { type: 'json_object' as const },
          messages: [
            { role: 'system', content: IMAGE_SCAN_PROMPT },
            {
              role: 'user',
              content: [
                { type: 'text', text: `Folder: ${log.folder || '/'} — review this uploaded image.` },
                { type: 'image_url', image_url: { url: log.url } },
              ],
            },
          ],
        }),
      });
      if (res.ok) {
        const json: any = await res.json();
        const verdict = parseScanVerdict(String(json?.choices?.[0]?.message?.content ?? ''));
        if (verdict) {
          risk = verdict.risk;
          summary = verdict.summary || summary;
        }
      }
    }
    log.risk = risk;
    log.summary = summary;
    await log.save();
  } catch {
    // Swallow everything — the scan is strictly best-effort.
  }
}

/** Allowlists for the shared table engine (mediaScanLogsTable — DUNCIT TABLE CONTRACT v1). */
const MEDIA_SCAN_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['file_name', 'folder', 'summary', 'url'],
  sortFields: {
    created_at: 'created_at',
    risk: 'risk',
    surface: 'surface',
  },
  filterFields: {
    risk: { type: 'enum' },
    surface: { type: 'enum' },
    created_at: { type: 'date' },
  },
  defaultSort: { created_at: -1 },
};

const toScanPub = (d: IMediaScanLog) => ({
  id: String(d._id),
  url: d.url,
  file_name: d.file_name,
  folder: d.folder,
  surface: d.surface,
  user_id: d.user_id ?? null,
  risk: d.risk,
  summary: d.summary,
  created_at: d.created_at?.toISOString?.() ?? '',
});

export const mediaScanService = {
  /** Best-effort: store a PENDING scan row and enrich it with AI async.
   * Never throws — an upload must not fail because monitoring hiccupped. */
  async record(input: {
    url: string;
    fileName?: string;
    folder?: string;
    surface?: string;
    userId?: string | null;
  }): Promise<void> {
    if (mongoose.connection.readyState !== 1) return;
    try {
      const setting = await uploadSettingService.get(
        input.surface === 'PORTALS' ? 'PORTALS' : 'MOBILE_MWEB',
      );
      if (!setting.ai_image_monitoring_enabled) return;
      const log = await MediaScanLogModel.create({
        url: input.url,
        file_name: input.fileName ?? '',
        folder: input.folder ?? '',
        surface: input.surface ?? '',
        user_id: input.userId ?? undefined,
      });
      reviewImageWithAi(log).catch(() => undefined);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[mediaScan] record failed:', err);
    }
  },

  /** Admin: server-side table page over the image scan log. */
  async table(input?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery<IMediaScanLog>(
      MediaScanLogModel,
      {},
      input,
      MEDIA_SCAN_TABLE_CONFIG,
    );
    return { rows: docs.map(toScanPub), total, page, page_size };
  },
};
