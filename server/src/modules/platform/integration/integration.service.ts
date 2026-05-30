import { GraphQLError } from 'graphql';
import {
  IntegrationProviderModel,
  INTEGRATION_PROVIDER_TYPES,
  type IntegrationProviderType,
} from './integration.model';

const iso = (v: any) => (v instanceof Date ? v.toISOString() : v ?? null);

export interface IntegrationRuntimeConfig {
  // ImageKit
  public_key?: string;
  private_key?: string;
  url_endpoint?: string;
  // Pexels / AI
  api_key?: string;
  base_url?: string;
  model?: string;
  provider?: string;
  // Google
  client_id?: string;
  client_secret?: string;
  maps_api_key?: string;
  // Twilio
  account_sid?: string;
  auth_token?: string;
  phone_number?: string;
}

/** Config keys that hold secrets — never returned, never overwritten on blank. */
const SECRET_KEYS: (keyof IntegrationRuntimeConfig)[] = [
  'private_key',
  'api_key',
  'client_secret',
  'maps_api_key',
  'auth_token',
];

const toPublicConfig = (config: Partial<IntegrationRuntimeConfig> = {}) => ({
  public_key: config.public_key ?? '',
  url_endpoint: config.url_endpoint ?? '',
  client_id: config.client_id ?? '',
  account_sid: config.account_sid ?? '',
  phone_number: config.phone_number ?? '',
  base_url: config.base_url ?? '',
  model: config.model ?? '',
  provider: config.provider ?? '',

  has_private_key: Boolean(config.private_key),
  has_api_key: Boolean(config.api_key),
  has_client_secret: Boolean(config.client_secret),
  has_maps_api_key: Boolean(config.maps_api_key),
  has_auth_token: Boolean(config.auth_token),
});

const pub = (doc: any) => {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : doc;
  return {
    id: String(o._id),
    name: o.name,
    type: o.type as IntegrationProviderType,
    description: o.description ?? '',
    is_default: !!o.is_default,
    is_active: o.is_active !== false,
    config: toPublicConfig(o.config ?? {}),
    last_used_at: iso(o.last_used_at),
    created_at: iso(o.created_at),
    updated_at: iso(o.updated_at),
  };
};

function notFound(): never {
  throw new GraphQLError('Integration provider not found', {
    extensions: { code: 'NOT_FOUND' },
  });
}

function mergeConfig(
  existing: Partial<IntegrationRuntimeConfig> = {},
  input: Partial<IntegrationRuntimeConfig> = {}
): IntegrationRuntimeConfig {
  const next: IntegrationRuntimeConfig = { ...existing };
  for (const [key, value] of Object.entries(input) as [keyof IntegrationRuntimeConfig, any][]) {
    if (value === undefined) continue;
    if (SECRET_KEYS.includes(key) && (value === null || value === '')) continue;
    next[key] = value;
  }
  return next;
}

async function clearOtherDefaults(type: IntegrationProviderType, exceptId?: string) {
  await IntegrationProviderModel.updateMany(
    { type, _id: { $ne: exceptId }, is_default: true },
    { $set: { is_default: false } }
  );
}

/** Probe a provider's credentials against its upstream API. Pure, fetch-based. */
export async function testIntegrationConnection(
  type: IntegrationProviderType,
  config: IntegrationRuntimeConfig
): Promise<{ ok: boolean; message: string }> {
  try {
    if (type === 'IMAGEKIT') {
      if (!config.private_key) return { ok: false, message: 'Private key is required' };
      const auth = 'Basic ' + Buffer.from(config.private_key + ':').toString('base64');
      const res = await fetch('https://api.imagekit.io/v1/files?limit=1', {
        headers: { Authorization: auth },
      });
      return res.ok
        ? { ok: true, message: 'ImageKit credentials are valid' }
        : { ok: false, message: `ImageKit rejected the key (HTTP ${res.status})` };
    }

    if (type === 'PEXELS') {
      if (!config.api_key) return { ok: false, message: 'API key is required' };
      const res = await fetch('https://api.pexels.com/v1/curated?per_page=1', {
        headers: { Authorization: config.api_key },
      });
      return res.ok
        ? { ok: true, message: 'Pexels API key is valid' }
        : { ok: false, message: `Pexels rejected the key (HTTP ${res.status})` };
    }

    if (type === 'GOOGLE') {
      if (!config.maps_api_key) return { ok: false, message: 'Maps API key is required' };
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=test&key=${encodeURIComponent(
        config.maps_api_key
      )}`;
      const res = await fetch(url);
      const json: any = await res.json().catch(() => ({}));
      if (json?.status === 'REQUEST_DENIED') {
        return { ok: false, message: json.error_message || 'Google denied the request' };
      }
      return { ok: true, message: 'Google Maps API key is valid' };
    }

    if (type === 'TWILIO') {
      if (!config.account_sid || !config.auth_token) {
        return { ok: false, message: 'Account SID and auth token are required' };
      }
      const auth = 'Basic ' + Buffer.from(`${config.account_sid}:${config.auth_token}`).toString('base64');
      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(config.account_sid)}.json`,
        { headers: { Authorization: auth } }
      );
      return res.ok
        ? { ok: true, message: 'Twilio credentials are valid' }
        : { ok: false, message: `Twilio rejected the credentials (HTTP ${res.status})` };
    }

    // AI (OpenAI-compatible)
    if (!config.api_key) return { ok: false, message: 'API key is required' };
    const base = (config.base_url || 'https://api.openai.com/v1').replace(/\/$/, '');
    const res = await fetch(`${base}/models`, {
      headers: { Authorization: `Bearer ${config.api_key}` },
    });
    return res.ok
      ? { ok: true, message: 'AI provider key is valid' }
      : { ok: false, message: `AI provider rejected the key (HTTP ${res.status})` };
  } catch (err: any) {
    return { ok: false, message: `Connection failed: ${err?.message || err}` };
  }
}

export const integrationService = {
  async list(filter: { type?: IntegrationProviderType | null; is_active?: boolean | null } = {}) {
    const query: any = {};
    if (filter.type) query.type = filter.type;
    if (filter.is_active !== undefined && filter.is_active !== null) query.is_active = filter.is_active;
    const docs = await IntegrationProviderModel.find(query).sort({ is_default: -1, name: 1 });
    return docs.map(pub);
  },

  async options(type: IntegrationProviderType) {
    const docs = await IntegrationProviderModel.find({ type, is_active: true }).sort({ is_default: -1, name: 1 });
    return docs.map(pub);
  },

  async get(id: string) {
    const doc = await IntegrationProviderModel.findById(id);
    return doc ? pub(doc) : null;
  },

  async create(input: {
    name: string;
    type: IntegrationProviderType;
    description?: string | null;
    is_default?: boolean | null;
    is_active?: boolean | null;
    config: Partial<IntegrationRuntimeConfig>;
  }) {
    if (!INTEGRATION_PROVIDER_TYPES.includes(input.type)) {
      throw new GraphQLError('Unsupported integration type', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const created = await IntegrationProviderModel.create({
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      is_default: !!input.is_default,
      is_active: input.is_active !== false,
      config: mergeConfig({}, input.config ?? {}),
    });
    if (created.is_default) await clearOtherDefaults(created.type, String(created._id));
    return pub(created);
  },

  async update(
    id: string,
    input: {
      name?: string | null;
      description?: string | null;
      is_default?: boolean | null;
      is_active?: boolean | null;
      config?: Partial<IntegrationRuntimeConfig> | null;
    }
  ) {
    const existing = await IntegrationProviderModel.findById(id);
    if (!existing) notFound();
    if (input.name != null) existing.name = input.name.trim();
    if (input.description != null) existing.description = input.description;
    if (input.is_default != null) existing.is_default = input.is_default;
    if (input.is_active != null) existing.is_active = input.is_active;
    if (input.config) existing.config = mergeConfig(existing.config ?? {}, input.config);
    await existing.save();
    if (existing.is_default) await clearOtherDefaults(existing.type, String(existing._id));
    return pub(existing);
  },

  async remove(id: string) {
    const doc = await IntegrationProviderModel.findByIdAndDelete(id);
    if (!doc) notFound();
    return true;
  },

  async setDefault(id: string) {
    const doc = await IntegrationProviderModel.findById(id);
    if (!doc) notFound();
    doc.is_default = true;
    await doc.save();
    await clearOtherDefaults(doc.type, String(doc._id));
    return pub(doc);
  },

  async test(id: string) {
    const doc = await IntegrationProviderModel.findById(id);
    if (!doc) notFound();
    const result = await testIntegrationConnection(
      doc.type as IntegrationProviderType,
      (doc.config ?? {}) as IntegrationRuntimeConfig
    );
    if (result.ok) {
      await IntegrationProviderModel.updateOne({ _id: doc._id }, { $set: { last_used_at: new Date() } });
    }
    return result;
  },

  /** Raw runtime config (incl. secrets) for internal callers that need it. */
  async resolveRuntime(type: IntegrationProviderType, providerId?: string | null) {
    if (providerId) {
      const doc = await IntegrationProviderModel.findById(providerId);
      if (doc && doc.is_active) {
        return { id: String(doc._id), name: doc.name, config: (doc.config ?? {}) as IntegrationRuntimeConfig };
      }
    }
    const fallback = await IntegrationProviderModel.findOne({ type, is_active: true, is_default: true });
    if (fallback) {
      return { id: String(fallback._id), name: fallback.name, config: (fallback.config ?? {}) as IntegrationRuntimeConfig };
    }
    return null;
  },
};
