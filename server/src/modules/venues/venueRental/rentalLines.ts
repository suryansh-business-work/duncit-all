import { idText } from '@modules/commerce/store/store.shared';

/**
 * The rented-item lines a pod payment carries, as checkout froze them on
 * `metadata.rental_lines`, and the add-on money that never belongs to the pod.
 *
 * Imports nothing, so settlement, refunds and the invoice can read a payment's
 * rentals without pulling the venue models in behind them.
 */

export type RentalUnit = 'SLOT' | 'HOUR';

/** One priced rental line, frozen at checkout so a later rate change cannot
 * rewrite what the guest paid for. */
export interface RentalLine {
  item_id: string;
  name: string;
  image_url: string;
  unit: RentalUnit;
  /** Rupees for one unit for one slot, or one hour. */
  rate: number;
  /** What the rate was multiplied by: 1 for a SLOT item, the pod's hours for HOUR. */
  units: number;
  quantity: number;
  /** rate × units × quantity. */
  rent: number;
  /** Refundable deposit for every unit of this line. */
  deposit: number;
}

const num = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

/** The rental lines on a payment's metadata. Metadata is Mixed, so every field is read defensively. */
export function paymentRentalLines(metadata: unknown): RentalLine[] {
  const raw = (metadata as { rental_lines?: unknown } | null | undefined)?.rental_lines;
  if (!Array.isArray(raw)) return [];
  return raw.map((entry) => {
    const line = (entry ?? {}) as Record<string, unknown>;
    return {
      item_id: idText(line.item_id),
      name: typeof line.name === 'string' ? line.name : '',
      image_url: typeof line.image_url === 'string' ? line.image_url : '',
      unit: line.unit === 'HOUR' ? 'HOUR' : 'SLOT',
      rate: num(line.rate),
      units: num(line.units),
      quantity: num(line.quantity),
      rent: num(line.rent),
      deposit: num(line.deposit),
    };
  });
}

/**
 * The money on a pod payment that is not ticket money: product add-ons and
 * rented items (rent and deposit). Neither enters the pod's waterfall, neither
 * is per-seat, and neither is the venue's share of the ticket — every reader
 * that nets a payment down to its ticket money subtracts this.
 */
export function addOnMoneyOf(metadata: unknown): number {
  const meta = (metadata ?? {}) as { product_cost_total?: unknown; rental_total?: unknown };
  return Math.max(0, num(meta.product_cost_total)) + Math.max(0, num(meta.rental_total));
}

/** Invoice rows printed in their own "Rented items" block, apart from the ticket and products. */
export const RENTAL_INVOICE_SECTION = 'RENTAL' as const;

// A type alias, not an interface: the invoice reads these rows as plain records.
export type RentalInvoiceLine = {
  name: string;
  quantity: number;
  gross: number;
  image_url: string;
  section: typeof RENTAL_INVOICE_SECTION;
};

/** The rental lines as invoice rows: the rent, and the refundable deposit on its own row. */
export function rentalInvoiceLines(metadata: unknown): RentalInvoiceLine[] {
  return paymentRentalLines(metadata).flatMap((line) => {
    const section = RENTAL_INVOICE_SECTION;
    const rows: RentalInvoiceLine[] = [
      { name: `${line.name} (rent)`, quantity: line.quantity, gross: line.rent, image_url: line.image_url, section },
    ];
    if (line.deposit > 0) {
      rows.push({ name: `${line.name} (refundable deposit)`, quantity: line.quantity, gross: line.deposit, image_url: '', section });
    }
    return rows;
  });
}
