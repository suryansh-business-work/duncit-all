jest.mock('@modules/pods/pod/pod.model', () => ({ PodModel: {} }));
jest.mock('@modules/venues/venue/venue.model', () => ({ VenueModel: {} }));
jest.mock('@modules/finance/finance/paymentRelease.model', () => ({ PaymentReleaseModel: {} }));
jest.mock('@modules/finance/finance/finance.model', () => ({ getFinanceSettings: jest.fn() }));
jest.mock('../../rentalBooking.model', () => ({ RentalBookingModel: {} }));
jest.mock('../../rentalLifecycle.service', () => ({ rentalLifecycleService: {} }));

import { rentalItemFitsPod } from '@modules/venues/venue/venue.rentals';
import { payoutSplit } from '../../rentalPayout.service';

/*
  Two rules of rented items that move money or decide who sees what:
  - an item is offered only on pods of the categories the venue chose for it,
    so a racket never reaches a book club (and a checkout cannot buy it there);
  - a venue's payout says how much of it is rent after commission and how much
    is deposits it already handed back to guests in cash at the venue.
*/

const row = (superId: string, subId: string) => ({
  super_category_id: superId,
  category_id: `${superId}-mid`,
  sub_category_id: subId,
  super_category_name: '',
  category_name: '',
  sub_category_name: '',
});

describe('rentalItemFitsPod', () => {
  const racket = { categories: [row('sports', 'badminton'), row('sports', 'tennis')] };

  it('offers an item on a pod whose club category is one of its rows', () => {
    expect(rentalItemFitsPod(racket, { super_category_id: 'sports', sub_category_id: 'tennis' })).toBe(true);
  });

  it('hides it from a pod in any other category, even under the same super category', () => {
    expect(rentalItemFitsPod(racket, { super_category_id: 'books', sub_category_id: 'fiction' })).toBe(false);
    expect(rentalItemFitsPod(racket, { super_category_id: 'sports', sub_category_id: 'football' })).toBe(false);
    // The sub alone is not enough: it must sit under the same super.
    expect(rentalItemFitsPod(racket, { super_category_id: 'games', sub_category_id: 'tennis' })).toBe(false);
  });

  it('fails closed: a pod with no category, or an item with none, offers nothing', () => {
    expect(rentalItemFitsPod(racket, null)).toBe(false);
    expect(rentalItemFitsPod(racket, { super_category_id: 'sports', sub_category_id: null })).toBe(false);
    expect(rentalItemFitsPod(racket, { super_category_id: null, sub_category_id: 'tennis' })).toBe(false);
    expect(rentalItemFitsPod({ categories: [] }, { super_category_id: 'sports', sub_category_id: 'tennis' })).toBe(false);
  });
});

describe('payoutSplit', () => {
  it('splits a payout into rent after commission and the deposits settled at the venue', () => {
    const split = payoutSplit([
      // Returned: rent 1000 − 100 commission + the whole 500 deposit, all 500 handed back in cash.
      { venue_amount: 1400, status: 'RETURNED', deposit_amount: 500, deposit_at_venue: 500, refund_due: 0 },
      // Damaged: 300 handed back, the venue still receives the whole 400 deposit.
      { venue_amount: 670, status: 'DAMAGED', deposit_amount: 400, deposit_at_venue: 300, refund_due: 0 },
    ]);
    expect(split).toEqual({ rent: 1170, deposits: 900, handedBack: 800 });
  });

  it('counts no deposit for a guest who left the pod: Duncit refunded that one itself', () => {
    const split = payoutSplit([
      { venue_amount: 450, status: 'RELEASED', deposit_amount: 300, deposit_at_venue: 0, refund_due: 300 },
    ]);
    expect(split).toEqual({ rent: 450, deposits: 0, handedBack: 0 });
  });

  it('reads a booking closed before deposits moved to the venue as refunded through Finance', () => {
    // The old rule: the deposit went back through the gateway and the venue earned rent only.
    const split = payoutSplit([{ venue_amount: 900, status: 'RETURNED', deposit_amount: 500, refund_due: 500 }]);
    expect(split).toEqual({ rent: 900, deposits: 0, handedBack: 0 });
  });

  it('reads a deposit with no cash recorded as nothing handed back', () => {
    const split = payoutSplit([{ venue_amount: 1400, status: 'RETURNED', deposit_amount: 500 }]);
    expect(split).toEqual({ rent: 900, deposits: 500, handedBack: 0 });
  });
});
