import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ConfigField from '../../src/pages/environment/env-entry/ConfigField';
import FieldInfo from '../../src/pages/environment/env-entry/FieldInfo';
import { makeEnvFieldDef } from '../mocks/env-entry.mock';

const smtpHost = makeEnvFieldDef({
  name: 'host',
  label: 'SMTP Host',
  description: 'The SMTP server every product email is handed to.',
  envKey: 'SMTP_HOST',
  usedIn: ['server/src/services/email/email.provider.ts'],
});

describe('FieldInfo', () => {
  it('renders nothing when the registry says nothing about the field', () => {
    const { container } = render(<FieldInfo field={makeEnvFieldDef()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('is a keyboard-reachable button whose tooltip says why the value is used, its env key and its readers', async () => {
    render(<FieldInfo field={smtpHost} />);
    const button = screen.getByRole('button', { name: /About SMTP Host/ });
    // A native button is in the tab order (tabIndex 0) and takes focus.
    expect(button).toHaveProperty('tabIndex', 0);
    button.focus();
    expect(button).toHaveFocus();
    fireEvent.mouseOver(button);
    expect(await screen.findByText('The SMTP server every product email is handed to.')).toBeInTheDocument();
    expect(screen.getByText('SMTP_HOST')).toBeInTheDocument();
    expect(screen.getByText('Read by')).toBeInTheDocument();
    expect(screen.getByText('server/src/services/email/email.provider.ts')).toBeInTheDocument();
  });

  it('falls back to the category readers when nothing reads the field by its env key', async () => {
    const secure = makeEnvFieldDef({ name: 'secure', label: 'Use TLS', description: 'TLS from the first byte.', usedIn: [] });
    render(<FieldInfo field={secure} categoryUsedIn={['server/src/services/email/email.provider.ts']} />);
    fireEvent.mouseOver(screen.getByRole('button', { name: /About Use TLS/ }));
    expect(await screen.findByText('Read by (through its category)')).toBeInTheDocument();
    expect(screen.getByText('server/src/services/email/email.provider.ts')).toBeInTheDocument();
  });
});

describe('ConfigField with registry info', () => {
  it('puts the info button beside a text field and keeps the secret eye toggle', () => {
    const apiKey = makeEnvFieldDef({ name: 'api_key', label: 'API Key', secret: true, description: 'Authenticates every request.' });
    render(<ConfigField field={apiKey} value="sk" helperText="" onChange={vi.fn()} onBlur={vi.fn()} onToggleBool={vi.fn()} />);
    expect(screen.getByRole('button', { name: /About API Key/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show API Key' })).toBeInTheDocument();
  });

  it('puts the info button beside a switch', () => {
    const tls = makeEnvFieldDef({ name: 'secure', label: 'Use TLS', bool: true, description: 'TLS from the first byte.' });
    render(<ConfigField field={tls} value="true" helperText="" onChange={vi.fn()} onBlur={vi.fn()} onToggleBool={vi.fn()} />);
    expect(screen.getByRole('checkbox', { name: 'Use TLS' })).toBeChecked();
    expect(screen.getByRole('button', { name: /About Use TLS/ })).toBeInTheDocument();
  });
});
