import { z } from 'zod';
import type { Translate } from '@duncit/forms/schemas';
import type { LiteEnvCategoryDef, LiteEnvEntry, LiteEnvEntryInput, LiteEnvFieldDef } from '../../../graphql/environment';

export interface EnvEntryFormValues {
  name: string;
  description: string;
  is_default: boolean;
  is_active: boolean;
  /** Every config value as text; booleans are 'true' / 'false'. */
  config: Record<string, string>;
}

const DIGITS = /^\d*$/;

export const emptyEnvValues = (): EnvEntryFormValues => ({ name: '', description: '', is_default: false, is_active: true, config: {} });

export const envValuesFrom = (entry: LiteEnvEntry): EnvEntryFormValues => {
  const config: Record<string, string> = {};
  for (const pair of entry.config) config[pair.key] = pair.value ?? '';
  return { name: entry.name, description: entry.description ?? '', is_default: entry.is_default, is_active: entry.is_active, config };
};

/** True when the stored entry already holds this secret (the server reports `has_<name>`). */
export const secretPresent = (entry: LiteEnvEntry | null, field: LiteEnvFieldDef): boolean =>
  entry?.secrets.some((flag) => flag.key === `has_${field.name}` && flag.present) ?? false;

/** The `[{key, value}]` input; a blank secret is left out so the server keeps the stored one. */
export const toEnvInput = (def: LiteEnvCategoryDef, values: EnvEntryFormValues): Omit<LiteEnvEntryInput, 'category'> => {
  const config: { key: string; value: string }[] = [];
  for (const field of def.fields) {
    const raw = (values.config[field.name] ?? '').trim();
    if (field.secret && raw === '') continue;
    if (field.bool) {
      config.push({ key: field.name, value: raw === 'true' ? 'true' : 'false' });
      continue;
    }
    config.push({ key: field.name, value: raw });
  }
  return { name: values.name.trim(), description: values.description.trim(), is_default: values.is_default, is_active: values.is_active, config };
};

/** Name required; a secret required until the entry holds one; a number field must be digits. */
export const makeEnvEntrySchema = (t: Translate, def: LiteEnvCategoryDef, initial: LiteEnvEntry | null) => {
  const name = t('litePortal.common.name');
  const required = (field: string) => t('litePortal.validation.required', { vars: { field } });
  return z
    .object({
      name: z.string().trim().min(1, required(name)).max(80, t('litePortal.validation.max', { vars: { field: name, max: 80 } })),
      description: z.string().trim().max(200, t('litePortal.validation.max', { vars: { field: t('litePortal.common.description'), max: 200 } })),
      is_default: z.boolean(),
      is_active: z.boolean(),
      config: z.record(z.string(), z.string()),
    })
    .superRefine((values, ctx) => {
      for (const field of def.fields) {
        const value = (values.config[field.name] ?? '').trim();
        if (field.secret && value === '' && !secretPresent(initial, field)) {
          ctx.addIssue({ code: 'custom', path: ['config', field.name], message: required(field.label) });
        }
        if (field.number && !DIGITS.test(value)) {
          ctx.addIssue({ code: 'custom', path: ['config', field.name], message: t('litePortal.validation.integer', { vars: { field: field.label } }) });
        }
      }
    });
};
