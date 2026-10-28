import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { LiteEventStatus, LitePaymentStatus, LiteRegistrationStatus } from '../../../shared/graphql/documents';
import { EventStatusChip, PaymentStatusChip, RegistrationStatusChip } from '../../components/StatusChips';
import { renderWithProviders } from '../test-utils';

describe('RegistrationStatusChip', () => {
  it.each<[LiteRegistrationStatus, string, string]>([
    ['PENDING_APPROVAL', 'Pending approval', 'MuiChip-colorWarning'],
    ['PAYMENT_PENDING', 'Payment pending', 'MuiChip-colorWarning'],
    ['CONFIRMED', 'Going', 'MuiChip-colorSuccess'],
    ['WAITLISTED', 'Waitlisted', 'MuiChip-colorInfo'],
    ['DECLINED', 'Declined', 'MuiChip-colorError'],
    ['CANCELLED', 'Cancelled', 'MuiChip-colorDefault'],
  ])('shows %s as "%s" in its colour', (status, label, colour) => {
    renderWithProviders(<RegistrationStatusChip status={status} />);
    const chip = screen.getByTestId('registration-status-chip');
    expect(chip).toHaveTextContent(label);
    expect(chip).toHaveClass(colour, 'MuiChip-filled');
  });
});

describe('PaymentStatusChip', () => {
  it.each<[LitePaymentStatus, string, string]>([
    ['NOT_REQUIRED', 'Free', 'MuiChip-colorDefault'],
    ['PENDING', 'Awaiting payment', 'MuiChip-colorWarning'],
    ['PAID', 'Paid', 'MuiChip-colorSuccess'],
    ['REJECTED', 'Payment rejected', 'MuiChip-colorError'],
  ])('shows %s as "%s", outlined, in its colour', (status, label, colour) => {
    renderWithProviders(<PaymentStatusChip status={status} />);
    const chip = screen.getByTestId('payment-status-chip');
    expect(chip).toHaveTextContent(label);
    expect(chip).toHaveClass(colour, 'MuiChip-outlined');
  });
});

describe('EventStatusChip', () => {
  it.each<[LiteEventStatus, string, string]>([
    ['DRAFT', 'Draft', 'MuiChip-colorWarning'],
    ['PUBLISHED', 'Published', 'MuiChip-colorSuccess'],
    ['CANCELLED', 'Cancelled', 'MuiChip-colorError'],
  ])('shows %s as "%s" in its colour', (status, label, colour) => {
    renderWithProviders(<EventStatusChip status={status} />);
    const chip = screen.getByTestId('event-status-chip');
    expect(chip).toHaveTextContent(label);
    expect(chip).toHaveClass(colour);
  });
});
