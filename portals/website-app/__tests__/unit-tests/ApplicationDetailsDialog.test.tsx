import { describe, expect, it, vi } from 'vitest';
import { screen, fireEvent, within } from '@testing-library/react';
import ApplicationDetailsDialog from '../../src/pages/website/job-applications/ApplicationDetailsDialog';
import type { JobApplication } from '../../src/pages/website/job-applications/queries';
import { renderWithProviders } from './testkit';

const application = (over: Partial<JobApplication> = {}): JobApplication => ({
  id: 'j1',
  role_content_id: 'r1',
  role_title: 'Engineer',
  name: 'Nia',
  email: 'nia@example.com',
  phone: '+91999',
  resume_url: 'https://cv/nia.pdf',
  portfolio_url: 'https://port/nia',
  cover_note: 'Excited to apply',
  status: 'NEW',
  created_at: '2026-01-01T00:00:00.000Z',
  ...over,
});

describe('ApplicationDetailsDialog', () => {
  it('renders nothing without an application', () => {
    renderWithProviders(
      <ApplicationDetailsDialog application={null} onClose={vi.fn()} onUpdateStatus={vi.fn()} />,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows full contact links and updates the status', () => {
    const onUpdateStatus = vi.fn();
    renderWithProviders(
      <ApplicationDetailsDialog
        application={application()}
        onClose={vi.fn()}
        onUpdateStatus={onUpdateStatus}
      />,
    );
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Engineer')).toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: 'nia@example.com' })).toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: '+91999' })).toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: 'https://cv/nia.pdf' })).toBeInTheDocument();

    fireEvent.mouseDown(within(dialog).getByRole('combobox'));
    fireEvent.click(screen.getByRole('option', { name: 'SHORTLISTED' }));
    expect(onUpdateStatus).toHaveBeenCalledWith('j1', 'SHORTLISTED');
  });

  it('renders placeholders for missing phone/resume/portfolio and closes', () => {
    const onClose = vi.fn();
    renderWithProviders(
      <ApplicationDetailsDialog
        application={application({ phone: '', resume_url: '', portfolio_url: '', cover_note: '' })}
        onClose={onClose}
        onUpdateStatus={vi.fn()}
      />,
    );
    // Missing fields collapse to the "—" placeholder from Row.
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(1);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
