import { describe, expect, it } from 'vitest';
import { makeSecuritySchema, splitHosts } from './security.types';

const t = (key: string, options?: { vars?: Record<string, string | number> }) => (options?.vars ? `${key}(${JSON.stringify(options.vars)})` : key);
const schema = makeSecuritySchema(t);
const base = { four_eyes_production: true, approval_expiry_hours: 24, messages_per_minute: 12, mcp_allowed_hosts: 'mcp.duncit.com', block_injection: true };
const issues = (values: Record<string, unknown>) => {
  const result = schema.safeParse(values);
  return result.success ? [] : result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
};

describe('security settings validation', () => {
  it('splits hosts on commas, spaces and lines, lower-cases and de-duplicates them', () => {
    expect(splitHosts(' MCP.duncit.com, staging.mcp.duncit.com\nmcp.duncit.com ')).toEqual(['mcp.duncit.com', 'staging.mcp.duncit.com']);
    expect(schema.parse({ ...base, mcp_allowed_hosts: 'a.example.com b.example.com' }).mcp_allowed_hosts).toEqual(['a.example.com', 'b.example.com']);
  });

  it('refuses something that is not a full host name', () => {
    expect(issues({ ...base, mcp_allowed_hosts: 'localhost' })).toEqual(['mcp_allowed_hosts: intel.settings.security.hostsInvalid']);
    expect(issues({ ...base, mcp_allowed_hosts: 'https://mcp.duncit.com' })).toEqual(['mcp_allowed_hosts: intel.settings.security.hostsInvalid']);
  });

  it('accepts an empty allow-list (then no MCP host can be reached)', () => {
    expect(schema.parse({ ...base, mcp_allowed_hosts: '' }).mcp_allowed_hosts).toEqual([]);
  });

  it('bounds approval expiry to a week and the message rate to at least one a minute', () => {
    expect(issues({ ...base, approval_expiry_hours: 169 })).toEqual(['approval_expiry_hours: intel.settings.common.max({"max":168})']);
    expect(issues({ ...base, messages_per_minute: 0 })).toEqual(['messages_per_minute: intel.settings.common.min({"min":1})']);
  });
});
