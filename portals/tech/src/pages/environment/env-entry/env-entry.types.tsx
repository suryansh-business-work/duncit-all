import { z } from 'zod';
import type { EnvCategoryDef, EnvEntry } from '../queries';
import { findEnvProblem, isRequiredOnCreate, type EnvFinding } from './env-validation';

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

/** E.164 phone number: leading +, country code, up to 15 digits total (the call test's "number to call"). */
export const PHONE_RE = /^\+[1-9]\d{6,14}$/;

/** The copy the schema speaks; the form builds it from its translations. */
export interface EnvEntryMessages {
  nameRequired: string;
  required: (label: string) => string;
  problem: (finding: EnvFinding, label: string) => string;
}

/**
 * Validation, from each field's `validation` in env-registry.json (the same
 * rules the server enforces on save):
 *  - name required;
 *  - each field marked `required` must be filled on create;
 *  - a filled value must match its type (URL, host, email, E.164 phone,
 *    number within bounds, JSON, key file, list, SHA-256 fingerprints).
 */
export const envEntrySchema = (def: EnvCategoryDef, isEdit: boolean, messages: EnvEntryMessages) =>
  z
    .object({
      name: z.string().trim().min(1, messages.nameRequired),
      description: z.string().default(''),
      is_default: z.boolean().default(false),
      is_active: z.boolean().default(true),
      config: z.record(z.string(), z.string()).default({}),
    })
    .superRefine((values, ctx) => {
      for (const field of def.fields) {
        const value = (values.config[field.name] ?? '').toString();
        const path = ['config', field.name];
        if (value.trim() === '') {
          if (!isEdit && isRequiredOnCreate(field, def.fields)) {
            ctx.addIssue({ code: 'custom', path, message: messages.required(field.label) });
          }
          continue;
        }
        const finding = findEnvProblem(field, value);
        if (finding) ctx.addIssue({ code: 'custom', path, message: messages.problem(finding, field.label) });
      }
    });
