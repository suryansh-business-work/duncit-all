import { describe, expect, it } from 'vitest';
import { roleFormSchema, toRoleInput } from '../index';
import type { RoleFormValues } from '../index';

const valid: RoleFormValues = {
  key: 'content-editor',
  name: 'Content Editor',
  description: 'Can edit content',
  permissions: ['pods:read', 'pods:update'],
};

async function validationErrors(values: unknown): Promise<string[]> {
  try {
    await roleFormSchema.validate(values, { abortEarly: false });
    return [];
  } catch (error) {
    return (error as { errors: string[] }).errors;
  }
}

describe('roles-page/role barrel', () => {
  describe('roleFormSchema', () => {
    it('accepts a valid role and trims key and name on cast', async () => {
      const result = await roleFormSchema.validate({
        ...valid,
        key: '  content-editor  ',
        name: '  Content Editor  ',
      });
      expect(result.key).toBe('content-editor');
      expect(result.name).toBe('Content Editor');
      expect(result.permissions).toEqual(['pods:read', 'pods:update']);
    });

    it('defaults description to empty string and permissions to an empty list', async () => {
      const result = await roleFormSchema.validate({ key: 'viewer', name: 'Viewer' });
      expect(result.description).toBe('');
      expect(result.permissions).toEqual([]);
    });

    it('rejects a key with uppercase letters or spaces', async () => {
      const errors = await validationErrors({ ...valid, key: 'Content Editor' });
      expect(errors).toContain('Key may contain lowercase letters, digits, dashes and underscores');
    });

    it('rejects a key longer than 60 characters', async () => {
      const errors = await validationErrors({ ...valid, key: 'a'.repeat(61) });
      expect(errors).toContain('Key must be 60 characters or fewer');
    });

    it('rejects a blank key', async () => {
      const errors = await validationErrors({ ...valid, key: '   ' });
      expect(errors).toContain('Key is required');
    });

    it('rejects a name shorter than 2 characters', async () => {
      const errors = await validationErrors({ ...valid, name: 'A' });
      expect(errors).toContain('Name must be at least 2 characters');
    });

    it('rejects a name longer than 120 characters', async () => {
      const errors = await validationErrors({ ...valid, name: 'n'.repeat(121) });
      expect(errors).toContain('Name must be 120 characters or fewer');
    });

    it('rejects a missing name', async () => {
      const errors = await validationErrors({ ...valid, name: undefined });
      expect(errors).toContain('Name is required');
    });

    it('rejects a description longer than 500 characters', async () => {
      const errors = await validationErrors({ ...valid, description: 'd'.repeat(501) });
      expect(errors.some((message) => /description/i.test(message) && /500/.test(message))).toBe(true);
    });
  });

  describe('toRoleInput', () => {
    it('maps a filled form to the mutation input with a trimmed description', () => {
      expect(toRoleInput({ ...valid, description: '  Can edit content  ' })).toEqual({
        key: 'content-editor',
        name: 'Content Editor',
        description: 'Can edit content',
        permissions: ['pods:read', 'pods:update'],
      });
    });

    it('sends null for an empty description', () => {
      expect(toRoleInput({ ...valid, description: '' }).description).toBeNull();
    });

    it('sends null for a whitespace-only description', () => {
      expect(toRoleInput({ ...valid, description: '   ' }).description).toBeNull();
    });

    it('trims each permission and drops unknown fields', () => {
      const input = toRoleInput({
        ...valid,
        permissions: [' pods:read ', 'users:read'],
        extra: 'ignored',
      } as RoleFormValues);
      expect(input.permissions).toEqual(['pods:read', 'users:read']);
      expect(input).not.toHaveProperty('extra');
    });
  });
});
