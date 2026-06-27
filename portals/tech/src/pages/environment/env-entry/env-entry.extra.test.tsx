import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ConfigField from './ConfigField';
import EnvEntryForm from './env-entry.form';
import { valuesFromEntry, toConfigPairs, envEntrySchema } from './env-entry.types';
import type { EnvCategoryDef, EnvEntry, EnvFieldDef } from '../queries';

const twilioDef: EnvCategoryDef = {
  category: 'TWILIO',
  label: 'Twilio',
  fields: [
    { name: 'account_sid', label: 'Account SID', secret: false, number: false, bool: false },
    { name: 'auth_token', label: 'Auth Token', secret: true, number: false, bool: false }, // no hint → exercises secretHelper
    { name: 'phone_number', label: 'Phone Number', secret: false, number: false, bool: false, phone: true },
  ],
};

const noSecretDef: EnvCategoryDef = {
  category: 'EMAIL',
  label: 'No Secret',
  fields: [{ name: 'host', label: 'Host', secret: false, number: false, bool: false }],
};

const emailDef: EnvCategoryDef = {
  category: 'EMAIL',
  label: 'Email',
  fields: [
    { name: 'host', label: 'Host', secret: false, number: false, bool: false },
    { name: 'password', label: 'Password', secret: true, number: false, bool: false },
    { name: 'secure', label: 'Use TLS', secret: false, number: false, bool: true },
  ],
};

const entry = (over: Partial<EnvEntry>): EnvEntry =>
  ({
    id: '1', name: 'TW', category: 'TWILIO', description: 'd', is_default: true, is_active: true,
    assigned_portals: [], config: [{ key: 'account_sid', value: 'AC' }, { key: 'phone_number', value: '+1' }],
    secrets: [{ key: 'has_auth_token', present: true }], last_used_at: null, last_tested_at: null,
    last_test_ok: null, created_at: null, updated_at: null, ...over,
  }) as EnvEntry;

describe('env-entry.types helpers', () => {
  it('valuesFromEntry maps config pairs and defaults', () => {
    const v = valuesFromEntry(entry({ description: undefined as any }));
    expect(v.config.account_sid).toBe('AC');
    expect(v.is_default).toBe(true);
    expect(v.description).toBe(''); // null/undefined → ''
  });

  it('toConfigPairs drops blank secrets and keeps phone values', () => {
    const pairs = toConfigPairs(twilioDef, {
      name: 'X', description: '', is_default: false, is_active: true,
      config: { account_sid: 'AC', auth_token: '', phone_number: '+14155552671' },
    });
    expect(pairs.find((p) => p.key === 'auth_token')).toBeUndefined();
    expect(pairs.find((p) => p.key === 'phone_number')?.value).toBe('+14155552671');
  });

  const schemaErrors = (def: EnvCategoryDef, isEdit: boolean, values: Record<string, unknown>) => {
    const result = envEntrySchema(def, isEdit).safeParse(values);
    return result.success ? '' : result.error.issues.map((i) => i.message).join(' ');
  };

  it('validates phone fields on create and edit', () => {
    expect(schemaErrors(twilioDef, false, { name: 'X', config: { auth_token: 't', phone_number: 'bad' } })).toMatch(/E\.164/i);
    expect(envEntrySchema(twilioDef, false).safeParse({ name: 'X', config: { auth_token: 't', phone_number: '+14155552671' } }).success).toBe(true);
  });

  it('valuesFromEntry coerces a null config value to an empty string', () => {
    const v = valuesFromEntry(entry({ config: [{ key: 'account_sid', value: null as any }] }));
    expect(v.config.account_sid).toBe('');
  });

  it('requires the primary secret on create', () => {
    expect(schemaErrors(twilioDef, false, { name: 'X', config: {} })).toMatch(/required/i);
  });

  it('passes a category with no secret field on create', () => {
    expect(envEntrySchema(noSecretDef, false).safeParse({ name: 'X', config: {} }).success).toBe(true);
  });

  it('tolerates a missing config object during phone validation (edit)', () => {
    expect(envEntrySchema(twilioDef, true).safeParse({ name: 'X' }).success).toBe(true);
  });
});

describe('ConfigField boolean variant', () => {
  it('renders a switch and reports toggles', () => {
    const onToggleBool = vi.fn();
    const field: EnvFieldDef = { name: 'secure', label: 'Use TLS', secret: false, number: false, bool: true };
    render(<ConfigField field={field} value="false" helperText=" " onChange={vi.fn()} onBlur={vi.fn()} onToggleBool={onToggleBool} />);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onToggleBool).toHaveBeenCalledWith('secure', true);
  });

  it('uses a numeric input for number fields', () => {
    const field: EnvFieldDef = { name: 'port', label: 'Port', secret: false, number: true, bool: false };
    render(<ConfigField field={field} value="587" helperText=" " onChange={vi.fn()} onBlur={vi.fn()} onToggleBool={vi.fn()} />);
    expect((screen.getByLabelText('Port') as HTMLInputElement).type).toBe('number');
  });
});

describe('EnvEntryForm interactions', () => {
  it('toggles default/active, shows a blur validation error, and submits', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<EnvEntryForm open def={twilioDef} initial={null} onSubmit={onSubmit} onClose={vi.fn()} />);
    const nameInput = screen.getByRole('textbox', { name: 'Name' });
    const tokenInput = screen.getByLabelText('Auth Token');
    fireEvent.click(screen.getByLabelText('Default'));
    fireEvent.click(screen.getByLabelText('Active'));
    fireEvent.blur(tokenInput);
    await waitFor(() => expect(screen.getByText(/Auth Token is required/i)).toBeInTheDocument());
    fireEvent.blur(nameInput);
    await waitFor(() => expect(screen.getByText(/Name is required/i)).toBeInTheDocument());
    fireEvent.change(nameInput, { target: { value: 'My TW' } });
    fireEvent.change(tokenInput, { target: { value: 'tok' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
  });

  it('shows busy and testing labels', () => {
    const { rerender } = render(<EnvEntryForm open def={twilioDef} initial={null} busy onSubmit={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
    rerender(<EnvEntryForm open def={twilioDef} initial={entry({})} testing onTest={vi.fn()} onSubmit={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText('Testing…')).toBeInTheDocument();
  });

  it('toggles a boolean config field via its switch', () => {
    render(<EnvEntryForm open def={emailDef} initial={null} onSubmit={vi.fn()} onClose={vi.fn()} />);
    const tls = screen.getByLabelText('Use TLS') as HTMLInputElement;
    expect(tls.checked).toBe(false);
    fireEvent.click(tls);
    expect(tls.checked).toBe(true);
    fireEvent.click(tls); // toggle back off → covers the 'false' branch
    expect(tls.checked).toBe(false);
  });
});

describe('EnvEntryForm secret helper text', () => {
  it('prompts to keep an existing secret when present', () => {
    render(<EnvEntryForm open def={twilioDef} initial={entry({})} onSubmit={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText('Leave blank to keep existing')).toBeInTheDocument();
  });

  it('marks the secret required when not yet set (edit) and on create', () => {
    const { rerender } = render(
      <EnvEntryForm open def={twilioDef} initial={entry({ secrets: [{ key: 'has_auth_token', present: false }] })} onSubmit={vi.fn()} onClose={vi.fn()} />
    );
    expect(screen.getAllByText('Required').length).toBeGreaterThan(0);
    rerender(<EnvEntryForm open def={twilioDef} initial={null} onSubmit={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getAllByText('Required').length).toBeGreaterThan(0);
  });
});
