import { describe, expect, it } from 'vitest';
import { makeAccessSchema } from './access.types';

const t = (key: string, options?: { vars?: Record<string, string | number> }) => (options?.vars ? `${key}(${JSON.stringify(options.vars)})` : key);
const schema = makeAccessSchema(t);
const employee = { environments: ['STAGING'], sources: ['MEDIA', 'GITHUB'], can_request_writes: false, messages_per_day: 300 };
const admin = { environments: ['STAGING', 'PRODUCTION'], sources: ['MONGODB', 'MCP', 'GITHUB', 'SLACK', 'GMAIL', 'MEDIA'], can_request_writes: true, messages_per_day: 1000 };
const issues = (values: Record<string, unknown>) => {
  const result = schema.safeParse(values);
  return result.success ? [] : result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
};

describe('access policy validation', () => {
  it('accepts the shipped policies and coerces the daily limit', () => {
    expect(schema.parse({ employee: { ...employee, messages_per_day: '300' }, admin })).toEqual({ employee, admin });
  });

  it('allows an empty environment list (no access) but refuses unknown environments and sources', () => {
    expect(issues({ employee: { ...employee, environments: [] }, admin })).toEqual([]);
    expect(issues({ employee: { ...employee, environments: ['DEV'] }, admin })).toHaveLength(1);
    expect(issues({ employee, admin: { ...admin, sources: ['DROPBOX'] } })).toHaveLength(1);
  });

  it('refuses a negative daily limit for either level', () => {
    expect(issues({ employee, admin: { ...admin, messages_per_day: -1 } })).toEqual(['admin.messages_per_day: intel.settings.common.min({"min":0})']);
  });
});
