import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GraphQLError } from 'graphql';
import { LITE_EMAIL_TEMPLATES, LITE_SEND_TEST_EMAIL, LITE_UPDATE_EMAIL_TEMPLATE } from '../../../graphql/email';
import { EmailTemplatesPage } from '../../../pages/email-templates';
import { makeTemplate } from '../../fixtures';
import { gqlTemplate } from '../../gql-results';
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

const template = makeTemplate();
const templatesQuery: GqlMock = { request: { query: LITE_EMAIL_TEMPLATES }, result: { data: { liteEmailTemplates: [gqlTemplate(template)] } }, maxUsageCount: 3 };

const update = (input: { subject: string; body: string; enabled: boolean }, saved = template): GqlMock => ({
  request: { query: LITE_UPDATE_EMAIL_TEMPLATE, variables: { key: 'registration_confirmed', input } },
  result: { data: { liteUpdateEmailTemplate: gqlTemplate({ ...saved, ...input }) } },
});
const sendTest = (ok: boolean, message: string): GqlMock => ({
  request: { query: LITE_SEND_TEST_EMAIL, variables: { template_key: 'registration_confirmed', to: 'admin@lite.example' } },
  result: { data: { liteSendTestEmail: { __typename: 'LiteEnvTestResult', ok, message } } },
});

const openTestDialog = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click((await findRow('tpl-1')).getByRole('button', { name: 'Send a test of Registration confirmed' }));
  return within(await screen.findByRole('dialog', { name: 'Send a test email' }));
};

describe('EmailTemplatesPage', () => {
  it('lists the templates under the page header', async () => {
    renderWithProviders(<EmailTemplatesPage />, { mocks: [templatesQuery] });
    expect(screen.getByRole('heading', { level: 1, name: 'Email templates' })).toBeInTheDocument();
    expect((await findRow('tpl-1')).getByText('registration_confirmed')).toBeInTheDocument();
  });

  it('disables a template from its switch, keeping its subject and body', async () => {
    const user = userEvent.setup();
    renderWithProviders(<EmailTemplatesPage />, { mocks: [templatesQuery, update({ subject: template.subject, body: template.body, enabled: false })] });
    await user.click((await findRow('tpl-1')).getByRole('switch', { name: 'Enable Registration confirmed' }));
    expect(await findToast('success')).toHaveTextContent('Registration confirmed is disabled');
  });

  it('enables a disabled template', async () => {
    const user = userEvent.setup();
    const off = makeTemplate({ enabled: false });
    const offQuery: GqlMock = { request: { query: LITE_EMAIL_TEMPLATES }, result: { data: { liteEmailTemplates: [gqlTemplate(off)] } }, maxUsageCount: 2 };
    renderWithProviders(<EmailTemplatesPage />, { mocks: [offQuery, update({ subject: off.subject, body: off.body, enabled: true }, off)] });
    await user.click((await findRow('tpl-1')).getByRole('switch', { name: 'Enable Registration confirmed' }));
    expect(await findToast('success')).toHaveTextContent('Registration confirmed is enabled');
  });

  it('saves an edited template and closes the editor', async () => {
    const user = userEvent.setup();
    renderWithProviders(<EmailTemplatesPage />, { mocks: [templatesQuery, update({ subject: 'Confirmed: {event_title}', body: template.body, enabled: true })] });
    await user.click((await findRow('tpl-1')).getByRole('button', { name: 'Edit Registration confirmed' }));
    const subject = await screen.findByTestId('template-subject');
    await user.clear(subject);
    await user.type(subject, 'Confirmed: {{event_title}');
    await user.click(screen.getByTestId('email-template-dialog-submit'));
    expect(await findToast('success')).toHaveTextContent('Registration confirmed saved');
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Edit Registration confirmed' })).not.toBeInTheDocument());
  });

  it("sends a test to the admin's own address and closes the dialog when it passes", async () => {
    const user = userEvent.setup();
    renderWithProviders(<EmailTemplatesPage />, { mocks: [templatesQuery, sendTest(true, 'Queued for admin@lite.example')] });
    const dialog = await openTestDialog(user);
    expect(dialog.getByText('The placeholders are filled with sample values.')).toBeInTheDocument();
    expect(dialog.getByTestId('template-test-dialog-to')).toHaveValue('admin@lite.example');
    await user.click(dialog.getByTestId('template-test-dialog-submit'));
    expect(await findToast('success')).toHaveTextContent('Test passed: Queued for admin@lite.example');
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Send a test email' })).not.toBeInTheDocument());
  });

  it("keeps the dialog open with the server's reason when the test fails", async () => {
    const user = userEvent.setup();
    renderWithProviders(<EmailTemplatesPage />, { mocks: [templatesQuery, sendTest(false, 'No mailbox configured')] });
    const dialog = await openTestDialog(user);
    await user.click(dialog.getByTestId('template-test-dialog-submit'));
    expect(await findToast('error')).toHaveTextContent('Test failed: No mailbox configured');
    expect(screen.getByRole('dialog', { name: 'Send a test email' })).toBeInTheDocument();
  });

  it('reports a test the API refused to run', async () => {
    const user = userEvent.setup();
    const refused: GqlMock = {
      request: { query: LITE_SEND_TEST_EMAIL, variables: { template_key: 'registration_confirmed', to: 'admin@lite.example' } },
      result: { errors: [new GraphQLError('Template disabled')] },
    };
    renderWithProviders(<EmailTemplatesPage />, { mocks: [templatesQuery, refused] });
    const dialog = await openTestDialog(user);
    await user.click(dialog.getByTestId('template-test-dialog-submit'));
    expect(await findToast('error')).toHaveTextContent('Template disabled');
  });

  it('shows the load error in place of the list', async () => {
    renderWithProviders(<EmailTemplatesPage />, { mocks: [{ request: { query: LITE_EMAIL_TEMPLATES }, error: new Error('Templates unavailable') }] });
    expect(await screen.findByTestId('query-guard-error')).toHaveTextContent('Templates unavailable');
  });
});
