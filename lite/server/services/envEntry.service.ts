import { LITE_ENV_CATEGORIES, LiteEnvEntryModel, type LiteEnvCategory } from '../models/envEntry.model';
import { badInput, notFound } from '../utils/errors';
import { iso } from '../utils/ids';
import { cleanText } from '../utils/validate';

export interface EnvFieldDef {
  name: string;
  label: string;
  secret?: boolean;
  number?: boolean;
  bool?: boolean;
  hint?: string;
}

/** The fields each category stores, rendered dynamically by the console's form. */
export const CATEGORY_FIELDS: Record<LiteEnvCategory, EnvFieldDef[]> = {
  EMAIL: [
    { name: 'host', label: 'SMTP Host', hint: 'e.g. smtp.gmail.com' },
    { name: 'port', label: 'Port', number: true, hint: '465 (SSL) or 587 (TLS)' },
    { name: 'user', label: 'Username', hint: 'Full mailbox address' },
    { name: 'password', label: 'Password', secret: true, hint: 'SMTP password or app password' },
    { name: 'secure', label: 'Use TLS', bool: true },
    { name: 'from_address', label: 'From Address', hint: 'no-reply@yourdomain.com' },
    { name: 'from_name', label: 'From Name' },
    { name: 'reply_to', label: 'Reply-To' },
  ],
  IMAGEKIT: [
    { name: 'private_key', label: 'Private Key', secret: true, hint: 'private_xxxxxxxxxxxxxxxx' },
    { name: 'url_endpoint', label: 'URL Endpoint', hint: 'https://ik.imagekit.io/your_id' },
    { name: 'folder', label: 'Folder', hint: '/lite — where covers and avatars are stored' },
  ],
  GOOGLE_OAUTH: [
    { name: 'client_id', label: 'OAuth Client ID', hint: 'xxxxxx.apps.googleusercontent.com' },
  ],
};

export const CATEGORY_LABELS: Record<LiteEnvCategory, { label: string; docUrl: string }> = {
  EMAIL: { label: 'Email (SMTP)', docUrl: 'https://support.google.com/mail/answer/7126229' },
  IMAGEKIT: { label: 'ImageKit', docUrl: 'https://imagekit.io/dashboard/developer/api-keys' },
  GOOGLE_OAUTH: { label: 'Google sign-in', docUrl: 'https://console.cloud.google.com/apis/credentials' },
};

export type EnvConfig = Record<string, string | number | boolean>;

const SECRET_FIELDS = new Set(
  Object.values(CATEGORY_FIELDS)
    .flat()
    .filter((f) => f.secret)
    .map((f) => f.name),
);

function coerce(field: EnvFieldDef, raw: string): string | number | boolean {
  if (field.bool) return raw === 'true' || raw === '1' || raw === 'on';
  if (field.number) {
    const n = Number.parseInt(raw, 10);
    if (Number.isNaN(n)) throw badInput(`${field.label} must be a number`);
    return n;
  }
  return raw.trim();
}

/** Only the category's own keys, typed; blank secrets keep the stored value. */
function mergeConfig(category: LiteEnvCategory, existing: EnvConfig, pairs: { key: string; value: string }[]): EnvConfig {
  const next: EnvConfig = { ...existing };
  const fields = new Map(CATEGORY_FIELDS[category].map((f) => [f.name, f]));
  for (const { key, value } of pairs) {
    const field = fields.get(key);
    if (!field) continue;
    if (SECRET_FIELDS.has(key) && value === '') continue;
    next[key] = coerce(field, value);
  }
  return next;
}

export function toPublicEnvEntry(doc: any) {
  const category = doc.category as LiteEnvCategory;
  const config = (doc.config ?? {}) as EnvConfig;
  return {
    id: String(doc._id),
    name: doc.name,
    category,
    description: doc.description ?? '',
    is_default: Boolean(doc.is_default),
    is_active: doc.is_active !== false,
    config: CATEGORY_FIELDS[category].map((f) => ({ key: f.name, value: config[f.name] === undefined ? '' : String(config[f.name]) })),
    secrets: CATEGORY_FIELDS[category].filter((f) => f.secret).map((f) => ({ key: `has_${f.name}`, present: Boolean(config[f.name]) })),
    last_tested_at: iso(doc.last_tested_at),
    last_test_ok: doc.last_test_ok ?? null,
    created_at: iso(doc.created_at) ?? '',
    updated_at: iso(doc.updated_at) ?? '',
  };
}

export interface EnvEntryInput {
  name: string;
  category: LiteEnvCategory;
  description?: string | null;
  is_default?: boolean | null;
  is_active?: boolean | null;
  config?: { key: string; value: string }[] | null;
}

async function clearOtherDefaults(category: LiteEnvCategory, exceptId: string): Promise<void> {
  await LiteEnvEntryModel.updateMany({ category, _id: { $ne: exceptId }, is_default: true }, { $set: { is_default: false } });
}

export const envEntryService = {
  categories() {
    return LITE_ENV_CATEGORIES.map((category) => ({
      category,
      label: CATEGORY_LABELS[category].label,
      docUrl: CATEGORY_LABELS[category].docUrl,
      fields: CATEGORY_FIELDS[category].map((f) => ({ ...f, secret: Boolean(f.secret), number: Boolean(f.number), bool: Boolean(f.bool), hint: f.hint ?? null })),
    }));
  },

  async list(category?: LiteEnvCategory | null) {
    const docs = await LiteEnvEntryModel.find(category ? { category } : {}).sort({ category: 1, is_default: -1, name: 1 }).lean();
    return docs.map(toPublicEnvEntry);
  },

  async create(input: EnvEntryInput) {
    if (!LITE_ENV_CATEGORIES.includes(input.category)) throw badInput('Unknown category');
    const name = cleanText(input.name, 80, 'Name', true);
    const count = await LiteEnvEntryModel.countDocuments({ category: input.category });
    const doc = await LiteEnvEntryModel.create({
      name,
      category: input.category,
      description: cleanText(input.description, 300, 'Description'),
      is_default: input.is_default ?? count === 0,
      is_active: input.is_active ?? true,
      config: mergeConfig(input.category, {}, input.config ?? []),
    });
    if (doc.is_default) await clearOtherDefaults(doc.category, String(doc._id));
    return toPublicEnvEntry(doc);
  },

  async update(id: string, input: EnvEntryInput) {
    const doc = await LiteEnvEntryModel.findById(id);
    if (!doc) throw notFound('Environment entry');
    doc.name = cleanText(input.name, 80, 'Name', true);
    doc.description = cleanText(input.description, 300, 'Description');
    if (input.is_default !== undefined && input.is_default !== null) doc.is_default = input.is_default;
    if (input.is_active !== undefined && input.is_active !== null) doc.is_active = input.is_active;
    doc.config = mergeConfig(doc.category, (doc.config ?? {}) as EnvConfig, input.config ?? []);
    doc.markModified('config');
    await doc.save();
    if (doc.is_default) await clearOtherDefaults(doc.category, String(doc._id));
    return toPublicEnvEntry(doc);
  },

  async remove(id: string) {
    const res = await LiteEnvEntryModel.deleteOne({ _id: id });
    return res.deletedCount > 0;
  },

  async setDefault(id: string) {
    const doc = await LiteEnvEntryModel.findById(id);
    if (!doc) throw notFound('Environment entry');
    doc.is_default = true;
    doc.is_active = true;
    await doc.save();
    await clearOtherDefaults(doc.category, String(doc._id));
    return toPublicEnvEntry(doc);
  },

  async recordTest(id: string, ok: boolean) {
    await LiteEnvEntryModel.updateOne({ _id: id }, { $set: { last_tested_at: new Date(), last_test_ok: ok } });
  },

  /** The active default entry's config for a category, or null when none is set. */
  async activeConfig(category: LiteEnvCategory): Promise<EnvConfig | null> {
    const doc = await LiteEnvEntryModel.findOne({ category, is_active: true, is_default: true }).lean();
    return doc ? ((doc.config ?? {}) as EnvConfig) : null;
  },

  async byId(id: string) {
    const doc = await LiteEnvEntryModel.findById(id).lean();
    if (!doc) throw notFound('Environment entry');
    return doc;
  },
};

export const readString = (config: EnvConfig | null, key: string): string => {
  const value = config?.[key];
  return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
};
