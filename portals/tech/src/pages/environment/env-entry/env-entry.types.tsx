import { z } from 'zod';
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

/** E.164 phone number: leading +, country code, up to 15 digits total. */
export const PHONE_RE = /^\+[1-9]\d{6,14}$/;

/**
 * Validation:
 *  - name required;
 *  - first secret field required on create;
 *  - any `phone` field, when filled, must be a valid E.164 number.
 */
export const envEntrySchema = (def: EnvCategoryDef, isEdit: boolean) =>
  z
    .object({
      name: z.string().trim().min(1, 'Name is required'),
      description: z.string().default(''),
      is_default: z.boolean().default(false),
      is_active: z.boolean().default(true),
      config: z.record(z.string()).default({}),
    })
    .superRefine((values, ctx) => {
      const config = values.config;

      if (!isEdit) {
        const secret = def.fields.find((f) => f.secret);
        if (secret) {
          const value = config[secret.name];
          if (!value?.trim()) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['config', secret.name],
              message: `${secret.label} is required`,
            });
          }
        }
      }

      for (const field of def.fields.filter((f) => f.phone)) {
        const value = (config[field.name] ?? '').toString().trim();
        if (value && !PHONE_RE.test(value)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['config', field.name],
            message: `${field.label} must be E.164, e.g. +14155552671`,
          });
        }
      }
    });
