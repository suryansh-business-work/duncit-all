import '../helpers/agGridEnv';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import EmailTemplatesPage from '@/pages/email-templates';
import { CREATE, DELETE, STARTER_MJML, TEMPLATES, TEMPLATES_TABLE, type EmailTemplateRow } from '@/api/emailTemplates.gql';
import { renderWithApollo } from '../helpers/renderWithApollo';

const row: EmailTemplateRow = {
  template_id: 't1',
  slug: 'venue-welcome',
  name: 'Venue Welcome',
  subject: 'Welcome aboard',
  target: 'VENUE',
  is_active: true,
  created_at: '2026-01-04T09:00:00.000Z',
  updated_at: '2026-04-21T09:00:00.000Z',
};

const tableMock = (rows: EmailTemplateRow[]): MockedResponse => ({
  request: { query: TEMPLATES_TABLE, variables: () => true },
  result: { data: { crmEmailTemplatesTable: { total: rows.length, rows } } },
  maxUsageCount: 10,
});

const listRefetch: MockedResponse = {
  request: { query: TEMPLATES },
  result: { data: { emailTemplates: [] } },
  maxUsageCount: 5,
};

const renderPage = (mocks: MockedResponse[]) => renderWithApollo(<EmailTemplatesPage />, mocks, { route: '/email-templates' });

beforeEach(() => {
  globalThis.localStorage.clear();
});

describe('EmailTemplatesPage', () => {
  it('lists templates and opens one for editing', async () => {
    renderPage([tableMock([row])]);

    expect(await screen.findByRole('heading', { name: 'Email Templates' })).toBeInTheDocument();
    fireEvent.click(await screen.findByLabelText('Edit Venue Welcome'));

    expect(screen.getByTestId('location')).toHaveTextContent('/email-templates/t1');
  });

  it('creates a template and jumps to its editor', async () => {
    renderPage([
      tableMock([row]),
      {
        request: {
          query: CREATE,
          variables: { input: { slug: 'host-intro', name: 'Host intro', subject: 'Hello host', target: 'HOST', mjml: STARTER_MJML } },
        },
        result: { data: { createEmailTemplate: { template_id: 'tpl-new' } } },
      },
    ]);
    await screen.findByText('Venue Welcome');

    fireEvent.click(screen.getByRole('button', { name: 'New template' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'New email template' }));
    fireEvent.click(dialog.getByText('Host lead emails'));
    fireEvent.change(dialog.getByLabelText(/^Name/), { target: { value: 'Host intro' } });
    fireEvent.change(dialog.getByLabelText(/^Subject/), { target: { value: 'Hello host' } });
    fireEvent.click(dialog.getByRole('button', { name: 'Create' }));

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/email-templates/tpl-new'));
  });

  it('closes the new-template dialog on Cancel', async () => {
    renderPage([tableMock([row])]);
    await screen.findByText('Venue Welcome');

    fireEvent.click(screen.getByRole('button', { name: 'New template' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('deletes a template after confirmation and says so', async () => {
    const remove = vi.fn(() => ({ data: { deleteEmailTemplate: true } }));
    renderPage([tableMock([row]), listRefetch, { request: { query: DELETE, variables: { id: 't1' } }, result: remove }]);

    fireEvent.click(await screen.findByLabelText('Delete Venue Welcome'));
    expect(await screen.findByText('Delete "Venue Welcome"? This cannot be undone.')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));

    expect(await screen.findByText('Template deleted')).toBeInTheDocument();
    expect(remove).toHaveBeenCalled();
    fireEvent.keyDown(document.body, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByText('Template deleted')).toBeNull());
  });

  it('reports a failed delete, and backs out without deleting', async () => {
    renderPage([tableMock([row]), { request: { query: DELETE, variables: { id: 't1' } }, error: new Error('Template is in use') }]);

    fireEvent.click(await screen.findByLabelText('Delete Venue Welcome'));
    fireEvent.click(await screen.findByTestId('confirm-dialog-cancel'));
    await waitFor(() => expect(screen.queryByTestId('confirm-dialog-cancel')).toBeNull());

    fireEvent.click(screen.getByLabelText('Delete Venue Welcome'));
    fireEvent.click(await screen.findByTestId('confirm-dialog-confirm'));

    expect(await screen.findByText('Template is in use')).toBeInTheDocument();
  });
});
