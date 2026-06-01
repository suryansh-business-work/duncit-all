import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import EnvEntryForm from './env-entry.form';
import ConfigField from './ConfigField';
import { PHONE_RE, envEntrySchema, toConfigPairs } from './env-entry.types';
import type { EnvCategoryDef, EnvEntry, EnvFieldDef } from '../queries';

const imagekitDef: EnvCategoryDef = {
  category: 'IMAGEKIT',
  label: 'ImageKit',
  docUrl: 'https://imagekit.io/dashboard/developer/api-keys',
  fields: [
    { name: 'public_key', label: 'Public Key', secret: false, number: false, bool: false },
    { name: 'private_key', label: 'Private Key', secret: true, number: false, bool: false, hint: 'private_xxxx' },
    { name: 'url_endpoint', label: 'URL Endpoint', secret: false, number: false, bool: false },
  ],
};

const twilioDef: EnvCategoryDef = {
  category: 'TWILIO',
  label: 'Twilio',
  fields: [
    { name: 'account_sid', label: 'Account SID', secret: false, number: false, bool: false },
    { name: 'auth_token', label: 'Auth Token', secret: true, number: false, bool: false },
    { name: 'phone_number', label: 'Phone Number', secret: false, number: false, bool: false, phone: true },
  ],
};

const entry: EnvEntry = {
  id: '1', name: 'IK', category: 'IMAGEKIT', description: '', is_default: true, is_active: true,
  assigned_portals: [], config: [{ key: 'public_key', value: 'pk' }, { key: 'url_endpoint', value: 'https://ik' }],
  secrets: [{ key: 'has_private_key', present: true }], last_used_at: null, created_at: null, updated_at: null,
};

describe('EnvEntryForm', () => {
  it('requires the primary secret on create but not on edit', async () => {
    await expect(envEntrySchema(imagekitDef, false).validate({ name: 'X', config: {} })).rejects.toThrow(/required/i);
    await expect(envEntrySchema(imagekitDef, false).validate({ name: 'X', config: { private_key: 'k' } })).resolves.toBeTruthy();
    await expect(envEntrySchema(imagekitDef, true).validate({ name: 'X', config: {} })).resolves.toBeTruthy();
  });

  it('drops blank secrets from the config pairs', () => {
    const pairs = toConfigPairs(imagekitDef, { name: 'X', description: '', is_default: false, is_active: true, config: { public_key: 'p', private_key: '' } });
    expect(pairs.find((p) => p.key === 'private_key')).toBeUndefined();
    expect(pairs.find((p) => p.key === 'public_key')?.value).toBe('p');
  });

  it('renders the create dialog with the category label', () => {
    render(<EnvEntryForm open def={imagekitDef} initial={null} onSubmit={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText('New ImageKit entry')).toBeDefined();
  });

  it('fires the test handler when editing', () => {
    const onTest = vi.fn();
    render(<EnvEntryForm open def={imagekitDef} initial={entry} onSubmit={vi.fn()} onClose={vi.fn()} onTest={onTest} />);
    fireEvent.click(screen.getByRole('button', { name: /Test connection/i }));
    expect(onTest).toHaveBeenCalled();
  });

  it('shows a doc link in the create dialog', () => {
    render(<EnvEntryForm open def={imagekitDef} initial={null} onSubmit={vi.fn()} onClose={vi.fn()} />);
    const link = screen.getByRole('link', { name: /Open ImageKit dashboard/i }) as HTMLAnchorElement;
    expect(link.href).toContain('imagekit.io');
  });

  describe('phone validation', () => {
    it('accepts valid E.164 and rejects malformed numbers', () => {
      expect(PHONE_RE.test('+14155552671')).toBe(true);
      expect(PHONE_RE.test('+919876543210')).toBe(true);
      expect(PHONE_RE.test('9876543210')).toBe(false); // missing +
      expect(PHONE_RE.test('+0123')).toBe(false); // leading 0 after +
      expect(PHONE_RE.test('+1-415-555')).toBe(false); // separators
    });

    it('flags a bad TWILIO phone_number via the schema', async () => {
      await expect(
        envEntrySchema(twilioDef, true).validate({ name: 'T', config: { phone_number: '12345' } })
      ).rejects.toThrow(/E\.164/i);
      await expect(
        envEntrySchema(twilioDef, true).validate({ name: 'T', config: { phone_number: '+14155552671' } })
      ).resolves.toBeTruthy();
    });
  });

  describe('ConfigField secret eye-toggle', () => {
    const field: EnvFieldDef = { name: 'api_key', label: 'API Key', secret: true, number: false, bool: false };
    const renderField = () =>
      render(
        <ConfigField
          field={field}
          value="sk-secret"
          helperText="Required"
          onChange={vi.fn()}
          onBlur={vi.fn()}
          onToggleBool={vi.fn()}
        />
      );

    it('starts masked and reveals on click', () => {
      const { container } = renderField();
      const input = container.querySelector('input') as HTMLInputElement;
      expect(input.type).toBe('password');
      fireEvent.click(screen.getByRole('button', { name: /Show API Key/i }));
      expect(input.type).toBe('text');
    });
  });
});
