import { fireEvent, screen } from '@testing-library/react-native';
import type { PodRentalCatalogue, PodRentalItem } from '@duncit/utils';

import { PodRentList } from '@/components/details/rent/PodRentList';
import type { PodRentals } from '@/hooks/usePodRentals';
import type { PodRentalPicks } from '@/stores/rental-picks.store';
import { renderWithProviders } from '@/utils/test-utils';

const item = (id: string, over: Partial<PodRentalItem> = {}): PodRentalItem => ({
  id,
  name: `Item ${id}`,
  description: '',
  images: [],
  unit: 'SLOT',
  rate: 100,
  deposit: 0,
  available: 5,
  per_guest_limit: 2,
  ...over,
});

const catalogue = (over: Partial<PodRentalCatalogue> = {}): PodRentalCatalogue => ({
  open: true,
  closed_reason: null,
  hours: 3,
  currency_symbol: '₹',
  venue_terms_html: '',
  items: [item('racket', { unit: 'HOUR', rate: 50, deposit: 200 }), item('shoes')],
  ...over,
});

const rentals = (over: Partial<PodRentals> = {}): PodRentals => ({
  catalogue: catalogue(),
  settings: null,
  failed: false,
  loading: false,
  refetch: jest.fn().mockResolvedValue(undefined),
  ...over,
});

const picksOf = (picks: Record<string, number> = {}): PodRentalPicks => ({
  picks,
  setQuantity: jest.fn(),
  clear: jest.fn(),
});

describe('PodRentList', () => {
  it('lists each item with its rate per slot or hour, deposit and what is left', () => {
    renderWithProviders(<PodRentList rentals={rentals()} picks={picksOf()} seats={1} />);

    expect(screen.getByTestId('pod-rent-list')).toBeOnTheScreen();
    expect(screen.getByText('Item racket')).toBeOnTheScreen();
    expect(screen.getByText(/₹\s?50 per hour/)).toBeOnTheScreen();
    expect(screen.getByText(/₹\s?100 per slot/)).toBeOnTheScreen();
    expect(screen.getByText(/5 left · Deposit ₹\s?200/)).toBeOnTheScreen();
    // Nothing picked: no total line.
    expect(screen.queryByTestId('pod-rent-total')).toBeNull();
  });

  it('adds an item for this pod through the picker', () => {
    const picks = picksOf();
    renderWithProviders(<PodRentList rentals={rentals()} picks={picks} seats={1} />);
    fireEvent.press(screen.getByTestId('pod-rent-shoes-add'));
    expect(picks.setQuantity).toHaveBeenCalledWith('shoes', 1);
  });

  it('totals the picks the server’s way: an hourly item for every hour, plus its deposit', () => {
    // Racket: 50 × 3 hours × 2 + 200 × 2 deposit = 700; shoes 100 → 800.
    renderWithProviders(
      <PodRentList rentals={rentals()} picks={picksOf({ racket: 2, shoes: 1 })} seats={1} />,
    );
    expect(screen.getByTestId('pod-rent-subtotal')).toHaveTextContent(/Rent subtotal₹\s?400/);
    expect(screen.getByTestId('pod-rent-deposit')).toHaveTextContent(/Refundable deposit₹\s?400/);
    expect(screen.getByTestId('pod-rent-grand-total')).toHaveTextContent(/Total₹\s?800/);
    expect(screen.getByTestId('pod-rent-racket-count')).toHaveTextContent('2');
  });

  it('shows how each picked item is priced, with the deposit on its own refundable line', () => {
    renderWithProviders(
      <PodRentList rentals={rentals()} picks={picksOf({ racket: 2, shoes: 1 })} seats={1} />,
    );
    expect(screen.getByTestId('pod-rent-math-racket')).toHaveTextContent(
      /₹\s?50 × 3 hrs × 2 qty = ₹\s?300Deposit \(refundable\): ₹\s?200 × 2 qty = ₹\s?400/,
    );
    expect(screen.getByTestId('pod-rent-math-shoes')).toHaveTextContent(/^₹\s?100 × 1 qty = ₹\s?100$/);
  });

  it('leaves the deposit row out when nothing picked carries one', () => {
    renderWithProviders(
      <PodRentList rentals={rentals()} picks={picksOf({ shoes: 1 })} seats={1} />,
    );
    expect(screen.getByTestId('pod-rent-subtotal')).toHaveTextContent(/₹\s?100/);
    expect(screen.queryByTestId('pod-rent-deposit')).toBeNull();
    expect(screen.getByTestId('pod-rent-grand-total')).toHaveTextContent(/₹\s?100/);
  });

  it('says when the per-guest limit, not the stock, caps the quantity', () => {
    // Racket: 2 per guest × 1 seat, 5 left → capped at 2; with 3 seats the cap is 5 (stock).
    const { rerender } = renderWithProviders(<PodRentList rentals={rentals()} picks={picksOf()} seats={1} />);
    expect(screen.getByTestId('pod-rent-max-racket')).toHaveTextContent('Max 2 per booking');
    rerender(<PodRentList rentals={rentals()} picks={picksOf()} seats={3} />);
    expect(screen.queryByTestId('pod-rent-max-racket')).toBeNull();
  });

  it('shows only the first few on the card', () => {
    renderWithProviders(<PodRentList rentals={rentals()} picks={picksOf()} seats={1} limit={1} />);
    expect(screen.getByTestId('pod-rent-row-racket')).toBeOnTheScreen();
    expect(screen.queryByTestId('pod-rent-row-shoes')).toBeNull();
  });

  it('marks a sold-out item and offers no picker for it', () => {
    const sold = rentals({ catalogue: catalogue({ items: [item('tent', { available: 0 })] }) });
    renderWithProviders(<PodRentList rentals={sold} picks={picksOf()} seats={1} />);
    expect(screen.getByText('Sold out')).toBeOnTheScreen();
    expect(screen.queryByTestId('pod-rent-tent-add')).toBeNull();
  });

  it('still lets a guest remove an item that sold out after they picked it', () => {
    const sold = rentals({ catalogue: catalogue({ items: [item('tent', { available: 0 })] }) });
    const picks = picksOf({ tent: 1 });
    renderWithProviders(<PodRentList rentals={sold} picks={picks} seats={1} />);
    fireEvent.press(screen.getByTestId('pod-rent-tent-decrease'));
    expect(picks.setQuantity).toHaveBeenCalledWith('tent', 0);
  });

  it('says renting closed before the pod, with the cutoff, and lists items without pickers', () => {
    const closed = rentals({
      catalogue: catalogue({ open: false, closed_reason: 'CUTOFF' }),
      settings: {
        enabled: true,
        terms_html: '',
        rent_refundable_on_backout: true,
        deposit_refundable: true,
        booking_cutoff_hours: 6,
      },
    });
    renderWithProviders(<PodRentList rentals={closed} picks={picksOf({ shoes: 1 })} seats={1} />);
    expect(screen.getByTestId('pod-rent-closed')).toHaveTextContent(
      'Renting closed 6 hours before the pod starts',
    );
    expect(screen.queryByTestId('pod-rent-shoes-add')).toBeNull();
    expect(screen.queryByTestId('pod-rent-shoes-decrease')).toBeNull();
  });

  it('says renting is off when Finance disabled it', () => {
    const off = rentals({ catalogue: catalogue({ open: false, closed_reason: 'DISABLED' }) });
    renderWithProviders(<PodRentList rentals={off} picks={picksOf()} seats={1} />);
    expect(screen.getByTestId('pod-rent-closed')).toHaveTextContent(
      'Renting is not available right now',
    );
  });

  it('says there is nothing to rent when the venue lists nothing, or nothing loaded yet', () => {
    const empty = rentals({ catalogue: catalogue({ items: [] }) });
    const { rerender } = renderWithProviders(
      <PodRentList rentals={empty} picks={picksOf()} seats={1} />,
    );
    expect(screen.getByTestId('pod-rent-empty')).toHaveTextContent('Nothing to rent for this pod');
    rerender(<PodRentList rentals={rentals({ catalogue: null })} picks={picksOf()} seats={1} />);
    expect(screen.getByTestId('pod-rent-empty')).toBeOnTheScreen();
  });

  it('says the items could not load, and Retry asks again', () => {
    const failed = rentals({ catalogue: null, failed: true });
    renderWithProviders(<PodRentList rentals={failed} picks={picksOf()} seats={1} />);
    expect(screen.getByTestId('pod-rent-error')).toBeOnTheScreen();
    fireEvent.press(screen.getByText('Retry'));
    expect(failed.refetch).toHaveBeenCalledTimes(1);
  });

  it('swallows a retry that fails again rather than crashing the pod page', () => {
    const failed = rentals({
      catalogue: null,
      failed: true,
      refetch: jest.fn().mockRejectedValue(new Error('offline')),
    });
    renderWithProviders(<PodRentList rentals={failed} picks={picksOf()} seats={1} />);
    fireEvent.press(screen.getByText('Retry'));
    expect(screen.getByTestId('pod-rent-error')).toBeOnTheScreen();
  });
});
