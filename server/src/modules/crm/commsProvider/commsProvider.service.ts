import { GraphQLError } from 'graphql';
import { CommsProviderModel, COMMS_PROVIDER_TYPES, type CommsProviderType } from './commsProvider.model';
import { envEntryService } from '@modules/platform/envEntry/envEntry.service';
import type { EnvCategory } from '@modules/platform/envEntry/envEntry.model';

/**
 * The Tech portal now manages comms credentials as Environment Variables
 * (env entries), so the CRM provider picker lists those entries. SMTP maps to
 * the EMAIL category; Vobiz email/call both map to the VOBIZ category.
 */
const TYPE_TO_CATEGORY: Record<CommsProviderType, EnvCategory> = {
  SMTP: 'EMAIL',
  TWILIO_CALL: 'TWILIO',
};

const EMPTY_OPTION_CONFIG = {
  host: '', port: null, user: '', secure: false, from_address: '', from_name: '', reply_to: '',
  base_url: '', sender_email: '', sender_name: '', caller_id: '', has_password: false, has_api_key: false,
};

const iso = (v: any) => (v instanceof Date ? v.toISOString() : v ?? null);

export interface CommsProviderRuntimeConfig {
  // SMTP
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  secure?: boolean;
  from_address?: string;
  from_name?: string;
  reply_to?: string;
  // Vobiz
  base_url?: string;
  api_key?: string;
  sender_email?: string;
  sender_name?: string;
  caller_id?: string;
}

const toPublicConfig = (config: Partial<CommsProviderRuntimeConfig> = {}) => ({
  host: config.host ?? '',
  port: config.port ?? null,
  user: config.user ?? '',
  secure: !!config.secure,
  from_address: config.from_address ?? '',
  from_name: config.from_name ?? '',
  reply_to: config.reply_to ?? '',

  base_url: config.base_url ?? '',
  sender_email: config.sender_email ?? '',
  sender_name: config.sender_name ?? '',
  caller_id: config.caller_id ?? '',

  has_password: Boolean(config.password),
  has_api_key: Boolean(config.api_key),
});

const pub = (doc: any) => {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : doc;
  return {
    id: String(o._id),
    name: o.name,
    type: o.type as CommsProviderType,
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
  throw new GraphQLError('Communication provider not found', {
    extensions: { code: 'NOT_FOUND' },
  });
}

function mergeConfig(
  existing: Partial<CommsProviderRuntimeConfig> = {},
  input: Partial<CommsProviderRuntimeConfig> = {}
): CommsProviderRuntimeConfig {
  // Only overwrite secret fields when a non-empty value is supplied.
  const next: CommsProviderRuntimeConfig = { ...existing };
  for (const [key, value] of Object.entries(input) as [keyof CommsProviderRuntimeConfig, any][]) {
    if (value === undefined) continue;
    if ((key === 'password' || key === 'api_key') && (value === null || value === '')) continue;
    next[key] = value;
  }
  return next;
}

async function clearOtherDefaults(type: CommsProviderType, exceptId?: string) {
  await CommsProviderModel.updateMany(
    { type, _id: { $ne: exceptId }, is_default: true },
    { $set: { is_default: false } }
  );
}

export const commsProviderService = {
  async list(filter: { type?: CommsProviderType | null; is_active?: boolean | null } = {}) {
    const query: any = {};
    if (filter.type) query.type = filter.type;
    if (filter.is_active !== undefined && filter.is_active !== null) query.is_active = filter.is_active;
    const docs = await CommsProviderModel.find(query).sort({ is_default: -1, name: 1 });
    return docs.map(pub);
  },

  /**
   * Provider options for the CRM call/email pickers, sourced from the Tech
   * portal's active env entries (not the legacy CommsProvider collection).
   */
  async options(type: CommsProviderType) {
    const entries = await envEntryService.list({ category: TYPE_TO_CATEGORY[type], is_active: true });
    return entries
      .filter((e): e is NonNullable<typeof e> => Boolean(e))
      .map((e) => ({
        id: e.id,
        name: e.name,
        type,
        description: e.description ?? '',
        is_default: e.is_default,
        is_active: e.is_active,
        config: EMPTY_OPTION_CONFIG,
        last_used_at: e.last_used_at,
        created_at: e.created_at,
        updated_at: e.updated_at,
      }));
  },

  async get(id: string) {
    const doc = await CommsProviderModel.findById(id);
    return doc ? pub(doc) : null;
  },

  async create(input: {
    name: string;
    type: CommsProviderType;
    description?: string | null;
    is_default?: boolean | null;
    is_active?: boolean | null;
    config: Partial<CommsProviderRuntimeConfig>;
  }) {
    if (!COMMS_PROVIDER_TYPES.includes(input.type)) {
      throw new GraphQLError('Unsupported provider type', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const created = await CommsProviderModel.create({
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
      config?: Partial<CommsProviderRuntimeConfig> | null;
    }
  ) {
    const existing = await CommsProviderModel.findById(id);
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
    const doc = await CommsProviderModel.findByIdAndDelete(id);
    if (!doc) notFound();
    return true;
  },

  async setDefault(id: string) {
    const doc = await CommsProviderModel.findById(id);
    if (!doc) notFound();
    doc.is_default = true;
    await doc.save();
    await clearOtherDefaults(doc.type, String(doc._id));
    return pub(doc);
  },

  /**
   * Returns the raw runtime config (including secrets) so internal email +
   * Vobiz services can use it. Tries the requested id, then the active
   * default for that type, then null.
   */
  async resolveRuntime(type: CommsProviderType, providerId?: string | null) {
    if (providerId) {
      const doc = await CommsProviderModel.findById(providerId);
      if (doc?.is_active) {
        await CommsProviderModel.updateOne({ _id: doc._id }, { $set: { last_used_at: new Date() } });
        return { id: String(doc._id), name: doc.name, config: (doc.config ?? {}) as CommsProviderRuntimeConfig };
      }
    }
    const fallback = await CommsProviderModel.findOne({ type, is_active: true, is_default: true });
    if (fallback) {
      await CommsProviderModel.updateOne({ _id: fallback._id }, { $set: { last_used_at: new Date() } });
      return { id: String(fallback._id), name: fallback.name, config: (fallback.config ?? {}) as CommsProviderRuntimeConfig };
    }
    return null;
  },
};
