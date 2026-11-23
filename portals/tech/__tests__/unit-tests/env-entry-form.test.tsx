import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import EnvEntryForm from '../../src/pages/environment/env-entry/env-entry.form';
import ConfigField from '../../src/pages/environment/env-entry/ConfigField';
import { PHONE_RE, envEntrySchema, toConfigPairs } from '../../src/pages/environment/env-entry/env-entry.types';
import type { EnvCategoryDef } from '../../src/pages/environment/queries';
import {
  envEntryTestMessages,
  makeEnvCategoryDef,
  makeEnvEntry,
  makeEnvFieldDef,
  makeImagekitCategoryDef,
  makeTwilioCategoryDef,
} from '../mocks/env-entry.mock';

const imagekitDef = makeImagekitCategoryDef();
const twilioDef = makeTwilioCategoryDef();

const entry = makeEnvEntry({
  id: '1',
  name: 'IK',
  category: 'IMAGEKIT',
  description: '',
  is_default: true,
  config: [{ key: 'public_key', value: 'pk' }, { key: 'url_endpoint', value: 'https://ik' }],
  secrets: [{ key: 'has_private_key', present: true }],
});

describe('EnvEntryForm', () => {
  const errorsOf = (def: EnvCategoryDef, isEdit: boolean, values: Record<string, unknown>) => {
    const result = envEntrySchema(def, isEdit, envEntryTestMessages).safeParse(values);
    return result.success ? '' : result.error.issues.map((i) => i.message).join(' ');
  };

  it('requires the primary secret on create but not on edit', () => {
    expect(errorsOf(imagekitDef, false, { name: 'X', config: {} })).toMatch(/required/i);
    expect(envEntrySchema(imagekitDef, false, envEntryTestMessages).safeParse({ name: 'X', config: { private_key: 'k' } }).success).toBe(true);
    expect(envEntrySchema(imagekitDef, true, envEntryTestMessages).safeParse({ name: 'X', config: {} }).success).toBe(true);
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

    it('flags a bad TWILIO phone_number via the schema', () => {
      expect(errorsOf(twilioDef, true, { name: 'T', config: { phone_number: '12345' } })).toMatch(/E\.164/i);
      expect(envEntrySchema(twilioDef, true, envEntryTestMessages).safeParse({ name: 'T', config: { phone_number: '+14155552671' } }).success).toBe(true);
    });
  });

  describe('registry-driven validation', () => {
    const v = (type: string, extra: Record<string, unknown> = {}) => ({ type, required: false, ...extra });
    const emailDef = makeEnvCategoryDef({
      fields: [
        makeEnvFieldDef({ name: 'host', label: 'SMTP Host', validation: v('hostname') }),
        makeEnvFieldDef({ name: 'port', label: 'Port', number: true, validation: v('number', { min: 1, max: 65535 }) }),
        makeEnvFieldDef({ name: 'password', label: 'Password', secret: true, validation: v('text', { required: true }) }),
        makeEnvFieldDef({ name: 'from_address', label: 'From Address', validation: v('email') }),
      ],
    });

    it('requires exactly the fields the registry marks required, and only on create', () => {
      expect(errorsOf(emailDef, false, { name: 'X', config: { host: 'smtp.example.com' } })).toBe('Password is required');
      expect(errorsOf(emailDef, true, { name: 'X', config: {} })).toBe('');
    });

    it('checks each filled value against its type, naming the field', () => {
      const errors = errorsOf(emailDef, true, {
        name: 'X',
        config: { host: 'https://smtp.example.com', port: '70000', from_address: 'not-an-email' },
      });
      expect(errors).toContain('SMTP Host fails hostname');
      expect(errors).toContain('Port max 65535');
      expect(errors).toContain('From Address fails email');
    });

    it('accepts values that match their types, including a named sender', () => {
      expect(
        errorsOf(emailDef, true, { name: 'X', config: { host: 'smtp.example.com', port: '587', from_address: 'Duncit <no-reply@duncit.com>' } })
      ).toBe('');
    });

    it('marks the registry-required field as required in the create dialog', () => {
      render(<EnvEntryForm open def={emailDef} initial={null} onSubmit={vi.fn()} onClose={vi.fn()} />);
      expect(screen.getByLabelText(/Password/)).toBeRequired();
      expect(screen.getByLabelText(/SMTP Host/)).not.toBeRequired();
    });
  });

  describe('ConfigField secret eye-toggle', () => {
    const field = makeEnvFieldDef({ name: 'api_key', label: 'API Key', secret: true });
    const renderField = () =>
      render(
        <ConfigField field={field} value="sk-secret" helperText="Required" onChange={vi.fn()} onBlur={vi.fn()} onToggleBool={vi.fn()} />,
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
