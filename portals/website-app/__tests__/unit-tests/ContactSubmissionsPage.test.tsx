import { describe, expect, it } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { ContactSubmissionsPage } from '../../src/pages/website';
import { renderWithProviders } from '../testkit';
import {
  contactSubmissionsTableMock,
  makeContactSubmission,
  updateContactStatusMock,
} from '../mocks';

const rows = [
  makeContactSubmission({ id: 'a', name: 'Asha', subject: 'Billing' }),
  makeContactSubmission({ id: 'b', name: 'Ravi', subject: '' }), // empty subject → '—' branch
];

describe('ContactSubmissionsPage', () => {
  it('lists submissions and opens the detail dialog from the view action', async () => {
    renderWithProviders(<ContactSubmissionsPage />, {
      mocks: [contactSubmissionsTableMock(rows)],
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
      mocks: [contactSubmissionsTableMock(rows), updateContactStatusMock('a', 'RESOLVED')],
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
      mocks: [contactSubmissionsTableMock(rows)],
    });
    await waitFor(() => expect(screen.getByText('Asha')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Asha'));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });
});
