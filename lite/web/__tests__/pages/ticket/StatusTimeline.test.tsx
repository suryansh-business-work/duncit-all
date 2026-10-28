import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { LiteRegistration } from '../../../../shared/graphql/documents';
import { StatusTimeline } from '../../../pages/ticket/StatusTimeline';
import { registrationFixture, renderWithProviders } from '../../test-utils';

/** Each step's label, and whether it is ticked, in order. */
function steps(): { label: string; done: boolean }[] {
  return within(screen.getByTestId('status-timeline'))
    .getAllByRole('listitem')
    .map((item) => ({
      label: item.querySelector('.MuiListItemText-primary')?.textContent ?? '',
      done: item.querySelector('[data-testid="CheckCircleIcon"]') !== null,
    }));
}

const renderTimeline = (registration: LiteRegistration, requiresApproval = false) =>
  renderWithProviders(<StatusTimeline registration={registration} requiresApproval={requiresApproval} />);

describe('StatusTimeline', () => {
  it('walks a free ticket through registered, confirmed and checked in', () => {
    renderTimeline(registrationFixture({ status: 'CONFIRMED' }));
    expect(steps()).toEqual([
      { label: 'Registered', done: true },
      { label: 'Seat confirmed', done: true },
      { label: 'Checked in', done: false },
    ]);
  });

  it('adds the approval step when the host approves guests, unticked while pending', () => {
    renderTimeline(registrationFixture({ status: 'PENDING_APPROVAL' }), true);
    expect(steps()).toEqual([
      { label: 'Registered', done: true },
      { label: 'Approved by the host', done: false },
      { label: 'Seat confirmed', done: false },
      { label: 'Checked in', done: false },
    ]);
  });

  it('ticks approval once the request moved on to payment, and adds the payment step for a paid ticket', () => {
    renderTimeline(registrationFixture({ status: 'PAYMENT_PENDING', amount_due: 500, payment_status: 'PENDING' }), true);
    expect(steps()).toEqual([
      { label: 'Registered', done: true },
      { label: 'Approved by the host', done: true },
      { label: 'Payment confirmed', done: false },
      { label: 'Seat confirmed', done: false },
      { label: 'Checked in', done: false },
    ]);
  });

  it('ticks every step for a paid, checked-in guest and dates the dated ones in the admin’s zone', () => {
    renderTimeline(
      registrationFixture({
        status: 'CONFIRMED',
        amount_due: 500,
        payment_status: 'PAID',
        payment_confirmed_at: '2026-10-03T10:00:00.000Z',
        checked_in_at: '2026-11-21T14:00:00.000Z',
      }),
    );

    expect(steps().every((step) => step.done)).toBe(true);
    // Asia/Kolkata is UTC+5:30, in the admin's dd MMM yyyy · hh:mm a.
    expect(screen.getByText('02 Oct 2026 · 05:30 AM')).toBeInTheDocument();
    expect(screen.getByText('03 Oct 2026 · 03:30 PM')).toBeInTheDocument();
    expect(screen.getByText('21 Nov 2026 · 07:30 PM')).toBeInTheDocument();
  });

  it('does not tick payment for a rejected payment, and shows no date on an unfinished step', () => {
    renderTimeline(registrationFixture({ status: 'PAYMENT_PENDING', amount_due: 500, payment_status: 'REJECTED', payment_confirmed_at: '2026-10-03T10:00:00.000Z' }));

    expect(steps().find((step) => step.label === 'Payment confirmed')?.done).toBe(false);
    expect(screen.queryByText('03 Oct 2026 · 03:30 PM')).not.toBeInTheDocument();
  });
});
