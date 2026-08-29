import { describe, expect, it, vi, afterEach } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { logs } from '@duncit/logs';
import { renderWithProviders } from '../../../__tests__/testkit';
import ReviewDialog from '../ReviewDialog';
import type { ApprovalRequest } from '../helpers';

const makeRequest = (over: Partial<ApprovalRequest> = {}): ApprovalRequest => ({
  id: 'req-1',
  type: 'VENUE_CHANGE_REQUEST',
  status: 'PENDING',
  source_portal: null,
  title: 'Venue change',
  summary: null,
  details: [],
  kind: null,
  subject_name: 'Alice',
  subject_email: 'alice@duncit.com',
  subject_phone: null,
  requested_by_name: 'Bob',
  reviewed_by_name: null,
  reviewed_at: null,
  review_notes: null,
  created_at: '2026-01-02T08:00:00.000Z',
  updated_at: '2026-01-02T08:00:00.000Z',
  ...over,
});

const formatDateTime = (s: string) => `fmt<${s}>`;

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ReviewDialog — no request', () => {
  it('renders nothing', () => {
    const { container } = renderWithProviders(
      <ReviewDialog
        request={null}
        saving={false}
        error={null}
        formatDateTime={formatDateTime}
        onClose={vi.fn()}
        onApprove={vi.fn()}
        onDeny={vi.fn()}
      />,
    );
    expect(container).toHaveTextContent('');
  });
});

describe('ReviewDialog — pending request', () => {
  it('titles the dialog from the request title, falling back when absent', () => {
    renderWithProviders(
      <ReviewDialog
        request={makeRequest({ title: null })}
        saving={false}
        error={null}
        formatDateTime={formatDateTime}
        onClose={vi.fn()}
        onApprove={vi.fn()}
        onDeny={vi.fn()}
      />,
    );
    expect(screen.getByText('Review Request')).toBeInTheDocument();
  });

  it('approves directly from the Approve button', () => {
    const onApprove = vi.fn();
    renderWithProviders(
      <ReviewDialog
        request={makeRequest()}
        saving={false}
        error={null}
        formatDateTime={formatDateTime}
        onClose={vi.fn()}
        onApprove={onApprove}
        onDeny={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    expect(onApprove).toHaveBeenCalledWith('req-1');
  });

  it('closes via the Close action', () => {
    const onClose = vi.fn();
    renderWithProviders(
      <ReviewDialog
        request={makeRequest()}
        saving={false}
        error={null}
        formatDateTime={formatDateTime}
        onClose={onClose}
        onApprove={vi.fn()}
        onDeny={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('requires a first Deny press to reveal the reason field before confirming', () => {
    const onDeny = vi.fn();
    renderWithProviders(
      <ReviewDialog
        request={makeRequest()}
        saving={false}
        error={null}
        formatDateTime={formatDateTime}
        onClose={vi.fn()}
        onApprove={vi.fn()}
        onDeny={onDeny}
      />,
    );
    expect(screen.queryByLabelText('Reason for denial')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Deny' }));
    expect(onDeny).not.toHaveBeenCalled();
    const field = screen.getByLabelText('Reason for denial');
    expect(field).toBeInTheDocument();

    // Confirm Deny stays disabled until a reason is typed.
    const confirm = screen.getByRole('button', { name: 'Confirm Deny' });
    expect(confirm).toBeDisabled();

    fireEvent.change(field, { target: { value: '  Not eligible  ' } });
    expect(confirm).toBeEnabled();
    fireEvent.click(confirm);
    expect(onDeny).toHaveBeenCalledWith('req-1', 'Not eligible');
  });

  it('disables Approve once denying has started', () => {
    renderWithProviders(
      <ReviewDialog
        request={makeRequest()}
        saving={false}
        error={null}
        formatDateTime={formatDateTime}
        onClose={vi.fn()}
        onApprove={vi.fn()}
        onDeny={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Deny' }));
    expect(screen.getByRole('button', { name: 'Approve' })).toBeDisabled();
  });

  it('disables every action while saving, and ignores a backdrop close', () => {
    const onClose = vi.fn();
    renderWithProviders(
      <ReviewDialog
        request={makeRequest()}
        saving
        error={null}
        formatDateTime={formatDateTime}
        onClose={onClose}
        onApprove={vi.fn()}
        onDeny={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Close' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Deny' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Approve' })).toBeDisabled();

    // The dialog's own close affordance (the X icon) must no-op while saving.
    fireEvent.click(screen.getByRole('button', { name: 'Close', hidden: true }) ?? document.body);
    fireEvent.click(screen.getAllByRole('button', { name: /close/i })[0]);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('calls onClose from the dialog X icon when not saving', () => {
    const onClose = vi.fn();
    renderWithProviders(
      <ReviewDialog
        request={makeRequest()}
        saving={false}
        error={null}
        formatDateTime={formatDateTime}
        onClose={onClose}
        onApprove={vi.fn()}
        onDeny={vi.fn()}
      />,
    );
    const closeButtons = screen.getAllByRole('button', { name: /close/i });
    fireEvent.click(closeButtons[closeButtons.length - 1]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows the operation error passed in by the page', () => {
    renderWithProviders(
      <ReviewDialog
        request={makeRequest()}
        saving={false}
        error="Failed to deny"
        formatDateTime={formatDateTime}
        onClose={vi.fn()}
        onApprove={vi.fn()}
        onDeny={vi.fn()}
      />,
    );
    expect(screen.getByText('Failed to deny')).toBeInTheDocument();
  });

  it('resets the denying state and notes when the active request changes', () => {
    const { rerender } = renderWithProviders(
      <ReviewDialog
        request={makeRequest({ id: 'req-1' })}
        saving={false}
        error={null}
        formatDateTime={formatDateTime}
        onClose={vi.fn()}
        onApprove={vi.fn()}
        onDeny={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Deny' }));
    fireEvent.change(screen.getByLabelText('Reason for denial'), { target: { value: 'Some reason' } });
    expect(screen.getByRole('button', { name: 'Confirm Deny' })).toBeInTheDocument();

    rerender(
      <ReviewDialog
        request={makeRequest({ id: 'req-2' })}
        saving={false}
        error={null}
        formatDateTime={formatDateTime}
        onClose={vi.fn()}
        onApprove={vi.fn()}
        onDeny={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Deny' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Reason for denial')).not.toBeInTheDocument();
  });

  it('logs when a confirmed deny rejects instead of dropping the failure', async () => {
    const errorSpy = vi.spyOn(logs.portal.admin, 'error').mockImplementation(() => undefined);
    const onDeny = vi.fn().mockRejectedValue(new Error('network down'));
    renderWithProviders(
      <ReviewDialog
        request={makeRequest()}
        saving={false}
        error={null}
        formatDateTime={formatDateTime}
        onClose={vi.fn()}
        onApprove={vi.fn()}
        onDeny={onDeny}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Deny' }));
    fireEvent.change(screen.getByLabelText('Reason for denial'), { target: { value: 'reason' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Deny' }));

    await waitFor(() =>
      expect(errorSpy).toHaveBeenCalledWith(
        'ReviewDialog',
        'handleDeny',
        expect.objectContaining({ requestId: 'req-1', msg: 'onDeny rejected' }),
      ),
    );
  });
});

describe('ReviewDialog — reviewed request', () => {
  it('shows only a single contained Close action', () => {
    const onClose = vi.fn();
    renderWithProviders(
      <ReviewDialog
        request={makeRequest({ status: 'APPROVED', reviewed_by_name: 'Admin' })}
        saving={false}
        error={null}
        formatDateTime={formatDateTime}
        onClose={onClose}
        onApprove={vi.fn()}
        onDeny={vi.fn()}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Deny' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
