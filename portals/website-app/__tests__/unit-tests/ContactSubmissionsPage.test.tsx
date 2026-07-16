import { describe, expect, it } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { ContactSubmissionsPage } from '../../src/pages/website';
import {
  CONTACT_TABLE,
  UPDATE_CONTACT_STATUS,
  type ContactSubmission,
} from '../../src/pages/website/contact-submissions/queries';
import { renderWithProviders, tableMock } from './testkit';

const row = (over: Partial<ContactSubmission>): ContactSubmission => ({
  id: 'c1',
  name: 'Asha',
  email: 'asha@example.com',
  subject: 'Need help',
  message: 'Hi',
  attachments: [],
  status: 'NEW',
  created_at: '2026-01-01T10:00:00.000Z',
  ...over,
});

const rows = [
  row({ id: 'a', name: 'Asha', subject: 'Billing' }),
  row({ id: 'b', name: 'Ravi', subject: '' }), // empty subject → '—' branch
];

const updateMock = {
  request: {
    query: UPDATE_CONTACT_STATUS,
    variables: { id: 'a', status: 'RESOLVED' as const },
  },
  result: { data: { updateContactStatus: { id: 'a', status: 'RESOLVED' } } },
};

describe('ContactSubmissionsPage', () => {
  it('lists submissions and opens the detail dialog from the view action', async () => {
    renderWithProviders(<ContactSubmissionsPage />, {
      mocks: [tableMock(CONTACT_TABLE, 'contactSubmissionsTable', rows)],
    });
    expect(await screen.findByText('Contact Submission')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Asha')).toBeInTheDocument());
    expect(screen.getByText('Ravi')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'view' })[0]);
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Billing')).toBeInTheDocument();
  });

  it('updates status from the dialog and refetches the list', async () => {
    renderWithProviders(<ContactSubmissionsPage />, {
      mocks: [tableMock(CONTACT_TABLE, 'contactSubmissionsTable', rows), updateMock],
    });
    await waitFor(() => expect(screen.getByText('Asha')).toBeInTheDocument());
    fireEvent.click(screen.getAllByRole('button', { name: 'view' })[0]);
    const dialog = await screen.findByRole('dialog');
    fireEvent.mouseDown(within(dialog).getByRole('combobox'));
    fireEvent.click(screen.getByRole('option', { name: 'RESOLVED' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('opens the dialog on a row click', async () => {
    renderWithProviders(<ContactSubmissionsPage />, {
      mocks: [tableMock(CONTACT_TABLE, 'contactSubmissionsTable', rows)],
    });
    await waitFor(() => expect(screen.getByText('Asha')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Asha'));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });
});
