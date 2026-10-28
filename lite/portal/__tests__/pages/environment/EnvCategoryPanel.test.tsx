import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GraphQLError } from 'graphql';
import { LITE_CREATE_ENV_ENTRY, LITE_ENV_ENTRIES, LITE_TEST_ENV_ENTRY, type LiteEnvCategoryDef, type LiteEnvEntry } from '../../../graphql/environment';
import { EnvCategoryPanel } from '../../../pages/environment/EnvCategoryPanel';
import { emailCategory, makeEnvEntry, msg91Category } from '../../fixtures';
import { gqlEnvEntry } from '../../gql-results';
import { findRow, findToast, renderWithProviders, type GqlMock } from '../../test-utils';

vi.mock('@duncit/table', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@duncit/table')>();
  const { FakeDuncitTable } = await import('../../fake-table');
  return { ...actual, DuncitTable: FakeDuncitTable };
});

vi.mock('../../../../shared/session', async () => {
  const fixtures = await import('../../fixtures');
  return { useLiteSession: () => fixtures.makeSession({ me: fixtures.makeMe({ is_admin: true, email: 'admin@lite.example' }) }) };
});

const smtp = makeEnvEntry();
const sms = makeEnvEntry({ id: 'env-9', name: 'MSG91 live', category: 'MSG91', description: null, config: [{ key: 'widget_id', value: 'w-1' }], secrets: [{ key: 'has_auth_key', present: true }] });

const entriesQuery = (category: string, rows: LiteEnvEntry[], maxUsageCount = 1): GqlMock => ({
  request: { query: LITE_ENV_ENTRIES, variables: { category } },
  result: { data: { liteEnvEntries: rows.map(gqlEnvEntry) } },
  maxUsageCount,
});
const testMock = (id: string, to: string | null, ok: boolean, message: string): GqlMock => ({
  request: { query: LITE_TEST_ENV_ENTRY, variables: { id, to } },
  result: { data: { liteTestEnvEntry: { __typename: 'LiteEnvTestResult', ok, message } } },
});

const renderPanel = (def: LiteEnvCategoryDef, mocks: GqlMock[]) => renderWithProviders(<EnvCategoryPanel def={def} />, { mocks });

describe('EnvCategoryPanel', () => {
  it("lists the category's entries with an Add button named after it", async () => {
    renderPanel(emailCategory(), [entriesQuery('EMAIL', [smtp])]);
    expect((await findRow('env-1')).getByText('Primary SMTP')).toBeInTheDocument();
    expect(screen.getByTestId('env-add')).toHaveTextContent('Add Email (SMTP)');
  });

  it('creates an entry from the dialog and closes it once saved', async () => {
    const user = userEvent.setup();
    const create: GqlMock = {
      request: {
        query: LITE_CREATE_ENV_ENTRY,
        variables: {
          input: {
            name: 'Primary SMTP',
            description: '',
            is_default: false,
            is_active: true,
            category: 'EMAIL',
            config: [
              { key: 'host', value: 'smtp.example.com' },
              { key: 'port', value: '465' },
              { key: 'password', value: 'pw' },
              { key: 'secure', value: 'false' },
            ],
          },
        },
      },
      result: { data: { liteCreateEnvEntry: gqlEnvEntry(smtp) } },
    };
    renderPanel(emailCategory(), [entriesQuery('EMAIL', []), create, entriesQuery('EMAIL', [smtp])]);
    await user.click(await screen.findByTestId('env-add'));
    await user.type(await screen.findByTestId('env-name'), 'Primary SMTP');
    await user.type(screen.getByTestId('env-config-host'), 'smtp.example.com');
    await user.type(screen.getByTestId('env-config-port'), '465');
    await user.type(screen.getByTestId('env-config-password'), 'pw');
    await user.click(screen.getByTestId('env-entry-dialog-submit'));
    expect(await findToast('success')).toHaveTextContent('Primary SMTP created');
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'New Email (SMTP) entry' })).not.toBeInTheDocument());
    expect(await findRow('env-1')).toBeTruthy();
  });

  it('keeps the dialog and what was typed when the server refuses the entry', async () => {
    const user = userEvent.setup();
    const refused: GqlMock = { request: { query: LITE_CREATE_ENV_ENTRY, variables: () => true }, result: { errors: [new GraphQLError('An entry with this name exists')] } };
    renderPanel(msg91Category(), [entriesQuery('MSG91', []), refused]);
    await user.click(await screen.findByTestId('env-add'));
    await user.type(await screen.findByTestId('env-name'), 'MSG91 live');
    await user.type(screen.getByTestId('env-config-auth_key'), 'key-123');
    await user.click(screen.getByTestId('env-entry-dialog-submit'));
    expect(await findToast('error')).toHaveTextContent('An entry with this name exists');
    expect(screen.getByRole('dialog', { name: 'New MSG91 (SMS sign-in) entry' })).toBeInTheDocument();
    expect(screen.getByTestId('env-name')).toHaveValue('MSG91 live');
  });

  it("asks where to send an EMAIL test, pre-filled with the admin's own address", async () => {
    const user = userEvent.setup();
    renderPanel(emailCategory(), [entriesQuery('EMAIL', [smtp], 2), testMock('env-1', 'admin@lite.example', true, 'Delivered')]);
    await user.click((await findRow('env-1')).getByRole('button', { name: 'Test Primary SMTP' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Send a test email' }));
    expect(dialog.getByText('A real message goes out through Primary SMTP.')).toBeInTheDocument();
    expect(dialog.getByTestId('env-test-dialog-to')).toHaveValue('admin@lite.example');
    await user.click(dialog.getByTestId('env-test-dialog-submit'));
    expect(await findToast('success')).toHaveTextContent('Test passed: Delivered');
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Send a test email' })).not.toBeInTheDocument());
  });

  it('keeps the recipient dialog open when the EMAIL test fails', async () => {
    const user = userEvent.setup();
    renderPanel(emailCategory(), [entriesQuery('EMAIL', [smtp], 2), testMock('env-1', 'admin@lite.example', false, 'Mailbox refused')]);
    await user.click((await findRow('env-1')).getByRole('button', { name: 'Test Primary SMTP' }));
    await user.click(await screen.findByTestId('env-test-dialog-submit'));
    expect(await findToast('error')).toHaveTextContent('Test failed: Mailbox refused');
    expect(screen.getByRole('dialog', { name: 'Send a test email' })).toBeInTheDocument();
  });

  it('closes the recipient dialog from Cancel without testing', async () => {
    const user = userEvent.setup();
    renderPanel(emailCategory(), [entriesQuery('EMAIL', [smtp])]);
    await user.click((await findRow('env-1')).getByRole('button', { name: 'Test Primary SMTP' }));
    await user.click(await screen.findByTestId('env-test-dialog-cancel'));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Send a test email' })).not.toBeInTheDocument());
  });

  it('tests any other category straight away, with no recipient', async () => {
    const user = userEvent.setup();
    renderPanel(msg91Category(), [entriesQuery('MSG91', [sms], 2), testMock('env-9', null, true, 'Widget reachable')]);
    await user.click((await findRow('env-9')).getByRole('button', { name: 'Test MSG91 live' }));
    expect(await findToast('success')).toHaveTextContent('Test passed: Widget reachable');
    expect(screen.queryByRole('dialog', { name: 'Send a test email' })).not.toBeInTheDocument();
  });

  it("opens the edit dialog on the row's entry", async () => {
    const user = userEvent.setup();
    renderPanel(emailCategory(), [entriesQuery('EMAIL', [smtp])]);
    await user.click((await findRow('env-1')).getByRole('button', { name: 'Edit Primary SMTP' }));
    expect(await screen.findByRole('dialog', { name: 'Edit Primary SMTP' })).toBeInTheDocument();
    expect(screen.getByTestId('env-config-host')).toHaveValue('smtp.example.com');
  });

  it('shows the load error in place of the list', async () => {
    renderPanel(emailCategory(), [{ request: { query: LITE_ENV_ENTRIES, variables: { category: 'EMAIL' } }, error: new Error('Vault sealed') }]);
    expect(await screen.findByTestId('query-guard-error')).toHaveTextContent('Vault sealed');
  });
});
