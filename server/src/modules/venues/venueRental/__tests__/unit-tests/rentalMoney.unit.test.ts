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
  it('pays a returned item to the venue less commission on rent only, and gives the deposit back', () => {
    const money = settleRentalOutcome(booking, 'RETURNED', rules);
    expect(money).toEqual({ refund_due: 500, venue_amount: 900, commission_amount: 100, damage_claim: 0 });
    expect(splitsEverything(money)).toBe(1500);
  });

  it('lets the venue keep the deposit when Finance made deposits non-refundable, with no commission on it', () => {
    const money = settleRentalOutcome(booking, 'RETURNED', { ...rules, deposit_refundable: false });
    expect(money).toEqual({ refund_due: 0, venue_amount: 1400, commission_amount: 100, damage_claim: 0 });
    expect(splitsEverything(money)).toBe(1500);
  });

  it('keeps a damage claim from the deposit and returns the rest', () => {
    const money = settleRentalOutcome(booking, 'DAMAGED', rules, 200);
    expect(money).toEqual({ refund_due: 300, venue_amount: 1100, commission_amount: 100, damage_claim: 200 });
    expect(splitsEverything(money)).toBe(1500);
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
    expect(money).toEqual({ refund_due: 1500, venue_amount: 0, commission_amount: 0, damage_claim: 0 });
  });

  it('keeps the rent for the venue on a backout when it is not refundable, the deposit still comes back', () => {
    const money = settleRentalOutcome(booking, 'RELEASED', { ...rules, rent_refundable_on_backout: false });
    expect(money).toEqual({ refund_due: 500, venue_amount: 900, commission_amount: 100, damage_claim: 0 });
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

  it('prints the rent and, when there is one, the deposit as their own invoice rows', () => {
    expect(rentalInvoiceLines(metadata)).toEqual([
      { name: 'Racket (rent)', quantity: 2, gross: 600, image_url: 'r.jpg' },
      { name: 'Racket (deposit)', quantity: 2, gross: 400, image_url: '' },
      { name: 'Shoes (rent)', quantity: 1, gross: 500, image_url: '' },
    ]);
  });
});
