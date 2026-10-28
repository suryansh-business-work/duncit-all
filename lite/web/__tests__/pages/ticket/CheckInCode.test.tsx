import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CheckInCode } from '../../../pages/ticket/CheckInCode';
import { renderWithProviders } from '../../test-utils';

describe('CheckInCode', () => {
  it('shows the QR to scan, labelled for screen readers, with the code to type under it', () => {
    renderWithProviders(<CheckInCode code="ABC123" qrDataUrl="data:image/png;base64,QR" />);

    const qr = screen.getByRole('img', { name: 'Check-in QR code for ticket ABC123' });
    expect(qr).toHaveAttribute('src', 'data:image/png;base64,QR');
    expect(screen.getByLabelText('Check-in code ABC123')).toHaveTextContent('ABC123');
    expect(screen.getByText('Show this QR at the door. The host scans it, or types the code under it.')).toBeInTheDocument();
  });

  it('shows just the code until the ticket is confirmed and has a QR', () => {
    renderWithProviders(<CheckInCode code="ABC123" qrDataUrl={null} />);

    expect(screen.queryByTestId('ticket-qr')).not.toBeInTheDocument();
    expect(screen.getByText('Check-in code')).toBeInTheDocument();
    expect(screen.getByLabelText('Check-in code ABC123')).toHaveTextContent('ABC123');
    expect(screen.getByText('Show this at the door. The host types it in.')).toBeInTheDocument();
  });
});
