import * as yup from 'yup';
import type { EnvCategoryDef, EnvEntry } from '../queries';

export interface EnvEntryFormValues {
  name: string;
  description: string;
  is_default: boolean;
  is_active: boolean;
  config: Record<string, string>;
}

export const emptyValues = (): EnvEntryFormValues => ({
  name: '',
  description: '',
  is_default: false,
  is_active: true,
  config: {},
});

export const valuesFromEntry = (entry: EnvEntry): EnvEntryFormValues => {
  const config: Record<string, string> = {};
  for (const pair of entry.config) config[pair.key] = pair.value ?? '';
  return {
    name: entry.name,
    description: entry.description ?? '',
    is_default: entry.is_default,
    is_active: entry.is_active,
    config,
  };
};

/** Build the [{key,value}] GraphQL input — drop blank secrets so they're kept. */
export const toConfigPairs = (def: EnvCategoryDef, values: EnvEntryFormValues) => {
  const pairs: { key: string; value: string }[] = [];
  for (const field of def.fields) {
    const value = (values.config[field.name] ?? '').toString().trim();
    if (field.secret && !value) continue;
    pairs.push({ key: field.name, value });
  }
  return pairs;
};

/** Validation: name required; first secret field required on create. */
export const envEntrySchema = (def: EnvCategoryDef, isEdit: boolean) =>
  yup.object({
    name: yup.string().trim().required('Name is required'),
    config: yup.object().test('required-secret', 'Credentials required', function (config) {
      if (isEdit) return true;
      const secret = def.fields.find((f) => f.secret);
      if (!secret) return true;
      const value = (config as Record<string, string>)?.[secret.name];
      return value && value.trim()
        ? true
        : this.createError({ path: `config.${secret.name}`, message: `${secret.label} is required` });
    }),
  });
