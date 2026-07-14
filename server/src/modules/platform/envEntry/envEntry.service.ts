import { GraphQLError } from 'graphql';
import { EnvEntryModel, ENV_CATEGORIES, type EnvCategory } from './envEntry.model';
import { CATEGORY_FIELDS, SECRET_FIELDS } from './envEntry.fields';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';

const iso = (v: any) => (v instanceof Date ? v.toISOString() : v ?? null);

export type EnvEntryConfig = Record<string, string | number | boolean>;

/**
 * Public projection. The Tech portal is the single, role-gated place to manage
 * credentials, so it shows every value (incl. secrets) behind a client-side
 * eye-toggle — nothing is masked. `secrets` still flags which fields hold a
 * value so the UI can mark presence even when a value is blank.
 */
const toPublicConfig = (category: EnvCategory, config: EnvEntryConfig = {}) => {
  const fields = CATEGORY_FIELDS[category] ?? [];
  const values: Record<string, string | number | boolean | null> = {};
  const secrets: Record<string, boolean> = {};
  for (const field of fields) {
    values[field.name] = (config[field.name] as any) ?? null;
    if (field.secret) secrets[`has_${field.name}`] = Boolean(config[field.name]);
  }
  return { values, secrets };
};

const pub = (doc: any) => {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : doc;
  const { values, secrets } = toPublicConfig(o.category, o.config ?? {});
  return {
    id: String(o._id),
    name: o.name,
    category: o.category as EnvCategory,
    description: o.description ?? '',
    is_default: !!o.is_default,
    is_active: o.is_active !== false,
    assigned_portals: (o.assigned_portals ?? []) as string[],
    // Flattened key/value pairs the UI renders (non-secret only).
    config: Object.entries(values).map(([key, value]) => ({
      key,
      value: value === null || value === undefined ? '' : String(value),
    })),
    secrets: Object.entries(secrets).map(([key, present]) => ({ key, present })),
    last_used_at: iso(o.last_used_at),
    last_tested_at: iso(o.last_tested_at),
    last_test_ok: o.last_test_ok ?? null,
    created_at: iso(o.created_at),
    updated_at: iso(o.updated_at),
  };
};

/** Allowlists for the shared table engine (envEntriesTable — DUNCIT TABLE CONTRACT v1). */
const ENV_ENTRY_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['name', 'description'],
  sortFields: {
    name: 'name',
    category: 'category',
    is_default: 'is_default',
    is_active: 'is_active',
    last_tested_at: 'last_tested_at',
    last_used_at: 'last_used_at',
    created_at: 'created_at',
    updated_at: 'updated_at',
  },
  filterFields: {
    category: { type: 'enum' },
    is_default: { type: 'boolean' },
    is_active: { type: 'boolean' },
    last_test_ok: { type: 'boolean' },
    // eq on a portal key matches array membership in mongo (assigned_portals is [String]).
    assigned_portals: { type: 'string' },
    created_at: { type: 'date' },
  },
  defaultSort: { category: 1, is_default: -1, name: 1 },
};

/** Record the outcome of any interactive/credential test on the entry. */
export async function recordTestResult(id: string, ok: boolean) {
  await EnvEntryModel.updateOne({ _id: id }, { $set: { last_tested_at: new Date(), last_test_ok: ok } });
}

function notFound(): never {
  throw new GraphQLError('Environment entry not found', { extensions: { code: 'NOT_FOUND' } });
}

/** Don't overwrite a secret when the incoming value is blank/undefined. */
function mergeConfig(existing: EnvEntryConfig = {}, input: EnvEntryConfig = {}): EnvEntryConfig {
  const next: EnvEntryConfig = { ...existing };
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) continue;
    if (SECRET_FIELDS.includes(key) && (value === null || value === '')) continue;
    next[key] = value as any;
  }
  return next;
}

async function clearOtherDefaults(category: EnvCategory, exceptId?: string) {
  await EnvEntryModel.updateMany(
    { category, _id: { $ne: exceptId }, is_default: true },
    { $set: { is_default: false } }
  );
}

type TestResult = { ok: boolean; message: string };
type ConfigStr = (k: string) => string;

async function probeImagekit(str: ConfigStr): Promise<TestResult> {
  if (!str('private_key')) return { ok: false, message: 'Private key is required' };
  const auth = 'Basic ' + Buffer.from(str('private_key') + ':').toString('base64');
  const res = await fetch('https://api.imagekit.io/v1/files?limit=1', { headers: { Authorization: auth } });
  return res.ok ? { ok: true, message: 'ImageKit credentials are valid' } : { ok: false, message: `ImageKit rejected the key (HTTP ${res.status})` };
}

async function probePexels(str: ConfigStr): Promise<TestResult> {
  if (!str('api_key')) return { ok: false, message: 'API key is required' };
  const res = await fetch('https://api.pexels.com/v1/curated?per_page=1', { headers: { Authorization: str('api_key') } });
  return res.ok ? { ok: true, message: 'Pexels API key is valid' } : { ok: false, message: `Pexels rejected the key (HTTP ${res.status})` };
}

async function probeGoogleMaps(str: ConfigStr): Promise<TestResult> {
  if (!str('maps_api_key')) return { ok: false, message: 'Maps API key is required' };
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=test&key=${encodeURIComponent(str('maps_api_key'))}`;
  const res = await fetch(url);
  const json: any = await res.json().catch(() => ({}));
  if (json?.status === 'REQUEST_DENIED') return { ok: false, message: json.error_message || 'Google denied the request' };
  return { ok: true, message: 'Google Maps API key is valid' };
}

async function probeGoogleOauth(str: ConfigStr): Promise<TestResult> {
  if (!str('client_id')) return { ok: false, message: 'OAuth Client ID is required' };
  // Client ID is public; the real test is the interactive browser sign-in.
  return { ok: true, message: 'Client ID set — run the OAuth sign-in test to verify' };
}

async function probeTwilio(str: ConfigStr): Promise<TestResult> {
  if (!str('account_sid') || !str('auth_token')) return { ok: false, message: 'Account SID and auth token are required' };
  const auth = 'Basic ' + Buffer.from(`${str('account_sid')}:${str('auth_token')}`).toString('base64');
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(str('account_sid'))}.json`, { headers: { Authorization: auth } });
  return res.ok ? { ok: true, message: 'Twilio credentials are valid' } : { ok: false, message: `Twilio rejected the credentials (HTTP ${res.status})` };
}

async function probeOpenai(str: ConfigStr): Promise<TestResult> {
  if (!str('api_key')) return { ok: false, message: 'API key is required' };
  const base = (str('base_url') || 'https://api.openai.com/v1').replace(/\/$/, '');
  const res = await fetch(`${base}/models`, { headers: { Authorization: `Bearer ${str('api_key')}` } });
  return res.ok ? { ok: true, message: 'OpenAI key is valid' } : { ok: false, message: `OpenAI rejected the key (HTTP ${res.status})` };
}

async function probeGemini(str: ConfigStr): Promise<TestResult> {
  if (!str('api_key')) return { ok: false, message: 'API key is required' };
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(str('api_key'))}`);
  return res.ok ? { ok: true, message: 'Gemini key is valid' } : { ok: false, message: `Gemini rejected the key (HTTP ${res.status})` };
}

async function probeServam(str: ConfigStr): Promise<TestResult> {
  if (!str('api_key')) return { ok: false, message: 'API key is required' };
  const base = (str('base_url') || 'https://api.sarvam.ai').replace(/\/$/, '');
  const res = await fetch(`${base}/v1/models`, { headers: { Authorization: `Bearer ${str('api_key')}` } });
  // Sarvam may not expose /models; any non-auth error still means the key was accepted.
  if (res.status === 401 || res.status === 403) return { ok: false, message: `Servam rejected the key (HTTP ${res.status})` };
  return { ok: true, message: 'Servam API key is set' };
}

async function probeRazorpay(str: ConfigStr): Promise<TestResult> {
  if (!str('key_id') || !str('key_secret'))
    return { ok: false, message: 'Key ID and key secret are required' };
  const auth = 'Basic ' + Buffer.from(`${str('key_id')}:${str('key_secret')}`).toString('base64');
  const res = await fetch('https://api.razorpay.com/v1/payments?count=1', {
    headers: { Authorization: auth },
  });
  return res.ok
    ? { ok: true, message: 'Razorpay credentials are valid' }
    : { ok: false, message: `Razorpay rejected the credentials (HTTP ${res.status})` };
}

async function probeShiprocket(str: ConfigStr): Promise<TestResult> {
  if (!str('email') || !str('password'))
    return { ok: false, message: 'Account email and password are required' };
  const res = await fetch('https://apiv2.shiprocket.in/v1/external/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: str('email'), password: str('password') }),
  });
  const data = (await res.json().catch(() => ({}))) as { token?: string };
  return res.ok && data.token
    ? { ok: true, message: 'ShipRocket credentials are valid' }
    : { ok: false, message: `ShipRocket rejected the credentials (HTTP ${res.status})` };
}

const ENV_PROBES: Partial<Record<EnvCategory, (str: ConfigStr) => Promise<TestResult>>> = {
  IMAGEKIT: probeImagekit,
  PEXELS: probePexels,
  GOOGLE_MAPS: probeGoogleMaps,
  GOOGLE_OAUTH: probeGoogleOauth,
  TWILIO: probeTwilio,
  OPENAI: probeOpenai,
  GEMINI: probeGemini,
  SERVAM: probeServam,
  RAZORPAY: probeRazorpay,
  SHIPROCKET: probeShiprocket,
};

/** Probe a category's credentials against its upstream API. Pure fetch. */
export async function testEnvConnection(
  category: EnvCategory,
  config: EnvEntryConfig
): Promise<TestResult> {
  const str = (k: string) => (config[k] == null ? '' : String(config[k]));
  try {
    const probe = ENV_PROBES[category];
    if (probe) return await probe(str);
    // EMAIL (SMTP) — no cheap unauthenticated probe; validate required fields.
    if (!str('host')) return { ok: false, message: 'SMTP host is required' };
    return { ok: true, message: `SMTP host ${str('host')} looks configured` };
  } catch (err: any) {
    return { ok: false, message: `Connection failed: ${err?.message || err}` };
  }
}

export const envEntryService = {
  async list(filter: { category?: EnvCategory | null; is_active?: boolean | null } = {}) {
    const query: any = {};
    if (filter.category) query.category = filter.category;
    if (filter.is_active != null) query.is_active = filter.is_active;
    const docs = await EnvEntryModel.find(query).sort({ category: 1, is_default: -1, name: 1 });
    return docs.map(pub);
  },

  /** Server-side table page (search/filter/sort/paginate) for the envEntriesTable query. */
  async table(input?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery(
      EnvEntryModel,
      {},
      input,
      ENV_ENTRY_TABLE_CONFIG
    );
    return { rows: docs.map(pub), total, page, page_size };
  },

  async get(id: string) {
    const doc = await EnvEntryModel.findById(id);
    return doc ? pub(doc) : null;
  },

  async create(input: {
    name: string;
    category: EnvCategory;
    description?: string | null;
    is_default?: boolean | null;
    is_active?: boolean | null;
    config?: EnvEntryConfig | null;
    assigned_portals?: string[] | null;
  }) {
    if (!ENV_CATEGORIES.includes(input.category)) {
      throw new GraphQLError('Unsupported environment category', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const created = await EnvEntryModel.create({
      name: input.name.trim(),
      category: input.category,
      description: input.description ?? '',
      is_default: !!input.is_default,
      is_active: input.is_active !== false,
      config: mergeConfig({}, input.config ?? {}),
      assigned_portals: input.assigned_portals ?? [],
    });
    // First entry in a category becomes the implicit default.
    const count = await EnvEntryModel.countDocuments({ category: created.category });
    if (created.is_default || count === 1) {
      created.is_default = true;
      await created.save();
      await clearOtherDefaults(created.category, String(created._id));
    }
    return pub(created);
  },

  async update(
    id: string,
    input: {
      name?: string | null;
      description?: string | null;
      is_default?: boolean | null;
      is_active?: boolean | null;
      config?: EnvEntryConfig | null;
      assigned_portals?: string[] | null;
    }
  ) {
    const existing = await EnvEntryModel.findById(id);
    if (!existing) notFound();
    if (input.name != null) existing.name = input.name.trim();
    if (input.description != null) existing.description = input.description;
    if (input.is_default != null) existing.is_default = input.is_default;
    if (input.is_active != null) existing.is_active = input.is_active;
    if (input.config) existing.config = mergeConfig((existing.config ?? {}) as EnvEntryConfig, input.config);
    if (input.assigned_portals != null) existing.assigned_portals = input.assigned_portals;
    await existing.save();
    if (existing.is_default) await clearOtherDefaults(existing.category as EnvCategory, String(existing._id));
    return pub(existing);
  },

  async remove(id: string) {
    const doc = await EnvEntryModel.findByIdAndDelete(id);
    if (!doc) notFound();
    // If we removed the default, promote another active entry in the category.
    if (doc.is_default) {
      const next = await EnvEntryModel.findOne({ category: doc.category, is_active: true }).sort({ name: 1 });
      if (next) {
        next.is_default = true;
        await next.save();
      }
    }
    return true;
  },

  async setDefault(id: string) {
    const doc = await EnvEntryModel.findById(id);
    if (!doc) notFound();
    doc.is_default = true;
    await doc.save();
    await clearOtherDefaults(doc.category as EnvCategory, String(doc._id));
    return pub(doc);
  },

  async test(id: string) {
    const doc = await EnvEntryModel.findById(id);
    if (!doc) notFound();
    const result = await testEnvConnection(doc.category as EnvCategory, (doc.config ?? {}) as EnvEntryConfig);
    const set: any = { last_tested_at: new Date(), last_test_ok: result.ok };
    if (result.ok) set.last_used_at = new Date();
    await EnvEntryModel.updateOne({ _id: doc._id }, { $set: set });
    return result;
  },

  /** Replace the full set of entries assigned to a portal (edited from the map page). */
  async setPortalAssignments(portalKey: string, entryIds: string[]) {
    const key = portalKey.trim();
    if (!key) throw new GraphQLError('Portal key is required', { extensions: { code: 'BAD_USER_INPUT' } });
    const ids = new Set(entryIds);
    // Add the portal to selected entries, remove from the rest.
    await EnvEntryModel.updateMany({ _id: { $in: Array.from(ids) } }, { $addToSet: { assigned_portals: key } });
    await EnvEntryModel.updateMany(
      { _id: { $nin: Array.from(ids) }, assigned_portals: key },
      { $pull: { assigned_portals: key } }
    );
    const docs = await EnvEntryModel.find({ assigned_portals: key }).sort({ category: 1, name: 1 });
    return docs.map(pub);
  },

  async listForPortal(portalKey: string) {
    const docs = await EnvEntryModel.find({ assigned_portals: portalKey.trim() }).sort({ category: 1, name: 1 });
    return docs.map(pub);
  },

  /**
   * Raw runtime config (incl. secrets) for a category. Honours a specific id,
   * else the active default. Used by resolveRuntimeField + service callers.
   */
  async resolveRuntime(category: EnvCategory, entryId?: string | null) {
    if (entryId) {
      const doc = await EnvEntryModel.findById(entryId);
      if (doc?.is_active) return { id: String(doc._id), name: doc.name, config: (doc.config ?? {}) as EnvEntryConfig };
    }
    const fallback = await EnvEntryModel.findOne({ category, is_active: true, is_default: true });
    if (fallback) return { id: String(fallback._id), name: fallback.name, config: (fallback.config ?? {}) as EnvEntryConfig };
    return null;
  },

  /**
   * Resolve the entry a given portal should use for a category:
   *   1. an active entry of that category assigned to the portal,
   *   2. else the category's active default (so every portal gets the default
   *      when nothing else is assigned).
   */
  async resolveForPortal(portalKey: string, category: EnvCategory) {
    const assigned = await EnvEntryModel.findOne({
      category,
      is_active: true,
      assigned_portals: portalKey.trim(),
    }).sort({ is_default: -1, name: 1 });
    if (assigned) return { id: String(assigned._id), name: assigned.name, config: (assigned.config ?? {}) as EnvEntryConfig };
    return this.resolveRuntime(category);
  },
};

export { maskSecret } from './envEntry.fields';
