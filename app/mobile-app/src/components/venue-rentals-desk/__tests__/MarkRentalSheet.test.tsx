import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { MarkRentalSheet } from '@/components/venue-rentals-desk/MarkRentalSheet';
import type { DeskBooking } from '@/hooks/useVenueRentalDesk';
import { renderWithProviders } from '@/utils/test-utils';

const booking = (over: Partial<DeskBooking> = {}) =>
  ({
    id: 'b1',
    name: 'Racket',
    currency_symbol: '₹',
    deposit_amount: 500,
    ...over,
  }) as DeskBooking;

const open = (
  value: DeskBooking | null,
  onMark = jest.fn().mockResolvedValue(undefined),
  onClose = jest.fn(),
  depositRefundable = true,
) => {
  renderWithProviders(
    <MarkRentalSheet
      booking={value}
      depositRefundable={depositRefundable}
      onClose={onClose}
      onMark={onMark}
    />,
  );
  return { onMark, onClose };
};

describe('MarkRentalSheet', () => {
  it('is closed with no booking', () => {
    open(null);
    expect(screen.queryByTestId('mark-rental-sheet')).toBeNull();
  });

  it('marks an item returned, sending no claim or note, and closes', async () => {
    const { onMark, onClose } = open(booking());
    expect(screen.getByText('Mark Racket')).toBeOnTheScreen();
    // Returned is the default: nothing to type.
    expect(screen.queryByTestId('field-damage_claim')).toBeNull();

    fireEvent.press(screen.getByTestId('mark-rental-save'));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(onMark).toHaveBeenCalledWith('b1', {
      outcome: 'RETURNED',
      damage_claim: null,
      note: null,
    });
  });

  it('keeps part of the deposit for damage, with what was damaged', async () => {
    const { onMark } = open(booking());
    fireEvent.press(screen.getByTestId('mark-rental-outcome-DAMAGED'));
    expect(screen.getByText(/Up to ₹\s?500, the deposit paid/)).toBeOnTheScreen();

    fireEvent.changeText(screen.getByTestId('field-damage_claim'), '200');
    fireEvent.changeText(screen.getByTestId('field-note'), '  Cracked frame  ');
    fireEvent.press(screen.getByTestId('mark-rental-save'));

    await waitFor(() =>
      expect(onMark).toHaveBeenCalledWith('b1', {
        outcome: 'DAMAGED',
        damage_claim: 200,
        note: 'Cracked frame',
      }),
    );
  });

  it('refuses a claim above the deposit, or without a note, and sends nothing', async () => {
    const { onMark } = open(booking());
    fireEvent.press(screen.getByTestId('mark-rental-outcome-DAMAGED'));
    fireEvent.changeText(screen.getByTestId('field-damage_claim'), '900');
    fireEvent.press(screen.getByTestId('mark-rental-save'));

    await waitFor(() =>
      expect(screen.getByText(/Enter an amount above 0 and up to 500/)).toBeOnTheScreen(),
    );
    expect(screen.getByText('Say what was damaged')).toBeOnTheScreen();
    expect(onMark).not.toHaveBeenCalled();
  });

  it('switching back to returned drops the damage fields', () => {
    open(booking());
    fireEvent.press(screen.getByTestId('mark-rental-outcome-DAMAGED'));
    expect(screen.getByTestId('field-damage_claim')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('mark-rental-outcome-RETURNED'));
    expect(screen.queryByTestId('field-damage_claim')).toBeNull();
  });

  it('offers no damage choice when no deposit was taken — there is nothing to keep', () => {
    open(booking({ deposit_amount: 0 }));
    expect(screen.getByTestId('mark-rental-outcome-RETURNED')).toBeOnTheScreen();
    expect(screen.queryByTestId('mark-rental-outcome-DAMAGED')).toBeNull();
  });

  it('keeps the sheet open with the server’s refusal', async () => {
    const { onClose } = open(booking(), jest.fn().mockRejectedValue(new Error('Already marked')));
    fireEvent.press(screen.getByTestId('mark-rental-save'));

    await waitFor(() =>
      expect(screen.getByTestId('mark-rental-error')).toHaveTextContent('Already marked'),
    );
    expect(onClose).not.toHaveBeenCalled();
  });

  it('tells the venue to hand the whole deposit back for an item returned fine', () => {
    open(booking());
    expect(screen.getByTestId('mark-rental-hand-back')).toHaveTextContent(
      /Hand ₹\s?500 back to the guest now\. Duncit adds the full deposit to your next rental payout\./,
    );
  });

  it('takes the damage claim off what the venue hands back, as it is typed', () => {
    open(booking());
    fireEvent.press(screen.getByTestId('mark-rental-outcome-DAMAGED'));
    fireEvent.changeText(screen.getByTestId('field-damage_claim'), '200');
    expect(screen.getByTestId('mark-rental-hand-back')).toHaveTextContent(/Hand ₹\s?300 back/);

    // The whole deposit kept: nothing goes back, the payout still carries it.
    fireEvent.changeText(screen.getByTestId('field-damage_claim'), '500');
    expect(screen.getByTestId('mark-rental-hand-back')).toHaveTextContent(
      'Nothing to hand back. Duncit adds the full deposit to your next rental payout.',
    );
  });

  it('hands nothing back when Finance made deposits non-refundable', () => {
    open(booking(), undefined, undefined, false);
    expect(screen.getByTestId('mark-rental-hand-back')).toHaveTextContent(/^Nothing to hand back/);
  });

  it('says nothing about a hand-back when no deposit was taken', () => {
    open(booking({ deposit_amount: 0 }));
    expect(screen.queryByTestId('mark-rental-hand-back')).toBeNull();
  });

  it('Cancel closes without marking', () => {
    const { onMark, onClose } = open(booking());
    fireEvent.press(screen.getByTestId('mark-rental-cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onMark).not.toHaveBeenCalled();
  });
});
