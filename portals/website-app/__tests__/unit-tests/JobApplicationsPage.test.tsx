import { describe, expect, it } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import JobApplicationsPage from '../../src/pages/website/job-applications';
import {
  JOB_APPLICATIONS_TABLE,
  UPDATE_JOB_APPLICATION_STATUS,
  type JobApplication,
} from '../../src/pages/website/job-applications/queries';
import { renderWithProviders, tableMock } from './testkit';

const row = (over: Partial<JobApplication>): JobApplication => ({
  id: 'j1',
  role_content_id: 'r1',
  role_title: 'Engineer',
  name: 'Nia',
  email: 'nia@example.com',
  phone: '+91999',
  resume_url: 'https://cv/nia.pdf',
  portfolio_url: 'https://port/nia',
  cover_note: 'Note',
  status: 'NEW',
  created_at: '2026-01-01T00:00:00.000Z',
  ...over,
});

const rows = [row({ id: 'a', name: 'Nia' }), row({ id: 'b', name: 'Omar', status: 'HIRED' })];

const updateMock = {
  request: { query: UPDATE_JOB_APPLICATION_STATUS, variables: { id: 'a', status: 'SHORTLISTED' as const } },
  result: { data: { updateJobApplicationStatus: { id: 'a', status: 'SHORTLISTED' } } },
};

describe('JobApplicationsPage', () => {
  it('lists applications and opens the detail dialog from the row action', async () => {
    renderWithProviders(<JobApplicationsPage />, {
      mocks: [tableMock(JOB_APPLICATIONS_TABLE, 'jobApplicationsTable', rows)],
    });
    expect(await screen.findByText('Job Applications')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Nia')).toBeInTheDocument());
    fireEvent.click(screen.getAllByRole('button', { name: 'view' })[0]);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('updates status from the dialog then closes it', async () => {
    renderWithProviders(<JobApplicationsPage />, {
      mocks: [tableMock(JOB_APPLICATIONS_TABLE, 'jobApplicationsTable', rows), updateMock],
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
      mocks: [tableMock(JOB_APPLICATIONS_TABLE, 'jobApplicationsTable', rows)],
    });
    await waitFor(() => expect(screen.getByText('Nia')).toBeInTheDocument());
    fireEvent.click(screen.getAllByRole('button', { name: 'view' })[0]);
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
