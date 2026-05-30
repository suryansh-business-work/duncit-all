import * as yup from 'yup';
import type { IntegrationProvider, IntegrationProviderType } from '../queries';

/** A single editable config field for a provider type. */
export interface FieldDef {
  name: string;
  label: string;
  secret?: boolean;
  /** has_* flag on the public config that signals a stored secret. */
  hasFlag?: keyof IntegrationProvider['config'];
}

/** Field layout per integration type. Keys match IntegrationProviderConfigInput. */
export const TYPE_FIELDS: Record<IntegrationProviderType, FieldDef[]> = {
  IMAGEKIT: [
    { name: 'public_key', label: 'Public Key' },
    { name: 'private_key', label: 'Private Key', secret: true, hasFlag: 'has_private_key' },
    { name: 'url_endpoint', label: 'URL Endpoint' },
  ],
  PEXELS: [{ name: 'api_key', label: 'API Key', secret: true, hasFlag: 'has_api_key' }],
  GOOGLE: [
    { name: 'client_id', label: 'OAuth Client ID' },
    { name: 'client_secret', label: 'OAuth Client Secret', secret: true, hasFlag: 'has_client_secret' },
    { name: 'maps_api_key', label: 'Maps API Key', secret: true, hasFlag: 'has_maps_api_key' },
  ],
  TWILIO: [
    { name: 'account_sid', label: 'Account SID' },
    { name: 'auth_token', label: 'Auth Token', secret: true, hasFlag: 'has_auth_token' },
    { name: 'phone_number', label: 'Phone Number' },
  ],
  AI: [
    { name: 'provider', label: 'Provider (e.g. openai)' },
    { name: 'base_url', label: 'Base URL (optional)' },
    { name: 'model', label: 'Default Model (optional)' },
    { name: 'api_key', label: 'API Key', secret: true, hasFlag: 'has_api_key' },
  ],
};

export const TYPE_OPTIONS: { value: IntegrationProviderType; label: string }[] = [
  { value: 'IMAGEKIT', label: 'ImageKit' },
  { value: 'PEXELS', label: 'Pexels' },
  { value: 'GOOGLE', label: 'Google' },
  { value: 'TWILIO', label: 'Twilio' },
  { value: 'AI', label: 'AI Provider' },
];

export interface IntegrationFormValues {
  name: string;
  type: IntegrationProviderType;
  description: string;
  is_default: boolean;
  is_active: boolean;
  config: Record<string, string>;
}

export const emptyValues = (): IntegrationFormValues => ({
  name: '',
  type: 'IMAGEKIT',
  description: '',
  is_default: false,
  is_active: true,
  config: {},
});

export const valuesFromProvider = (p: IntegrationProvider): IntegrationFormValues => {
  const config: Record<string, string> = {};
  for (const field of TYPE_FIELDS[p.type]) {
    if (!field.secret) config[field.name] = ((p.config as any)[field.name] as string) ?? '';
  }
  return {
    name: p.name,
    type: p.type,
    description: p.description ?? '',
    is_default: p.is_default,
    is_active: p.is_active,
    config,
  };
};

/** Build the GraphQL config input — drop blank secrets so they are not cleared. */
export const toConfigInput = (values: IntegrationFormValues): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const field of TYPE_FIELDS[values.type]) {
    const value = (values.config[field.name] ?? '').trim();
    if (field.secret && !value) continue;
    out[field.name] = value;
  }
  return out;
};

/**
 * Validation: name required; the first secret field is required when creating a
 * new provider (on edit a blank secret means "keep existing").
 */
export const integrationSchema = (isEdit: boolean) =>
  yup.object({
    name: yup.string().trim().required('Name is required'),
    type: yup.string().required(),
    config: yup.object().test('required-secret', 'Credentials are required', function (config) {
      if (isEdit) return true;
      const type = (this.parent as IntegrationFormValues).type;
      const secret = TYPE_FIELDS[type].find((field) => field.secret);
      if (!secret) return true;
      const value = (config as Record<string, string>)?.[secret.name];
      return Boolean(value && value.trim())
        ? true
        : this.createError({ path: `config.${secret.name}`, message: `${secret.label} is required` });
    }),
  });
