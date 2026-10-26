import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

import PodRentList from '../PodRentList';
import PodShopRentTabs from '../PodShopRentTabs';
import RentalItemRow from '../RentalItemRow';
import RentalLineBreakdown from '../RentalLineBreakdown';
import RentalSuccessCard from '../RentalSuccessCard';
import { RentalBillRows, RentalCollectNotice, RentalItemLines, RentalTermsConsent } from '../RentalCheckoutBlock';
import { usePodRentalPicks } from '../usePodRentalPicks';
import { usePodRentals } from '../usePodRentals';
import { useCheckoutRentals } from '../useCheckoutRentals';
import { rentalMoney } from '@duncit/utils';
import { fallbackT } from '../../../i18n/fallback';

const m = (amount: number) => rentalMoney('₹', amount);

const h = vi.hoisted(() => ({
  queries: [] as Array<{ data: unknown; loading: boolean; error: unknown; refetch: ReturnType<typeof vi.fn> }>,
  opts: [] as Array<{ skip: boolean; variables?: unknown }>,
  call: 0,
}));

vi.mock('@apollo/client/react', async (orig) => ({
  ...(await orig<object>()),
  useQuery: (_doc: unknown, opts: { skip: boolean; variables?: unknown }) => {
    h.opts.push(opts);
    return h.queries[h.call++ % 2] ?? { data: undefined, loading: false, error: undefined, refetch: vi.fn().mockResolvedValue(undefined) };
  },
}));

const item = (over: Record<string, unknown> = {}) => ({
  id: 'i1',
  name: 'Racket',
  description: '',
  images: ['https://img/r.png'],
  unit: 'HOUR',
  rate: 50,
  deposit: 200,
  available: 6,
  per_guest_limit: 2,
  ...over,
});
const catalogue = (over: Record<string, unknown> = {}) => ({
  open: true,
  closed_reason: null,
  hours: 2,
  currency_symbol: '₹',
  venue_terms_html: '<p>Venue rules</p>',
  items: [item()],
  ...over,
});
const rentals = (over: Record<string, unknown> = {}) => ({
  catalogue: catalogue(),
  settings: { enabled: true, terms_html: '<p>Duncit rules</p>', deposit_refundable: true, rent_refundable_on_backout: true, booking_cutoff_hours: 4 },
  loading: false,
  error: null,
  refetch: vi.fn(),
  ...over,
});
const picks = (state: Record<string, number> = {}) => ({ picks: state, setQuantity: vi.fn(), clear: vi.fn() });

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  h.queries = [];
  h.opts = [];
  h.call = 0;
});

describe('PodRentList', () => {
  it('shows a loader, and an error with a retry when nothing could be read', () => {
    const { unmount } = render(<PodRentList rentals={rentals({ loading: true }) as never} picks={picks() as never} seats={1} />);
    expect(screen.getByTestId('loader')).toBeInTheDocument();
    unmount();
    const refetch = vi.fn();
    render(<PodRentList rentals={rentals({ catalogue: null, error: new Error('x'), refetch }) as never} picks={picks() as never} seats={1} />);
    expect(screen.getByTestId('pod-rent-error')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: fallbackT('venueRentals.guest.retry') }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('says nothing is rentable when there is no catalogue or no items', () => {
    const { unmount } = render(<PodRentList rentals={rentals({ catalogue: null }) as never} picks={picks() as never} seats={1} />);
    expect(screen.getByTestId('pod-rent-empty')).toBeInTheDocument();
    unmount();
    render(<PodRentList rentals={rentals({ catalogue: catalogue({ items: [] }) }) as never} picks={picks() as never} seats={1} />);
    expect(screen.getByTestId('pod-rent-empty')).toBeInTheDocument();
  });

  it('keeps showing a catalogue it has when a refresh failed', () => {
    render(<PodRentList rentals={rentals({ error: new Error('x') }) as never} picks={picks() as never} seats={1} />);
    expect(screen.getByTestId('pod-rent-list')).toBeInTheDocument();
    expect(screen.queryByTestId('pod-rent-error')).not.toBeInTheDocument();
  });

  it('lists the items with no total until something is picked, and limits the preview', () => {
    const many = catalogue({ items: [item(), item({ id: 'i2', name: 'Ball' }), item({ id: 'i3', name: 'Net' })] });
    render(<PodRentList rentals={rentals({ catalogue: many }) as never} picks={picks() as never} seats={1} limit={2} />);
    expect(screen.getByTestId('pod-rent-row-i1')).toBeInTheDocument();
    expect(screen.getByTestId('pod-rent-row-i2')).toBeInTheDocument();
    expect(screen.queryByTestId('pod-rent-row-i3')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pod-rent-total')).not.toBeInTheDocument();
  });

  it('totals the picks as rent, deposit and grand total, and hides the deposit line when there is none', () => {
    const { unmount } = render(<PodRentList rentals={rentals() as never} picks={picks({ i1: 2 }) as never} seats={1} />);
    expect(screen.getByTestId('pod-rent-subtotal')).toHaveTextContent(m(200));
    expect(screen.getByTestId('pod-rent-deposit')).toHaveTextContent(m(400));
    expect(screen.getByTestId('pod-rent-grand-total')).toHaveTextContent(m(600));
    unmount();
    render(<PodRentList rentals={rentals({ catalogue: catalogue({ items: [item({ deposit: 0 })] }) }) as never} picks={picks({ i1: 1 }) as never} seats={1} />);
    expect(screen.queryByTestId('pod-rent-deposit')).not.toBeInTheDocument();
  });

  it('says renting is closed and makes the rows read only', () => {
    render(
      <PodRentList
        rentals={rentals({ catalogue: catalogue({ open: false, closed_reason: 'CUTOFF' }) }) as never}
        picks={picks({ i1: 1 }) as never}
        seats={1}
      />
    );
    expect(screen.getByTestId('pod-rent-closed')).toHaveTextContent('4');
    expect(screen.queryByRole('button', { name: /increase/i })).not.toBeInTheDocument();
  });

  it('says renting is closed without a cutoff when there are no settings', () => {
    render(
      <PodRentList
        rentals={rentals({ settings: null, catalogue: catalogue({ open: false, closed_reason: 'DISABLED' }) }) as never}
        picks={picks() as never}
        seats={1}
      />
    );
    expect(screen.getByTestId('pod-rent-closed')).toBeInTheDocument();
  });
});

describe('RentalItemRow', () => {
  const row = (over: Record<string, unknown> = {}, props: Record<string, unknown> = {}) => {
    const onQuantity = vi.fn();
    render(<RentalItemRow item={item(over) as never} catalogue={catalogue() as never} quantity={0} max={2} readOnly={false} onQuantity={onQuantity} {...props} />);
    return onQuantity;
  };

  it('shows the photo, what is left, the deposit and the rate, with the picker', () => {
    row();
    const rowEl = screen.getByTestId('pod-rent-row-i1');
    expect(rowEl.querySelector('img')).toHaveAttribute('src', 'https://img/r.png');
    expect(rowEl).toHaveTextContent(fallbackT('venueRentals.guest.left', { vars: { count: 6 } }));
    expect(rowEl).toHaveTextContent(m(200));
    expect(screen.getByTestId('pod-rent-max-i1')).toBeInTheDocument();
  });

  it('falls back to an icon when there is no photo or it fails to load', () => {
    row({ images: [] });
    expect(screen.getByTestId('pod-rent-row-i1').querySelector('img')).toBeNull();
  });

  it('falls back to the icon when the photo fails', () => {
    row();
    const img = screen.getByTestId('pod-rent-row-i1').querySelector('img') as HTMLImageElement;
    fireEvent.error(img);
    expect(screen.getByTestId('pod-rent-row-i1').querySelector('img')).toBeNull();
  });

  it('says sold out and offers no picker for an item with none left, unless some are already picked', () => {
    const { unmount } = render(<RentalItemRow item={item({ available: 0 }) as never} catalogue={catalogue() as never} quantity={0} max={0} readOnly={false} onQuantity={vi.fn()} />);
    expect(screen.getByTestId('pod-rent-row-i1')).toHaveTextContent(fallbackT('venueRentals.guest.soldOut'));
    expect(screen.queryByTestId('pod-rent-i1-increase')).not.toBeInTheDocument();
    unmount();
    render(<RentalItemRow item={item({ available: 0 }) as never} catalogue={catalogue() as never} quantity={1} max={0} readOnly={false} onQuantity={vi.fn()} />);
    expect(screen.getByTestId('pod-rent-math-i1')).toBeInTheDocument();
  });

  it('shows no deposit text and no cap note when there is no deposit and the stock is the limit', () => {
    row({ deposit: 0, available: 2 }, { max: 2 });
    expect(screen.getByTestId('pod-rent-row-i1')).not.toHaveTextContent('Deposit');
    expect(screen.queryByTestId('pod-rent-max-i1')).not.toBeInTheDocument();
  });

  it('is a plain listing when renting is closed', () => {
    row({}, { readOnly: true, quantity: 1 });
    expect(screen.queryByTestId('pod-rent-math-i1')).not.toBeInTheDocument();
  });

  it('shows how a picked item is priced', () => {
    row({}, { quantity: 2 });
    expect(screen.getByTestId('pod-rent-math-i1')).toBeInTheDocument();
  });

  it('shows nothing for a line with no quantity', () => {
    const { container } = render(<RentalLineBreakdown item={item() as never} quantity={0} catalogue={catalogue() as never} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows a per-slot item without a deposit line', () => {
    render(<RentalLineBreakdown item={item({ unit: 'SLOT', deposit: 0 }) as never} quantity={1} catalogue={catalogue() as never} />);
    expect(screen.getByTestId('pod-rent-math-i1').children).toHaveLength(1);
  });
});

describe('checkout rental blocks', () => {
  const lines = [{ id: 'i1', name: 'Racket', quantity: 2, rent: 200, deposit: 400 }, { id: 'i2', name: 'Ball', quantity: 1, rent: 30, deposit: 0 }];
  const checkout = (over: Record<string, unknown> = {}) => ({
    selections: [],
    totals: { count: 3, rent: 230, deposit: 400, total: 630 },
    lines,
    currency: '₹',
    venueTerms: '<p>Venue rules</p>',
    settings: { deposit_refundable: true, terms_html: '<p>Duncit rules</p>' },
    agreed: false,
    setAgreed: vi.fn(),
    blocked: true,
    ...over,
  });

  it('lists each rented item, with a refundable or kept deposit', () => {
    const { unmount } = render(<RentalItemLines lines={lines} currency="₹" depositRefundable testId="lines" />);
    expect(screen.getByTestId('lines-i1')).toHaveTextContent(m(200));
    expect(screen.getByTestId('lines')).toHaveTextContent(m(400));
    unmount();
    render(<RentalItemLines lines={lines} currency="₹" depositRefundable={false} testId="lines" />);
    expect(screen.getByTestId('lines')).toHaveTextContent(fallbackT('venueRentals.guest.depositKept'));
  });

  it('explains where items are collected, by deposit rule', () => {
    const { unmount } = render(<RentalCollectNotice depositRefundable />);
    expect(screen.getByTestId('rental-collect-notice')).toHaveTextContent(fallbackT('venueRentals.guest.collectNote'));
    unmount();
    render(<RentalCollectNotice depositRefundable={false} />);
    expect(screen.getByTestId('rental-collect-notice')).toHaveTextContent(fallbackT('venueRentals.guest.collectNoteKept'));
  });

  it('puts the rent and deposit on the bill, or nothing when nothing is rented', () => {
    const { container, unmount } = render(<RentalBillRows rentals={checkout({ totals: { count: 0, rent: 0, deposit: 0, total: 0 } }) as never} />);
    expect(container).toBeEmptyDOMElement();
    unmount();
    render(<RentalBillRows rentals={checkout() as never} />);
    expect(screen.getByTestId('checkout-rental-rent')).toHaveTextContent(`+ ${m(230)}`);
    expect(screen.getByTestId('checkout-rental-deposit')).toHaveTextContent(`+ ${m(400)}`);
  });

  it('uses the kept-deposit wording when finance says deposits are not refunded, and skips a zero deposit', () => {
    const { unmount } = render(<RentalBillRows rentals={checkout({ settings: { deposit_refundable: false } }) as never} />);
    expect(screen.getByTestId('checkout-rental-deposit')).toHaveTextContent(fallbackT('venueRentals.guest.depositKept'));
    unmount();
    render(<RentalBillRows rentals={checkout({ settings: null, totals: { count: 1, rent: 30, deposit: 0, total: 30 } }) as never} />);
    expect(screen.queryByTestId('checkout-rental-deposit')).not.toBeInTheDocument();
  });

  it('asks for agreement only when something is rented, and records it', () => {
    const { container, unmount } = render(<RentalTermsConsent rentals={checkout({ totals: { count: 0, rent: 0, deposit: 0, total: 0 } }) as never} />);
    expect(container).toBeEmptyDOMElement();
    unmount();
    const setAgreed = vi.fn();
    render(<RentalTermsConsent rentals={checkout({ setAgreed }) as never} />);
    fireEvent.click(screen.getByTestId('checkout-rental-agree').querySelector('input') as HTMLElement);
    expect(setAgreed).toHaveBeenCalledWith(true);
  });

  it('opens Duncit and venue terms together, sanitised, from the link', async () => {
    render(
      <RentalTermsConsent
        rentals={checkout({ venueTerms: '<p>Venue rules</p><script>alert(1)</script>', settings: { terms_html: '<p>Duncit rules</p>' } }) as never}
      />
    );
    fireEvent.click(screen.getByTestId('checkout-rental-terms-link'));
    const dialog = await screen.findByTestId('rental-terms-dialog');
    expect(dialog).toHaveTextContent('Duncit rules');
    expect(dialog).toHaveTextContent('Venue rules');
    expect(dialog.querySelector('script')).toBeNull();
  });

  it('shows only the terms that exist, and plain text when there are none', async () => {
    const { unmount } = render(<RentalTermsConsent rentals={checkout({ venueTerms: '', settings: { terms_html: '<p>Only Duncit</p>' } }) as never} />);
    fireEvent.click(screen.getByTestId('checkout-rental-terms-link'));
    expect(await screen.findByLabelText(fallbackT('venueRentals.guest.duncitTerms'))).toBeInTheDocument();
    expect(screen.queryByLabelText(fallbackT('venueRentals.guest.venueTerms'))).not.toBeInTheDocument();
    unmount();
    render(<RentalTermsConsent rentals={checkout({ venueTerms: '', settings: null }) as never} />);
    expect(screen.queryByTestId('checkout-rental-terms-link')).not.toBeInTheDocument();
  });

  it('shows only the venue terms when Duncit has none', async () => {
    render(<RentalTermsConsent rentals={checkout({ settings: {} }) as never} />);
    fireEvent.click(screen.getByTestId('checkout-rental-terms-link'));
    expect(await screen.findByLabelText(fallbackT('venueRentals.guest.venueTerms'))).toBeInTheDocument();
    expect(screen.queryByLabelText(fallbackT('venueRentals.guest.duncitTerms'))).not.toBeInTheDocument();
  });

  it('shows the confirmation items, or nothing when none were booked', () => {
    const { container, unmount } = render(<RentalSuccessCard lines={[]} currency="₹" depositRefundable />);
    expect(container).toBeEmptyDOMElement();
    unmount();
    render(<RentalSuccessCard lines={null} currency="₹" depositRefundable />);
    expect(screen.queryByTestId('checkout-success-rentals')).not.toBeInTheDocument();
  });

  it('shows what was booked and where it is collected', () => {
    render(<RentalSuccessCard lines={[{ item_id: 'i1', name: 'Racket', quantity: 2, rent: 200, deposit: 400 }] as never} currency="₹" depositRefundable />);
    expect(screen.getByTestId('checkout-success-rentals')).toHaveTextContent('Racket');
    expect(screen.getByTestId('rental-collect-notice')).toBeInTheDocument();
  });
});

describe('usePodRentalPicks', () => {
  it('starts empty with no pod, and with picks saved for this pod otherwise', () => {
    expect(renderHook(() => usePodRentalPicks(null)).result.current.picks).toEqual({});
    sessionStorage.setItem('duncit.podRent.p1', JSON.stringify({ i1: 2, i2: 0, i3: 'x' }));
    expect(renderHook(() => usePodRentalPicks('p1')).result.current.picks).toEqual({ i1: 2 });
  });

  it('ignores storage that holds nothing usable, or is blocked', () => {
    sessionStorage.setItem('duncit.podRent.p1', 'not json');
    expect(renderHook(() => usePodRentalPicks('p1')).result.current.picks).toEqual({});
    sessionStorage.setItem('duncit.podRent.p1', JSON.stringify('text'));
    expect(renderHook(() => usePodRentalPicks('p1')).result.current.picks).toEqual({});
    const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const { result } = renderHook(() => usePodRentalPicks('p1'));
    act(() => result.current.setQuantity('i1', 1));
    expect(result.current.picks).toEqual({ i1: 1 });
    get.mockRestore();
    set.mockRestore();
  });

  it('keeps whole quantities, removes an item set to zero, saves per pod and clears', () => {
    const { result } = renderHook(() => usePodRentalPicks('p1'));
    act(() => result.current.setQuantity('i1', 2.7));
    expect(result.current.picks).toEqual({ i1: 2 });
    expect(JSON.parse(sessionStorage.getItem('duncit.podRent.p1') ?? '{}')).toEqual({ i1: 2 });
    act(() => result.current.setQuantity('i1', 0));
    expect(result.current.picks).toEqual({});
    act(() => result.current.setQuantity('i2', 1));
    act(() => result.current.clear());
    expect(result.current.picks).toEqual({});
    expect(JSON.parse(sessionStorage.getItem('duncit.podRent.p1') ?? 'null')).toEqual({});
  });

  it('does not save anything without a pod, and reloads when the pod changes', () => {
    const none = renderHook(() => usePodRentalPicks(undefined));
    act(() => none.result.current.setQuantity('i1', 1));
    act(() => none.result.current.clear());
    expect(sessionStorage.length).toBe(0);
    sessionStorage.setItem('duncit.podRent.p2', JSON.stringify({ i9: 3 }));
    const { result, rerender } = renderHook(({ id }) => usePodRentalPicks(id), { initialProps: { id: 'p1' as string | null } });
    rerender({ id: 'p2' });
    expect(result.current.picks).toEqual({ i9: 3 });
    rerender({ id: null });
    expect(result.current.picks).toEqual({});
  });
});

describe('usePodRentals', () => {
  const answer = (over: object = {}) => ({ data: undefined, loading: false, error: undefined, refetch: vi.fn().mockResolvedValue(undefined), ...over });

  it('reads nothing for a pod with no venue or no id', () => {
    renderHook(() => usePodRentals('p1', false));
    expect(h.opts[0].skip).toBe(true);
    renderHook(() => usePodRentals(null, true));
    expect(h.opts[2].skip).toBe(true);
  });

  it('returns the catalogue and settings, loading only before the first answer', () => {
    h.queries = [answer({ data: { podRentals: catalogue() }, loading: true }), answer({ data: { publicRentalSettings: { enabled: true } } })];
    const { result } = renderHook(() => usePodRentals('p1', true));
    expect(result.current.catalogue).toEqual(catalogue());
    expect(result.current.settings).toEqual({ enabled: true });
    expect(result.current.loading).toBe(false);
    expect(h.opts[0].variables).toEqual({ pod_id: 'p1' });
    h.call = 0;
    h.queries = [answer({ loading: true }), answer()];
    expect(renderHook(() => usePodRentals('p1', true)).result.current.loading).toBe(true);
  });

  it('reports the catalogue error first, then the settings one, and re-reads both on refetch, ignoring failures', () => {
    const catError = new Error('cat');
    const setError = new Error('set');
    const cat = answer({ error: catError, refetch: vi.fn().mockRejectedValue(new Error('x')) });
    const set = answer({ error: setError, refetch: vi.fn().mockRejectedValue(new Error('y')) });
    h.queries = [cat, set];
    const { result } = renderHook(() => usePodRentals('p1', true));
    expect(result.current.error).toBe(catError);
    result.current.refetch();
    expect(cat.refetch).toHaveBeenCalledTimes(1);
    expect(set.refetch).toHaveBeenCalledTimes(1);
    h.call = 0;
    h.queries = [answer(), set];
    expect(renderHook(() => usePodRentals('p1', true)).result.current.error).toBe(setError);
    h.call = 0;
    h.queries = [answer(), answer()];
    expect(renderHook(() => usePodRentals('p1', true)).result.current.error).toBeNull();
  });
});

describe('useCheckoutRentals', () => {
  const answer = (over: object = {}) => ({ data: undefined, loading: false, error: undefined, refetch: vi.fn().mockResolvedValue(undefined), ...over });
  const pod = { id: 'p1', venue_id: 'v1', pod_mode: 'PHYSICAL' };

  it('is empty and unblocked for a virtual pod, a pod with no venue or no pod, and does not read rentals', () => {
    for (const p of [{ ...pod, pod_mode: 'VIRTUAL' }, { ...pod, venue_id: null }, null, undefined]) {
      h.call = 0;
      const { result } = renderHook(() => useCheckoutRentals(p as never, false));
      expect(result.current.totals.count).toBe(0);
      expect(result.current.blocked).toBe(false);
      expect(result.current.currency).toBe('');
      expect(result.current.venueTerms).toBe('');
    }
  });

  it('prices the picks, carries the venue terms, and blocks payment until the terms are agreed', () => {
    sessionStorage.setItem('duncit.podRent.p1', JSON.stringify({ i1: 2 }));
    h.queries = [answer({ data: { podRentals: catalogue() } }), answer({ data: { publicRentalSettings: { enabled: true } } })];
    const { result } = renderHook(() => useCheckoutRentals(pod as never, false));
    expect(result.current.totals.count).toBe(2);
    expect(result.current.selections).toEqual([{ item_id: 'i1', quantity: 2 }]);
    expect(result.current.currency).toBe('₹');
    expect(result.current.venueTerms).toBe('<p>Venue rules</p>');
    expect(result.current.blocked).toBe(true);
    h.call = 0;
    act(() => result.current.setAgreed(true));
    expect(result.current.blocked).toBe(false);
  });

  it('forgets the picks once the booking is paid', async () => {
    sessionStorage.setItem('duncit.podRent.p1', JSON.stringify({ i1: 2 }));
    h.queries = [answer({ data: { podRentals: catalogue() } }), answer()];
    renderHook(() => useCheckoutRentals(pod as never, true));
    await waitFor(() => expect(JSON.parse(sessionStorage.getItem('duncit.podRent.p1') ?? 'null')).toEqual({}));
  });
});

describe('PodShopRentTabs', () => {
  const tabs = (hasProducts: boolean) =>
    render(
      <MemoryRouter>
        <PodShopRentTabs idPrefix="pod" hasProducts={hasProducts} shop={<div data-testid="shop" />} rent={<div data-testid="rent" />} />
      </MemoryRouter>
    );

  it('shows rent alone when there are no products', () => {
    tabs(false);
    expect(screen.getByTestId('rent')).toBeInTheDocument();
    expect(screen.queryByTestId('shop')).not.toBeInTheDocument();
  });

  it('switches between shop and rent when the pod has both', async () => {
    tabs(true);
    expect(screen.getByTestId('shop')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('pod-tab-rent'));
    expect(await screen.findByTestId('rent')).toBeInTheDocument();
    expect(screen.queryByTestId('shop')).not.toBeInTheDocument();
  });
});
