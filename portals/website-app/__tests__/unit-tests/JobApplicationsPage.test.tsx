import { describe, expect, it } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import JobApplicationsPage from '../../src/pages/website/job-applications';
import { renderWithProviders } from '../testkit';
import {
  jobApplicationsTableMock,
  makeJobApplication,
  updateJobApplicationStatusMock,
} from '../mocks';

const rows = [
  makeJobApplication({ id: 'a', name: 'Nia' }),
  makeJobApplication({ id: 'b', name: 'Omar', status: 'HIRED' }),
];

describe('JobApplicationsPage', () => {
  it('lists applications and opens the detail dialog from the row action', async () => {
    renderWithProviders(<JobApplicationsPage />, {
      mocks: [jobApplicationsTableMock(rows)],
    });
    expect(await screen.findByText('Job Applications')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Nia')).toBeInTheDocument());
    fireEvent.click(screen.getAllByRole('button', { name: 'view' })[0]);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('updates status from the dialog then closes it', async () => {
    renderWithProviders(<JobApplicationsPage />, {
      mocks: [jobApplicationsTableMock(rows), updateJobApplicationStatusMock('a', 'SHORTLISTED')],
    });
    await waitFor(() => expect(screen.getByText('Nia')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Nia'));
    const dialog = await screen.findByRole('dialog');
    fireEvent.mouseDown(within(dialog).getByRole('combobox'));
    fireEvent.click(screen.getByRole('option', { name: 'SHORTLISTED' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('closes the detail dialog via the Close button', async () => {
    renderWithProviders(<JobApplicationsPage />, {
      mocks: [jobApplicationsTableMock(rows)],
    });
    await waitFor(() => expect(screen.getByText('Nia')).toBeInTheDocument());
    fireEvent.click(screen.getAllByRole('button', { name: 'view' })[0]);
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
