import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { LiteEnvCategoryDef, LiteEnvEntry } from '../../../../graphql/environment';
import { EnvEntryForm, type EnvEntryFormValues } from '../../../../pages/environment/env-entry';
import { emailCategory, makeEnvEntry } from '../../../fixtures';

type Submit = (values: EnvEntryFormValues) => Promise<void>;

interface Options {
  def?: LiteEnvCategoryDef;
  initial?: LiteEnvEntry | null;
  busy?: boolean;
  testing?: boolean;
  onSubmit?: Submit;
  onTest?: (entry: LiteEnvEntry) => void;
}

const form = ({ def = emailCategory(), initial = null, busy = false, testing = false, onSubmit = vi.fn<Submit>(() => Promise.resolve()), onTest = vi.fn() }: Options = {}) => (
  <EnvEntryForm open def={def} initial={initial} busy={busy} testing={testing} onClose={vi.fn()} onSubmit={onSubmit} onTest={onTest} />
);

describe('EnvEntryForm', () => {
  it("asks for a new entry's fields as the server defines them, with the vendor link", () => {
    render(form());
    expect(screen.getByRole('dialog', { name: 'New Email (SMTP) entry' })).toBeInTheDocument();
    const doc = screen.getByRole('link', { name: 'Where to find these: open the Email (SMTP) dashboard' });
    expect(doc).toHaveAttribute('href', 'https://support.example.com/smtp');
    expect(doc).toHaveAttribute('target', '_blank');
    expect(screen.getByRole('heading', { level: 2, name: 'Email (SMTP) settings' })).toBeInTheDocument();
    for (const id of ['env-config-host', 'env-config-port', 'env-config-password']) expect(screen.getByTestId(id)).toBeInTheDocument();
    expect(screen.getByLabelText('Use TLS')).not.toBeChecked();
    expect(screen.queryByTestId('env-dialog-test')).not.toBeInTheDocument();
  });

  it('leaves the vendor link out when the category has none', () => {
    render(form({ def: emailCategory({ docUrl: null }) }));
    expect(screen.queryByTestId('env-dialog-doc-link')).not.toBeInTheDocument();
  });

  it('will not create an entry without its secret, and names the bad port', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn<Submit>(() => Promise.resolve());
    render(form({ onSubmit }));
    await user.type(screen.getByTestId('env-name'), 'Primary SMTP');
    await user.type(screen.getByTestId('env-config-port'), '70000');
    await user.click(screen.getByTestId('env-entry-dialog-submit'));
    expect(await screen.findByText('Password is required')).toBeInTheDocument();
    expect(screen.getByText('Port must be 65535 or less')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits a complete new entry', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn<Submit>(() => Promise.resolve());
    render(form({ onSubmit }));
    await user.type(screen.getByTestId('env-name'), 'Primary SMTP');
    await user.type(screen.getByTestId('env-config-host'), 'smtp.example.com');
    await user.type(screen.getByTestId('env-config-port'), '587');
    await user.type(screen.getByTestId('env-config-password'), 'app-password');
    await user.click(screen.getByLabelText('Use TLS'));
    await user.click(screen.getByTestId('env-entry-dialog-submit'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]?.[0]).toEqual({
      name: 'Primary SMTP',
      description: '',
      is_default: false,
      is_active: true,
      config: { host: 'smtp.example.com', port: '587', password: 'app-password', secure: 'true' },
    });
  });

  it('edits a stored entry: values filled, secret kept, and a Test button that proves it', async () => {
    const user = userEvent.setup();
    const onTest = vi.fn();
    const onSubmit = vi.fn<Submit>(() => Promise.resolve());
    const entry = makeEnvEntry();
    render(form({ initial: entry, onTest, onSubmit }));
    expect(screen.getByRole('dialog', { name: 'Edit Primary SMTP' })).toBeInTheDocument();
    expect(screen.getByTestId('env-name')).toHaveValue('Primary SMTP');
    expect(screen.getByTestId('env-config-port')).toHaveValue('587');
    expect(screen.getByLabelText('Use TLS')).toBeChecked();
    expect(screen.getByText('Leave blank to keep the stored value')).toBeInTheDocument();

    await user.click(screen.getByTestId('env-dialog-test'));
    expect(onTest).toHaveBeenCalledWith(entry);

    await user.click(screen.getByTestId('env-entry-dialog-submit'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
  });

  it('shows Testing… and blocks a second test while one runs', () => {
    render(form({ initial: makeEnvEntry(), testing: true }));
    expect(screen.getByTestId('env-dialog-test')).toHaveTextContent('Testing…');
    expect(screen.getByTestId('env-dialog-test')).toBeDisabled();
  });

  it('locks the fields and the Test button while saving', () => {
    render(form({ initial: makeEnvEntry(), busy: true }));
    for (const id of ['env-name', 'env-description', 'env-default', 'env-active', 'env-config-host', 'env-config-password']) {
      expect(screen.getByTestId(id), id).toBeDisabled();
    }
    expect(screen.getByTestId('env-dialog-test')).toBeDisabled();
  });
});
