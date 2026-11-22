import { settleRentalOutcome, type OutcomeRules } from '../../rentalOutcome';
import { addOnMoneyOf, paymentRentalLines, rentalInvoiceLines } from '../../rentalLines';

/*
  The money rules of a closed rental. Every outcome must split exactly what the
  guest paid — refund + venue + commission = rent + deposit — or Finance pays
  out money nobody collected (or keeps money owed back).
*/

const booking = { rent_amount: 1000, deposit_amount: 500 };
const rules: OutcomeRules = { commission_pct: 10, deposit_refundable: true, rent_refundable_on_backout: true };

const splitsEverything = (money: ReturnType<typeof settleRentalOutcome>) =>
  money.refund_due + money.venue_amount + money.commission_amount;

describe('settleRentalOutcome', () => {
  it('refunds a returned item’s whole deposit to the guest through Razorpay, the venue earning rent less commission', () => {
    const money = settleRentalOutcome(booking, 'RETURNED', rules);
    expect(money).toEqual({
      refund_due: 500,
      deposit_at_venue: 0,
      venue_amount: 900,
      commission_amount: 100,
      damage_claim: 0,
    });
    expect(splitsEverything(money)).toBe(1500);
  });

  it('refunds nothing when Finance made deposits non-refundable: the venue keeps the deposit, with no commission on it', () => {
    const money = settleRentalOutcome(booking, 'RETURNED', { ...rules, deposit_refundable: false });
    expect(money).toEqual({
      refund_due: 0,
      deposit_at_venue: 0,
      venue_amount: 1400,
      commission_amount: 100,
      damage_claim: 0,
    });
    expect(splitsEverything(money)).toBe(1500);
  });

  it('refunds the deposit less the damage claim, and pays the venue only the claim on top of its rent', () => {
    const money = settleRentalOutcome(booking, 'DAMAGED', rules, 200);
    expect(money).toEqual({
      refund_due: 300,
      deposit_at_venue: 0,
      venue_amount: 1100,
      commission_amount: 100,
      damage_claim: 200,
    });
    expect(splitsEverything(money)).toBe(1500);
  });

  it('refunds nothing for an item kept whole as damage, the venue receiving the whole deposit', () => {
    const money = settleRentalOutcome(booking, 'DAMAGED', rules, 500);
    expect(money.refund_due).toBe(0);
    expect(money.venue_amount).toBe(1400);
    expect(splitsEverything(money)).toBe(1500);
  });

  it('never asks a venue to hand cash back any more', () => {
    for (const outcome of ['RETURNED', 'DAMAGED', 'RELEASED'] as const) {
      expect(settleRentalOutcome(booking, outcome, rules, 100).deposit_at_venue).toBe(0);
    }
  });

  it('refunds paise exactly: a deposit of 25.50 less a 0.25 claim', () => {
    const money = settleRentalOutcome({ rent_amount: 0, deposit_amount: 25.5 }, 'DAMAGED', rules, 0.25);
    expect(money.refund_due).toBe(25.25);
    expect(money.venue_amount).toBe(0.25);
  });

  it('never claims more than the deposit, nor a negative amount', () => {
    expect(settleRentalOutcome(booking, 'DAMAGED', rules, 9999).damage_claim).toBe(500);
    expect(settleRentalOutcome(booking, 'DAMAGED', rules, -50).damage_claim).toBe(0);
  });

  it('ignores a claim on an item that came back fine', () => {
    expect(settleRentalOutcome(booking, 'RETURNED', rules, 200).damage_claim).toBe(0);
  });

  it('refunds rent and deposit to a guest who left the pod when rent is refundable on backout', () => {
    const money = settleRentalOutcome(booking, 'RELEASED', rules);
    expect(money).toEqual({ refund_due: 1500, deposit_at_venue: 0, venue_amount: 0, commission_amount: 0, damage_claim: 0 });
  });

  it('keeps the rent for the venue on a backout when it is not refundable, Duncit still returns the deposit', () => {
    const money = settleRentalOutcome(booking, 'RELEASED', { ...rules, rent_refundable_on_backout: false });
    expect(money).toEqual({ refund_due: 500, deposit_at_venue: 0, venue_amount: 900, commission_amount: 100, damage_claim: 0 });
    // The item never went out, so even a non-refundable deposit comes back.
    expect(
      settleRentalOutcome(booking, 'RELEASED', { ...rules, rent_refundable_on_backout: false, deposit_refundable: false })
        .refund_due
    ).toBe(500);
  });

  it('rounds the commission to paise and still splits everything', () => {
    const money = settleRentalOutcome({ rent_amount: 333, deposit_amount: 0 }, 'RETURNED', {
      ...rules,
      commission_pct: 12.5,
    });
    expect(money.commission_amount).toBe(41.63);
    expect(money.venue_amount).toBe(291.37);
    expect(splitsEverything(money)).toBeCloseTo(333, 2);
  });
});

describe('rental lines on a payment', () => {
  const metadata = {
    product_cost_total: 250,
    rental_total: 1500,
    rental_lines: [
      { item_id: 'i1', name: 'Racket', image_url: 'r.jpg', unit: 'HOUR', rate: 100, units: 3, quantity: 2, rent: 600, deposit: 400 },
      { item_id: 'i2', name: 'Shoes', unit: 'BOGUS', rate: 'x', quantity: 1, rent: 500, deposit: 0 },
    ],
  };

  it('counts products and rentals as the money that is not ticket money', () => {
    expect(addOnMoneyOf(metadata)).toBe(1750);
    expect(addOnMoneyOf({ rental_total: -5, product_cost_total: 'nope' })).toBe(0);
    expect(addOnMoneyOf(null)).toBe(0);
  });

  it('reads stored lines defensively: unknown units read as SLOT, junk numbers as 0', () => {
    const lines = paymentRentalLines(metadata);
    expect(lines[0]).toMatchObject({ unit: 'HOUR', rent: 600, deposit: 400 });
    expect(lines[1]).toMatchObject({ unit: 'SLOT', rate: 0, image_url: '' });
    expect(paymentRentalLines({ rental_lines: 'nope' })).toEqual([]);
  });

  it('prints the rent and, when there is one, the refundable deposit as their own rows in the rented-items section', () => {
    expect(rentalInvoiceLines(metadata)).toEqual([
      { name: 'Racket (rent)', quantity: 2, gross: 600, image_url: 'r.jpg', section: 'RENTAL' },
      { name: 'Racket (refundable deposit)', quantity: 2, gross: 400, image_url: '', section: 'RENTAL' },
      { name: 'Shoes (rent)', quantity: 1, gross: 500, image_url: '', section: 'RENTAL' },
    ]);
  });
});
