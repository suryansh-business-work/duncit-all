/**
 * The card frame every verification row shares. What matters here is that it
 * reads its title, chip and reject reason from the shared tables rather than
 * from literals — that is the drift the package exists to close.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import VerificationCardShell from '../src/mui/VerificationCardShell';
import type { Verification } from '../src';

const row = (over: Partial<Verification> = {}): Verification => ({
  type: 'IDENTITY',
  status: 'NOT_SUBMITTED',
  document_url: null,
  reject_reason: null,
  address: null,
  ...over,
});

describe('VerificationCardShell', () => {
  it('names the type and the status from the shared catalogue', () => {
    render(<VerificationCardShell item={row()} />);
    expect(screen.getByText('Identity')).toBeInTheDocument();
    expect(screen.getByText('Not Verified')).toBeInTheDocument();
  });

  it('reads a settled row as verified', () => {
    render(<VerificationCardShell item={row({ type: 'EMAIL', status: 'VERIFIED_BY_APP' })} />);
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Verified by the App')).toBeInTheDocument();
  });

  it('shows the reject reason on a rejected row', () => {
    render(
      <VerificationCardShell item={row({ status: 'REJECTED', reject_reason: 'Blurred scan' })} />,
    );
    expect(screen.getByText('Rejected')).toBeInTheDocument();
    expect(screen.getByText('Blurred scan')).toBeInTheDocument();
  });

  it('shows no reason when a rejected row carries none', () => {
    render(<VerificationCardShell item={row({ status: 'REJECTED' })} />);
    expect(screen.getByText('Rejected')).toBeInTheDocument();
    expect(screen.queryByText('Blurred scan')).not.toBeInTheDocument();
  });

  it('never leaks a stale reason once the row is under review again', () => {
    render(
      <VerificationCardShell item={row({ status: 'PENDING', reject_reason: 'Blurred scan' })} />,
    );
    expect(screen.getByText('Under review')).toBeInTheDocument();
    expect(screen.queryByText('Blurred scan')).not.toBeInTheDocument();
  });

  it('renders the action slot beneath the chip', () => {
    render(
      <VerificationCardShell item={row()}>
        <button type="button">Upload document</button>
      </VerificationCardShell>,
    );
    expect(screen.getByRole('button', { name: 'Upload document' })).toBeInTheDocument();
  });
});
