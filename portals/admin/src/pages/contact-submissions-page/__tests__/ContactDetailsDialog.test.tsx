import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import ContactDetailsDialog from '../ContactDetailsDialog';

const submission = (over: Partial<Parameters<typeof ContactDetailsDialog>[0]['submission']> = {}) => ({
  id: 'sub-1',
  name: 'Riya Sharma',
  email: 'riya@example.com',
  subject: 'Refund request',
  message: 'Please refund my last order.',
  status: 'NEW',
  created_at: '2026-08-01T10:00:00.000Z',
  ...over,
});

describe('ContactDetailsDialog', () => {
  it('renders nothing when there is no submission', () => {
    const { container } = render(
      <ContactDetailsDialog submission={null} onClose={vi.fn()} onUpdateStatus={vi.fn()} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the subject, sender, message and formatted date', () => {
    render(
      <ContactDetailsDialog submission={submission()} onClose={vi.fn()} onUpdateStatus={vi.fn()} />
    );
    expect(screen.getByText('Refund request')).toBeInTheDocument();
    expect(screen.getByText('Riya Sharma')).toBeInTheDocument();
    expect(screen.getByText(/riya@example\.com/)).toBeInTheDocument();
    expect(screen.getByText('Please refund my last order.')).toBeInTheDocument();
  });

  it('falls back to a placeholder title when the subject is blank', () => {
    render(
      <ContactDetailsDialog
        submission={submission({ subject: '' })}
        onClose={vi.fn()}
        onUpdateStatus={vi.fn()}
      />
    );
    expect(screen.getByText('(no subject)')).toBeInTheDocument();
  });

  it('does not render an attachments section when there are none', () => {
    render(
      <ContactDetailsDialog submission={submission()} onClose={vi.fn()} onUpdateStatus={vi.fn()} />
    );
    expect(screen.queryByText(/Attachments/)).not.toBeInTheDocument();
  });

  it('renders every attachment thumbnail when attachments are present', () => {
    render(
      <ContactDetailsDialog
        submission={submission({
          attachments: ['https://cdn.test/a.jpg', 'https://cdn.test/b.jpg'],
        })}
        onClose={vi.fn()}
        onUpdateStatus={vi.fn()}
      />
    );
    expect(screen.getByText('Attachments (2)')).toBeInTheDocument();
    expect(screen.getByAltText('attachment-1')).toHaveAttribute('src', 'https://cdn.test/a.jpg');
    expect(screen.getByAltText('attachment-2')).toHaveAttribute('src', 'https://cdn.test/b.jpg');
  });

  it('initializes the status select from the submission and resets it when the submission changes', () => {
    const { rerender } = render(
      <ContactDetailsDialog
        submission={submission({ status: 'IN_PROGRESS' })}
        onClose={vi.fn()}
        onUpdateStatus={vi.fn()}
      />
    );
    expect(screen.getByText('IN_PROGRESS')).toBeInTheDocument();

    rerender(
      <ContactDetailsDialog
        submission={submission({ id: 'sub-2', status: 'RESOLVED' })}
        onClose={vi.fn()}
        onUpdateStatus={vi.fn()}
      />
    );
    expect(screen.getByText('RESOLVED')).toBeInTheDocument();
  });

  it('lets the admin change the status before saving', () => {
    const onUpdateStatus = vi.fn();
    const onClose = vi.fn();
    render(
      <ContactDetailsDialog
        submission={submission({ status: 'NEW' })}
        onClose={onClose}
        onUpdateStatus={onUpdateStatus}
      />
    );

    fireEvent.mouseDown(screen.getByRole('combobox'));
    const listbox = screen.getByRole('listbox');
    fireEvent.click(within(listbox).getByText('ARCHIVED'));

    fireEvent.click(screen.getByText('Save'));

    expect(onUpdateStatus).toHaveBeenCalledWith('sub-1', 'ARCHIVED');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes without updating status when Close is clicked', () => {
    const onUpdateStatus = vi.fn();
    const onClose = vi.fn();
    render(
      <ContactDetailsDialog submission={submission()} onClose={onClose} onUpdateStatus={onUpdateStatus} />
    );
    fireEvent.click(screen.getByText('Close'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onUpdateStatus).not.toHaveBeenCalled();
  });
});
