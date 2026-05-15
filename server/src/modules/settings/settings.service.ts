import { GraphQLError } from 'graphql';
import { getRuntimeEnvDefinition, getRuntimeEnvRows } from '../../config/runtimeEnv';
import {
  AppSettingsModel,
  FeatureFlagModel,
  BrandingModel,
  EnvironmentVariableModel,
} from './settings.model';

const toAppPub = (d: any) => ({
  jwt_expires_in: d?.jwt_expires_in ?? '7d',
  jwt_no_expiry: !!d?.jwt_no_expiry,
  date_format: d?.date_format ?? 'dd MMM yyyy',
  time_format: d?.time_format ?? 'hh:mm a',
  updated_at: d?.updated_at?.toISOString?.() ?? '',
});

const toFlagPub = (d: any) => {
  if (!d) return null;
  return {
    id: String(d._id),
    key: d.key,
    name: d.name,
    description: d.description ?? '',
    enabled: !!d.enabled,
    is_system: !!d.is_system,
    created_at: d.created_at?.toISOString?.() ?? '',
    updated_at: d.updated_at?.toISOString?.() ?? '',
  };
};

function notFound(what: string): never {
  throw new GraphQLError(`${what} not found`, { extensions: { code: 'NOT_FOUND' } });
}

const BRANDING_FIELDS = [
  'app_name',
  'logo_url',
  'primary_color',
  'support_email',
  'mascot_name',
  'mascot_description_html',
  'mascot_lottie_url',
  'mascot_on_chair_lottie_url',
  'mascot_winner_lottie_url',
  'welcome_lottie_url',
  'app_loader_lottie_url',
  'confetti_lottie_url',
] as const;
type BrandingField = (typeof BRANDING_FIELDS)[number];

const brandingToPub = (doc: any) => ({
  app_name: doc.app_name ?? 'Duncit',
  logo_url: doc.logo_url ?? '',
  primary_color: doc.primary_color ?? '#1976d2',
  support_email: doc.support_email ?? '',
  mascot_name: doc.mascot_name ?? 'Dunko',
  mascot_description_html: doc.mascot_description_html ?? '',
  mascot_lottie_url: doc.mascot_lottie_url ?? '',
  mascot_on_chair_lottie_url: doc.mascot_on_chair_lottie_url ?? '',
  mascot_winner_lottie_url: doc.mascot_winner_lottie_url ?? '',
  welcome_lottie_url: doc.welcome_lottie_url ?? '',
  app_loader_lottie_url: doc.app_loader_lottie_url ?? '',
  confetti_lottie_url: doc.confetti_lottie_url ?? '',
  updated_at: doc.updated_at?.toISOString?.() ?? '',
});

const DEFAULT_FLAGS: { key: string; name: string; description: string; enabled: boolean }[] = [
  { key: 'public_signup', name: 'Public Signup', description: 'Allow new users to register from the web app.', enabled: true },
  { key: 'venue_booking', name: 'Venue Booking', description: 'Enable venue booking flow.', enabled: true },
  { key: 'pod_creation', name: 'Pod Creation', description: 'Allow hosts to create pods.', enabled: true },
  { key: 'maintenance_mode', name: 'Maintenance Mode', description: 'Show maintenance banner across apps.', enabled: false },
  { key: 'pod_plans_section', name: 'Pod Plans Section', description: 'Show the Pod Plans nav entry in the mobile web app.', enabled: false },
  { key: 'whatsapp_signup_otp', name: 'WhatsApp Signup OTP', description: 'Ask the user to verify a WhatsApp number after signup.', enabled: false },
];

export const settingsService = {
  async getAppSettings() {
    let doc = await AppSettingsModel.findOne({ singleton_key: 'app' });
    if (!doc) doc = await AppSettingsModel.create({ singleton_key: 'app' });
    return toAppPub(doc);
  },

  async getPublicAppSettings() {
    let doc = await AppSettingsModel.findOne({ singleton_key: 'app' });
    if (!doc) doc = await AppSettingsModel.create({ singleton_key: 'app' });
    return {
      date_format: doc.date_format ?? 'dd MMM yyyy',
      time_format: doc.time_format ?? 'hh:mm a',
    };
  },

  async updateAppSettings(input: { jwt_expires_in?: string | null; jwt_no_expiry?: boolean; date_format?: string; time_format?: string }) {
    const update: any = {};
    if (input.jwt_no_expiry !== undefined) update.jwt_no_expiry = input.jwt_no_expiry;
    if (input.jwt_expires_in !== undefined) update.jwt_expires_in = input.jwt_expires_in;
    if (input.date_format !== undefined) update.date_format = input.date_format;
    if (input.time_format !== undefined) update.time_format = input.time_format;
    const doc = await AppSettingsModel.findOneAndUpdate(
      { singleton_key: 'app' },
      { $set: update },
      { new: true, upsert: true }
    );
    return toAppPub(doc);
  },

  async listFlags() {
    const all = await FeatureFlagModel.find().sort({ key: 1 });
    return all.map(toFlagPub);
  },

  async getFlag(key: string) {
    const f = await FeatureFlagModel.findOne({ key: key.toLowerCase() });
    return toFlagPub(f);
  },

  async listPublicFlags() {
    const all = await FeatureFlagModel.find({}, { key: 1, enabled: 1 }).sort({ key: 1 });
    return all.map((d: any) => ({ key: d.key, enabled: !!d.enabled }));
  },

  async createFlag(input: { key: string; name: string; description?: string; enabled?: boolean }) {
    const key = input.key.toLowerCase().trim();
    const exists = await FeatureFlagModel.findOne({ key });
    if (exists) throw new GraphQLError('Flag key exists', { extensions: { code: 'CONFLICT' } });
    const created = await FeatureFlagModel.create({
      key,
      name: input.name,
      description: input.description ?? '',
      enabled: !!input.enabled,
    });
    return toFlagPub(created);
  },

  async updateFlag(id: string, input: { name?: string; description?: string; enabled?: boolean }) {
    const updated = await FeatureFlagModel.findByIdAndUpdate(id, input, { new: true });
    if (!updated) notFound('FeatureFlag');
    return toFlagPub(updated);
  },

  async setFlagEnabled(id: string, enabled: boolean) {
    const updated = await FeatureFlagModel.findByIdAndUpdate(id, { enabled }, { new: true });
    if (!updated) notFound('FeatureFlag');
    return toFlagPub(updated);
  },

  async deleteFlag(id: string) {
    const f = await FeatureFlagModel.findById(id);
    if (!f) notFound('FeatureFlag');
    if (f!.is_system) {
      throw new GraphQLError('System flag cannot be deleted', { extensions: { code: 'FORBIDDEN' } });
    }
    await f!.deleteOne();
    return true;
  },

  async getBranding() {
    let doc = await BrandingModel.findOne({ singleton_key: 'branding' });
    if (!doc) doc = await BrandingModel.create({ singleton_key: 'branding' });
    return brandingToPub(doc);
  },

  async updateBranding(input: Partial<Record<BrandingField, string>>) {
    const update: any = {};
    for (const k of BRANDING_FIELDS) {
      if (input[k] !== undefined) update[k] = input[k];
    }
    const doc = await BrandingModel.findOneAndUpdate(
      { singleton_key: 'branding' },
      { $set: update },
      { new: true, upsert: true }
    );
    return brandingToPub(doc);
  },

  async listEnvironmentVariables() {
    return getRuntimeEnvRows();
  },

  async updateEnvironmentVariable(key: string, value: string, updatedBy?: string | null) {
    const normalized = key.toUpperCase().trim();
    if (!getRuntimeEnvDefinition(normalized)) {
      throw new GraphQLError('Environment variable is not managed', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }
    await EnvironmentVariableModel.updateOne(
      { key: normalized },
      { $set: { value, updated_by: updatedBy || null } },
      { upsert: true }
    );
    return (await getRuntimeEnvRows()).find((row) => row.key === normalized)!;
  },

  async clearEnvironmentVariable(key: string) {
    const normalized = key.toUpperCase().trim();
    if (!getRuntimeEnvDefinition(normalized)) {
      throw new GraphQLError('Environment variable is not managed', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }
    await EnvironmentVariableModel.deleteOne({ key: normalized });
    return (await getRuntimeEnvRows()).find((row) => row.key === normalized)!;
  },

  async seedDefaults() {
    await AppSettingsModel.updateOne(
      { singleton_key: 'app' },
      { $setOnInsert: { jwt_expires_in: '7d', jwt_no_expiry: false } },
      { upsert: true }
    );
    await BrandingModel.updateOne(
      { singleton_key: 'branding' },
      {
        $setOnInsert: {
          app_name: 'Duncit',
          logo_url: '',
          primary_color: '#1976d2',
          support_email: '',
        },
      },
      { upsert: true }
    );
    for (const f of DEFAULT_FLAGS) {
      await FeatureFlagModel.updateOne(
        { key: f.key },
        {
          $setOnInsert: {
            key: f.key,
            name: f.name,
            description: f.description,
            enabled: f.enabled,
            is_system: true,
          },
        },
        { upsert: true }
      );
    }
  },
};
