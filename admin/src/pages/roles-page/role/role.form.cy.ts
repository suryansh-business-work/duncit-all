import { describe, expect, it } from 'vitest';
import { roleFormSchema, toRoleInput } from './role.form';

const base = {
  key: 'editor',
  name: 'Editor',
  description: '',
  permissions: ['pods:read', 'pods:update'],
};

describe('roleFormSchema', () => {
  it('rejects bad key', async () => {
    const error = await roleFormSchema.validate({ ...base, key: 'Editor Pro' }, { abortEarly: false }).catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/key/i);
  });
  it('rejects empty name', async () => {
    const error = await roleFormSchema.validate({ ...base, name: '' }, { abortEarly: false }).catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/name/i);
  });
  it('accepts valid input', async () => {
    await roleFormSchema.validate(base);
  });
});

describe('toRoleInput', () => {
  it('passes permissions through', () => {
    expect(toRoleInput(base).permissions).toEqual(['pods:read', 'pods:update']);
  });
});
