import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import ReviewDetails from '../ReviewDetails';
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

describe('ReviewDetails — pending request', () => {
  it('shows the status chip and hides the reviewed banner', () => {
    render(<ReviewDetails request={makeRequest()} formatDateTime={formatDateTime} />);
    expect(screen.getByText('PENDING')).toBeInTheDocument();
    expect(screen.queryByText(/by /)).not.toBeInTheDocument();
  });

  it('does not render a kind or source-portal chip when both are absent', () => {
    const { container } = render(<ReviewDetails request={makeRequest()} formatDateTime={formatDateTime} />);
    // Only the status chip should be present.
    expect(container.querySelectorAll('.MuiChip-root')).toHaveLength(1);
  });

  it('renders the kind and source-portal chips when present', () => {
    render(
      <ReviewDetails
        request={makeRequest({ kind: 'Venue', source_portal: 'partners' })}
        formatDateTime={formatDateTime}
      />,
    );
    expect(screen.getByText('Venue')).toBeInTheDocument();
    expect(screen.getByText('partners')).toBeInTheDocument();
  });

  it('renders the summary only when present', () => {
    const { rerender } = render(<ReviewDetails request={makeRequest()} formatDateTime={formatDateTime} />);
    expect(screen.queryByText('Wants to move venue')).not.toBeInTheDocument();

    rerender(
      <ReviewDetails request={makeRequest({ summary: 'Wants to move venue' })} formatDateTime={formatDateTime} />,
    );
    expect(screen.getByText('Wants to move venue')).toBeInTheDocument();
  });

  it('renders every detail row, dashing a null value', () => {
    render(
      <ReviewDetails
        request={makeRequest({
          details: [
            { label: 'Old venue', value: 'Indiranagar Hall' },
            { label: 'New venue', value: null },
          ],
        })}
        formatDateTime={formatDateTime}
      />,
    );
    expect(screen.getByText('Old venue')).toBeInTheDocument();
    expect(screen.getByText('Indiranagar Hall')).toBeInTheDocument();
    expect(screen.getByText('New venue')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});

describe('ReviewDetails — reviewed request', () => {
  it('shows a success banner with the reviewer and formatted date for an approval', () => {
    render(
      <ReviewDetails
        request={makeRequest({
          status: 'APPROVED',
          reviewed_by_name: 'Admin One',
          reviewed_at: '2026-01-05T00:00:00.000Z',
          review_notes: 'Looks fine',
        })}
        formatDateTime={formatDateTime}
      />,
    );
    expect(screen.getByText(/APPROVED by Admin One/)).toBeInTheDocument();
    expect(screen.getByText(/fmt<2026-01-05T00:00:00.000Z>/)).toBeInTheDocument();
    expect(screen.getByText('Looks fine')).toBeInTheDocument();
  });

  it('shows an error banner for a denial, falling back reviewer name and omitting the date/notes when absent', () => {
    render(
      <ReviewDetails
        request={makeRequest({
          status: 'DENIED',
          reviewed_by_name: null,
          reviewed_at: null,
          review_notes: null,
        })}
        formatDateTime={formatDateTime}
      />,
    );
    expect(screen.getByText('DENIED by Unknown')).toBeInTheDocument();
  });
});
