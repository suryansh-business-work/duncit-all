import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import {
  CRM_EMAIL_ASSET_KINDS,
  CrmEmailSettingsModel,
  type CrmEmailAssetKind,
} from './crmEmailSettings.model';
import {
  CRM_EMAIL_COLOR_FIELDS,
  CRM_EMAIL_FONTS,
  CRM_EMAIL_RANGES,
  CRM_EMAIL_THEME_DEFAULTS,
  completeTheme,
  isFontKey,
  normalizeHex,
  type CrmEmailRangeKey,
  type CrmEmailTheme,
} from './crmEmailTheme';

const KEY = 'default';

/** Formats every mail client shows. SVG (Gmail blocks it) and WebP (Outlook) are refused. */
export const CRM_EMAIL_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif'] as const;
/** A library this size covers any brand; past it the editor's picker stops being usable. */
export const CRM_EMAIL_MAX_ASSETS = 100;

export interface BrandAssetInput {
  kind?: string | null;
  url?: string | null;
  name?: string | null;
  mime_type?: string | null;
  size_bytes?: number | null;
  width?: number | null;
  height?: number | null;
}

const bad = (message: string): never => {
  throw new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });
};
const notFound = (message: string): never => {
  throw new GraphQLError(message, { extensions: { code: 'NOT_FOUND' } });
};

const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : null);
const positiveOrNull = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.round(v) : null);

function httpsUrl(value: unknown): string {
  const raw = typeof value === 'string' ? value.trim() : '';
  let parsed: URL | null = null;
  try {
    parsed = new URL(raw);
  } catch {
    parsed = null;
  }
  if (parsed?.protocol !== 'https:') bad('Images must be uploaded files served over https');
  return raw;
}

function assetKind(value: unknown): CrmEmailAssetKind {
  if (!CRM_EMAIL_ASSET_KINDS.includes(value as CrmEmailAssetKind)) bad('Pick Logo, Banner or Image');
  return value as CrmEmailAssetKind;
}

function mimeType(value: unknown): string {
  const type = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (type && !(CRM_EMAIL_IMAGE_TYPES as readonly string[]).includes(type)) {
    bad('Email images must be PNG, JPG or GIF — SVG and WebP do not show in every mail app');
  }
  return type;
}

const objectId = (id: string): Types.ObjectId => {
  if (!Types.ObjectId.isValid(id)) notFound('Image not found');
  return new Types.ObjectId(id);
};

/** The file fields of an asset, validated; `kind` is optional on an update. */
function fileFields(input: BrandAssetInput) {
  return {
    url: httpsUrl(input.url),
    mime_type: mimeType(input.mime_type),
    size_bytes: positiveOrNull(input.size_bytes),
    width: positiveOrNull(input.width),
    height: positiveOrNull(input.height),
  };
}

/** A stored brand asset / settings document, as lean() returns them. */
interface AssetRow {
  _id: unknown;
  kind: string;
  url: string;
  name?: string | null;
  mime_type?: string | null;
  size_bytes?: number | null;
  width?: number | null;
  height?: number | null;
  created_at?: unknown;
}
interface SettingsRow {
  assets?: AssetRow[] | null;
  primary_logo_id?: unknown;
  theme?: Partial<Record<keyof CrmEmailTheme, unknown>> | null;
  updated_at?: unknown;
}

const pubAsset = (a: AssetRow) => ({
  id: String(a._id),
  kind: a.kind,
  url: a.url,
  name: a.name ?? '',
  mime_type: a.mime_type ?? '',
  size_bytes: a.size_bytes ?? null,
  width: a.width ?? null,
  height: a.height ?? null,
  created_at: iso(a.created_at),
});

function pub(doc: SettingsRow | null | undefined) {
  const assets = (doc?.assets ?? []).map(pubAsset);
  const primary = doc?.primary_logo_id ? String(doc.primary_logo_id) : null;
  return {
    assets,
    // A logo id whose asset is gone reads as "no CRM logo", never as a broken image.
    primary_logo_id: assets.some((a: { id: string }) => a.id === primary) ? primary : null,
    theme: completeTheme(doc?.theme),
    defaults: CRM_EMAIL_THEME_DEFAULTS,
    fonts: CRM_EMAIL_FONTS.map(({ key, label, stack }) => ({ key, label, stack })),
    updated_at: iso(doc?.updated_at),
  };
}

export type CrmEmailSettingsView = ReturnType<typeof pub>;

/**
 * A theme change, validated field by field. Unlike `completeTheme` (which reads
 * a stored document leniently), a wrong value here is refused, so an operator
 * never saves a colour that silently does nothing.
 */
export function validateThemeInput(input: Partial<Record<keyof CrmEmailTheme, unknown>>): Partial<CrmEmailTheme> {
  const out: Partial<CrmEmailTheme> = {};
  for (const field of CRM_EMAIL_COLOR_FIELDS) {
    if (input[field] == null) continue;
    const hex = normalizeHex(input[field]);
    if (!hex) bad(`${field.replaceAll('_', ' ')} must be a hex colour like #D92D2D`);
    out[field] = hex as string;
  }
  for (const field of ['body_font', 'heading_font'] as const) {
    if (input[field] == null) continue;
    if (!isFontKey(input[field])) bad(`Unknown font "${String(input[field])}"`);
    out[field] = input[field] as string;
  }
  for (const field of Object.keys(CRM_EMAIL_RANGES) as CrmEmailRangeKey[]) {
    const n = input[field];
    if (n == null) continue;
    const { min, max } = CRM_EMAIL_RANGES[field];
    if (typeof n !== 'number' || !Number.isInteger(n) || n < min || n > max) {
      bad(`${field.replaceAll('_', ' ')} must be a whole number from ${min} to ${max}`);
    }
    out[field] = n as number;
  }
  if (input.color_mode != null) {
    if (input.color_mode !== 'AUTO' && input.color_mode !== 'LIGHT') bad('Colour mode must be AUTO or LIGHT');
    out.color_mode = input.color_mode as CrmEmailTheme['color_mode'];
  }
  return out;
}

const load = () => CrmEmailSettingsModel.findOne({ key: KEY }).lean();

const upsert = (update: Record<string, unknown>) =>
  CrmEmailSettingsModel.findOneAndUpdate({ key: KEY }, update, { new: true, upsert: true, setDefaultsOnInsert: true }).lean();

export const crmEmailSettingsService = {
  async get() {
    return pub(await load());
  },

  async updateTheme(input: Partial<Record<keyof CrmEmailTheme, unknown>>, by?: string | null) {
    const fields = validateThemeInput(input);
    const $set: Record<string, unknown> = { updated_by: by ?? null };
    for (const [k, v] of Object.entries(fields)) $set[`theme.${k}`] = v;
    return pub(await upsert({ $set }));
  },

  async resetTheme(by?: string | null) {
    return pub(await upsert({ $set: { theme: {}, updated_by: by ?? null } }));
  },

  async addAssets(items: BrandAssetInput[], by?: string | null) {
    if (!items?.length) bad('Add at least one image');
    const current = await load();
    if ((current?.assets?.length ?? 0) + items.length > CRM_EMAIL_MAX_ASSETS) {
      bad(`The library holds up to ${CRM_EMAIL_MAX_ASSETS} images — remove some first`);
    }
    const docs = items.map((item) => ({
      kind: assetKind(item.kind),
      name: (item.name ?? '').trim().slice(0, 120),
      ...fileFields(item),
      created_by: by ?? null,
      created_at: new Date(),
    }));
    return pub(await upsert({ $push: { assets: { $each: docs } }, $set: { updated_by: by ?? null } }));
  },

  /** Rename, re-file or replace the file of one asset; its id (and any template using its URL) stays. */
  async updateAsset(id: string, input: BrandAssetInput, by?: string | null) {
    const $set: Record<string, unknown> = { updated_by: by ?? null };
    if (input.kind != null) $set['assets.$.kind'] = assetKind(input.kind);
    if (input.name != null) $set['assets.$.name'] = input.name.trim().slice(0, 120);
    if (input.url != null) {
      for (const [k, v] of Object.entries(fileFields(input))) $set[`assets.$.${k}`] = v;
    }
    const doc = await CrmEmailSettingsModel.findOneAndUpdate(
      { key: KEY, 'assets._id': objectId(id) },
      { $set },
      { new: true }
    ).lean();
    if (!doc) notFound('Image not found');
    // A logo re-filed as a banner can no longer be the header logo.
    if (input.kind && input.kind !== 'LOGO' && String(doc?.primary_logo_id) === id) {
      return pub(await upsert({ $set: { primary_logo_id: null } }));
    }
    return pub(doc);
  },

  /** Remove one asset, and un-pick it as the header logo in the same write. */
  async removeAsset(id: string, by?: string | null) {
    const oid = objectId(id);
    const doc = await CrmEmailSettingsModel.findOneAndUpdate(
      { key: KEY, 'assets._id': oid },
      [
        {
          $set: {
            assets: { $filter: { input: '$assets', cond: { $ne: ['$$this._id', oid] } } },
            primary_logo_id: { $cond: [{ $eq: ['$primary_logo_id', oid] }, null, '$primary_logo_id'] },
            updated_by: by ?? null,
          },
        },
      ],
      { new: true }
    ).lean();
    if (!doc) notFound('Image not found');
    return pub(doc);
  },

  /** Pick the logo the header shows on CRM emails; null puts the Duncit brand logo back. */
  async setPrimaryLogo(id: string | null, by?: string | null) {
    if (!id) return pub(await upsert({ $set: { primary_logo_id: null, updated_by: by ?? null } }));
    const oid = objectId(id);
    const doc = await CrmEmailSettingsModel.findOneAndUpdate(
      { key: KEY, assets: { $elemMatch: { _id: oid, kind: 'LOGO' } } },
      { $set: { primary_logo_id: oid, updated_by: by ?? null } },
      { new: true }
    ).lean();
    if (!doc) bad('Only an uploaded logo can be the email logo');
    return pub(doc);
  },

  /** What a render needs: the theme, the CRM logo (if one is picked) and the images the AI may place. */
  async renderContext(): Promise<{ theme: CrmEmailTheme; logoUrl: string | null; brandImages: string }> {
    const view = pub(await load());
    const logo = view.assets.find((a: { id: string }) => a.id === view.primary_logo_id);
    const brandImages = view.assets
      .filter((a: { kind: string }) => a.kind !== 'LOGO')
      .map((a: { kind: string; name: string; url: string; width: number | null; height: number | null }) => {
        const size = a.width && a.height ? ` (${a.width}x${a.height})` : '';
        return `- ${a.kind === 'BANNER' ? 'Banner' : 'Image'}: ${a.name || 'untitled'}${size} — ${a.url}`;
      })
      .join('\n');
    return { theme: view.theme, logoUrl: logo?.url ?? null, brandImages: brandImages || 'None uploaded.' };
  },
};
