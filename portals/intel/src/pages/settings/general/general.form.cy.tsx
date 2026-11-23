import { describe, expect, it } from 'vitest';
import { makeGeneralSchema } from './general.types';

const t = (key: string, options?: { vars?: Record<string, string | number> }) => (options?.vars ? `${key}(${JSON.stringify(options.vars)})` : key);
const schema = makeGeneralSchema(t);
const ok = { app_title: 'Duncit Intel', description: 'Internal BI', default_environment: 'STAGING' as const, auto_sync: true };
const issues = (values: Record<string, unknown>) => {
  const result = schema.safeParse(values);
  return result.success ? [] : result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
};

describe('general settings validation', () => {
  it('accepts a complete section and trims text', () => {
    expect(schema.parse({ ...ok, app_title: '  Duncit Intel ' })).toEqual(ok);
  });

  it('requires a title and caps title and description', () => {
    expect(issues({ ...ok, app_title: '' })).toEqual(['app_title: intel.settings.general.titleRequired']);
    expect(issues({ ...ok, app_title: 'x'.repeat(61) })).toEqual(['app_title: intel.settings.common.max({"max":60})']);
    expect(issues({ ...ok, description: 'x'.repeat(301) })).toEqual(['description: intel.settings.common.max({"max":300})']);
  });

  it('accepts only staging, production or both as the default environment', () => {
    for (const env of ['STAGING', 'PRODUCTION', 'BOTH']) expect(issues({ ...ok, default_environment: env })).toEqual([]);
    expect(issues({ ...ok, default_environment: 'DEV' })).toHaveLength(1);
  });
});
