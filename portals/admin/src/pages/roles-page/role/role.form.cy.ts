import { describe, expect, it } from 'vitest';
import { roleFormSchema, toRoleInput } from './role.form';

const base = {
  key: 'editor',
  name: 'Editor',
  description: '',
  permissions: ['pods:read', 'pods:update'],
};

const messagesOf = (values: unknown) => {
  const result = roleFormSchema.safeParse(values);
  return result.success ? '' : result.error.issues.map((issue) => issue.message).join(' ');
};

describe('roleFormSchema', () => {
  it('rejects bad key', () => {
    expect(messagesOf({ ...base, key: 'Editor Pro' })).toMatch(/key/i);
  });
  it('rejects empty name', () => {
    expect(messagesOf({ ...base, name: '' })).toMatch(/name/i);
  });
  it('accepts valid input', () => {
    expect(roleFormSchema.safeParse(base).success).toBe(true);
  });
});

describe('toRoleInput', () => {
  it('passes permissions through', () => {
    expect(toRoleInput(base).permissions).toEqual(['pods:read', 'pods:update']);
  });
});
