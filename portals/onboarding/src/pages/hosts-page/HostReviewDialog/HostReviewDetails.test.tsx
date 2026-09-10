import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import HostReviewDetails from './HostReviewDetails';
import type { HostRow } from '../queries';

const formatDateTime = (value: string) => `fmt(${value})`;

const host: HostRow = {
  id: 'h1',
  host_no: 'HOST-000007',
  user_id: 'u1',
  full_name: 'Asha Rao',
  email: 'asha@example.com',
  phone: '9876543210',
  dob: '1994-04-01',
  aadhar_number: '1234 5678 9012',
  pan_number: 'ABCDE1234F',
  full_address: '12 MG Road, Bengaluru',
  status: 'SUBMITTED',
  step_completed: 3,
  created_at: '2026-01-01T00:00:00.000Z',
  submitted_at: '2026-01-02T00:00:00.000Z',
  approved_at: '2026-01-03T00:00:00.000Z',
  rejected_at: null,
  updated_at: '2026-01-04T00:00:00.000Z',
  reviewer_notes: 'Docs verified on call.',
  bank_account: {
    payout_method: 'IMPS',
    account_holder_name: 'Asha Rao',
    account_number: '123456789012',
    ifsc_code: 'HDFC0001234',
    upi_id: 'asha@upi',
  },
};

describe('HostReviewDetails', () => {
  it('renders the whole application, not just the KYC triple', () => {
    render(<HostReviewDetails host={host} formatDateTime={formatDateTime} />);
    expect(screen.getByText('HOST-000007')).toBeInTheDocument();
    expect(screen.getByText('u1')).toBeInTheDocument();
    expect(screen.getByText('Step 3 of 4')).toBeInTheDocument();
    expect(screen.getByText('asha@example.com')).toBeInTheDocument();
    expect(screen.getByText('9876543210')).toBeInTheDocument();
    expect(screen.getByText('1234 5678 9012')).toBeInTheDocument();
    expect(screen.getByText('ABCDE1234F')).toBeInTheDocument();
    expect(screen.getByText('12 MG Road, Bengaluru')).toBeInTheDocument();
    expect(screen.getByText('Docs verified on call.')).toBeInTheDocument();
  });

  it('routes every timestamp through the admin-configured formatter', () => {
    render(<HostReviewDetails host={host} formatDateTime={formatDateTime} />);
    expect(screen.getByText('fmt(2026-01-01T00:00:00.000Z)')).toBeInTheDocument();
    expect(screen.getByText('fmt(2026-01-02T00:00:00.000Z)')).toBeInTheDocument();
    expect(screen.getByText('fmt(2026-01-03T00:00:00.000Z)')).toBeInTheDocument();
    expect(screen.getByText('fmt(2026-01-04T00:00:00.000Z)')).toBeInTheDocument();
    expect(screen.getByText('fmt(1994-04-01)')).toBeInTheDocument();
  });

  // A reviewer confirms the payout destination exists; they never need to read
  // back the full account number.
  it('masks the payout account to its last four digits', () => {
    render(<HostReviewDetails host={host} formatDateTime={formatDateTime} />);
    expect(screen.getByText('•••• 9012')).toBeInTheDocument();
    expect(screen.queryByText('123456789012')).not.toBeInTheDocument();
    expect(screen.getByText('HDFC0001234')).toBeInTheDocument();
    expect(screen.getByText('asha@upi')).toBeInTheDocument();
  });

  it('falls back to an em dash for everything the host has not filled in', () => {
    render(
      <HostReviewDetails
        host={{ id: 'h2', user_id: 'u2', status: 'DRAFT' }}
        formatDateTime={formatDateTime}
      />,
    );
    expect(screen.getByText('Step 0 of 4')).toBeInTheDocument();
    // host_no, started, submitted, email, phone, dob, aadhar, pan, address,
    // 5 payout rows, approved, rejected, last updated and the last note.
    expect(screen.getAllByText('—')).toHaveLength(18);
  });
});
