import { describe, expect, it, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import ContactDetailsDialog from '../../src/pages/website/contact-submissions/ContactDetailsDialog';
import type { ContactSubmission } from '../../src/pages/website/contact-submissions/queries';
import { renderWithProviders } from './testkit';

const submission = (over: Partial<ContactSubmission> = {}): ContactSubmission => ({
  id: 'c1',
  name: 'Asha',
  email: 'asha@example.com',
  subject: 'Need help',
  message: 'Hello there',
  attachments: [],
  status: 'NEW',
  created_at: '2026-01-01T10:00:00.000Z',
  ...over,
});

describe('ContactDetailsDialog', () => {
  it('renders nothing when there is no submission', () => {
    renderWithProviders(
      <ContactDetailsDialog submission={null} onClose={vi.fn()} onUpdateStatus={vi.fn()} />,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows subject, message and attachments, then saves a new status', () => {
    const onUpdateStatus = vi.fn();
    const onClose = vi.fn();
    renderWithProviders(
      <ContactDetailsDialog
        submission={submission({
          attachments: ['https://img/one.png', 'https://img/two.png'],
        })}
        onClose={onClose}
        onUpdateStatus={onUpdateStatus}
      />,
    );
    expect(screen.getByText('Need help')).toBeInTheDocument();
    expect(screen.getByText('Hello there')).toBeInTheDocument();
    expect(screen.getByText(/Attachments \(2\)/)).toBeInTheDocument();
    expect(screen.getByAltText('attachment-1')).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByRole('combobox'));
    fireEvent.click(screen.getByRole('option', { name: 'RESOLVED' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onUpdateStatus).toHaveBeenCalledWith('c1', 'RESOLVED');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('falls back to a placeholder title, hides attachments and closes', () => {
    const onClose = vi.fn();
    renderWithProviders(
      <ContactDetailsDialog
        submission={submission({ subject: '', attachments: [] })}
        onClose={onClose}
        onUpdateStatus={vi.fn()}
      />,
    );
    expect(screen.getByText('(no subject)')).toBeInTheDocument();
    expect(screen.queryByText(/Attachments \(/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
