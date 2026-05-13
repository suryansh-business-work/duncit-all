import { describe, expect, it } from 'vitest';
import { permissionFormSchema, toPermissionInput } from './permission.form';

const base = {
  resource_key: 'pods',
  action_key: 'create',
  description: '',
};

describe('permissionFormSchema', () => {
  it('rejects resource_key with uppercase', async () => {
    const error = await permissionFormSchema.validate({ ...base, resource_key: 'Pods' }, { abortEarly: false }).catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/resource/i);
  });
  it('rejects action_key starting with a digit', async () => {
    const error = await permissionFormSchema.validate({ ...base, action_key: '1delete' }, { abortEarly: false }).catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/action/i);
  });
  it('accepts valid input', async () => {
    await permissionFormSchema.validate(base);
  });
});

describe('toPermissionInput', () => {
  it('nullifies empty description', () => {
    expect(toPermissionInput(base).description).toBeNull();
  });
});
