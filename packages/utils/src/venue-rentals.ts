/**
 * Rented items — the contract every surface shares: the GraphQL documents, the
 * row shapes, the label keys and the client-side price of a selection (rule 40).
 *
 * The SERVER prices a rental (rentalCheckout.ts) and refuses anything it would
 * not sell; the math here only mirrors it so a guest sees the same number
 * before paying. Copy is the `venueRentals` namespace.
 */

import { formatMoney } from './format-money';

/** Where a member's rented-items history lives on mWeb (the sidebar's Shop row). */
export const MY_RENTED_ITEMS_PATH = '/rented-items';

export type RentalUnit = 'SLOT' | 'HOUR';
export type RentalBookingStatus = 'BOOKED' | 'UNAVAILABLE' | 'CANCELLED' | 'RELEASED' | 'RETURNED' | 'DAMAGED';
export type RentalRefundStatus = 'NONE' | 'DUE' | 'PAID' | 'IN_PAYMENT';
export type RentalClosedReason = 'DISABLED' | 'NO_VENUE' | 'CUTOFF';

export interface PodRentalItem {
  id: string;
  name: string;
  description: string;
  images: string[];
  unit: RentalUnit;
  rate: number;
  deposit: number;
  available: number;
  per_guest_limit: number;
}

export interface PodRentalCatalogue {
  open: boolean;
  closed_reason: RentalClosedReason | null;
  hours: number;
  currency_symbol: string;
  /** The venue's own rental terms (rich-text HTML, written by the venue): sanitise before rendering. */
  venue_terms_html: string;
  items: PodRentalItem[];
}

export interface PublicRentalSettings {
  enabled: boolean;
  terms_html: string;
  rent_refundable_on_backout: boolean;
  deposit_refundable: boolean;
  booking_cutoff_hours: number;
}

export interface RentalBookingRow {
  id: string;
  currency_symbol: string;
  payment_ref: string;
  pod_id: string;
  pod_title: string;
  guest_name: string;
  venue_id: string;
  item_id: string;
  name: string;
  image_url: string;
  unit: RentalUnit;
  rate: number;
  units: number;
  quantity: number;
  rent_amount: number;
  deposit_amount: number;
  status: RentalBookingStatus;
  damage_claim: number;
  damage_note: string;
  refund_due: number;
  refund_status: RentalRefundStatus;
  refund_ref: string;
  refunded_at: string | null;
  commission_pct: number;
  commission_amount: number;
  venue_amount: number;
  release_id: string | null;
  marked_at: string | null;
  auto_released: boolean;
  created_at: string;
}

export interface RentalVenueStats {
  currency_symbol: string;
  bookings: number;
  open: number;
  rent_total: number;
  deposits_held: number;
  earned: number;
  paid_out: number;
}

/** What a checkout sends for one item: the server prices it. */
export interface RentalSelection {
  item_id: string;
  quantity: number;
}

export const RENTAL_BOOKING_STATUSES: readonly RentalBookingStatus[] = [
  'BOOKED',
  'UNAVAILABLE',
  'CANCELLED',
  'RELEASED',
  'RETURNED',
  'DAMAGED',
];
export const RENTAL_REFUND_STATUSES: readonly RentalRefundStatus[] = ['NONE', 'DUE', 'PAID', 'IN_PAYMENT'];

/** Rental money as every surface prints it: the platform symbol, paise only when there are some. */
export const rentalMoney = (symbol: string, amount: number): string =>
  formatMoney(amount, { symbol, decimals: Number.isInteger(amount) ? 0 : 2 });

// Every key written out whole: the translation gate finds keys by their literal text.
const STATUS_KEY: Record<RentalBookingStatus, string> = {
  BOOKED: 'venueRentals.status.BOOKED',
  UNAVAILABLE: 'venueRentals.status.UNAVAILABLE',
  CANCELLED: 'venueRentals.status.CANCELLED',
  RELEASED: 'venueRentals.status.RELEASED',
  RETURNED: 'venueRentals.status.RETURNED',
  DAMAGED: 'venueRentals.status.DAMAGED',
};
const REFUND_KEY: Record<RentalRefundStatus, string> = {
  NONE: 'venueRentals.refund.NONE',
  DUE: 'venueRentals.refund.DUE',
  PAID: 'venueRentals.refund.PAID',
  IN_PAYMENT: 'venueRentals.refund.IN_PAYMENT',
};
const UNIT_KEY: Record<RentalUnit, string> = {
  SLOT: 'venueRentals.unit.SLOT',
  HOUR: 'venueRentals.unit.HOUR',
};

/** Read as the server sends them (plain strings, or a client's generated enum); an unknown value reads as the first. */
const pick = <T extends string>(list: readonly T[], value: unknown, fallback: T): T =>
  list.find((item) => item === String(value)) ?? fallback;

export const rentalStatusKey = (status: unknown) => STATUS_KEY[pick(RENTAL_BOOKING_STATUSES, status, 'BOOKED')];
export const rentalRefundKey = (status: unknown) => REFUND_KEY[pick(RENTAL_REFUND_STATUSES, status, 'NONE')];
export const rentalUnitKey = (unit: unknown) => UNIT_KEY[pick(['SLOT', 'HOUR'] as const, unit, 'SLOT')];

/** The sentence that says why renting is closed for a pod, or null while it is open. */
export function rentalClosedKey(catalogue: Pick<PodRentalCatalogue, 'open' | 'closed_reason'>): string | null {
  if (catalogue.open) return null;
  if (catalogue.closed_reason === 'CUTOFF') return 'venueRentals.guest.closedCutoff';
  if (catalogue.closed_reason === 'DISABLED') return 'venueRentals.guest.closedDisabled';
  return 'venueRentals.guest.none';
}

/** Only a booking still out can be marked returned or damaged. */
export const canMarkRental = (row: { status: unknown }) => String(row.status) === 'BOOKED';
/** Only a refund owed can be recorded as paid. */
export const canRecordRentalRefund = (row: { refund_status: unknown }) => String(row.refund_status) === 'DUE';

/** The most of one item a booking may take: the venue's per-guest limit for every seat, never past what is left. */
export function rentalMaxQuantity(item: Pick<PodRentalItem, 'available' | 'per_guest_limit'>, seats: number): number {
  return Math.max(0, Math.min(item.available, item.per_guest_limit * Math.max(1, Math.floor(seats))));
}

export interface RentalSelectionTotals {
  rent: number;
  deposit: number;
  /** rent + deposit: charged in full, never couponed or paid in coins. */
  total: number;
  /** Units picked across every item. */
  count: number;
}

/**
 * The selection's price, the server's way: a SLOT item's rate covers the pod,
 * an HOUR item's rate is per hour of it; the deposit is per unit. Items no
 * longer listed, and quantities of 0 or less, count for nothing.
 */
export function rentalSelectionTotals(
  items: readonly PodRentalItem[],
  picks: Readonly<Record<string, number>>,
  hours: number
): RentalSelectionTotals {
  let rent = 0;
  let deposit = 0;
  let count = 0;
  for (const item of items) {
    const quantity = Math.floor(picks[item.id] ?? 0);
    if (quantity <= 0) continue;
    const units = item.unit === 'HOUR' ? Math.max(1, hours) : 1;
    rent += item.rate * units * quantity;
    deposit += item.deposit * quantity;
    count += quantity;
  }
  return { rent, deposit, total: rent + deposit, count };
}

/** The picks as the checkout input sends them, dropping zero lines. */
export const rentalSelections = (picks: Readonly<Record<string, number>>): RentalSelection[] =>
  Object.entries(picks)
    .filter(([, quantity]) => quantity > 0)
    .map(([item_id, quantity]) => ({ item_id, quantity }));

const ITEM_FIELDS = 'id name description images unit rate deposit available per_guest_limit';

const BOOKING_FIELDS = `id currency_symbol payment_ref pod_id pod_title guest_name venue_id item_id name image_url unit rate units quantity
  rent_amount deposit_amount status damage_claim damage_note refund_due refund_status refund_ref refunded_at
  commission_pct commission_amount venue_amount release_id marked_at auto_released created_at`;

export const POD_RENTALS_QUERY = `query PodRentals($pod_id: ID!) {
  podRentals(pod_id: $pod_id) { open closed_reason hours currency_symbol venue_terms_html items { ${ITEM_FIELDS} } }
}`;

export const PUBLIC_RENTAL_SETTINGS_QUERY = `query PublicRentalSettings {
  publicRentalSettings { enabled terms_html rent_refundable_on_backout deposit_refundable booking_cutoff_hours }
}`;

export const MY_RENTAL_BOOKINGS_QUERY = `query MyRentalBookings($limit: Int, $offset: Int) {
  myRentalBookings(limit: $limit, offset: $offset) { ${BOOKING_FIELDS} }
}`;

export const RENTAL_BOOKINGS_TABLE_QUERY = `query RentalBookingsTable($query: TableQueryInput) {
  rentalBookingsTable(query: $query) { total page page_size rows { ${BOOKING_FIELDS} } }
}`;

export const VENUE_RENTAL_BOOKINGS_TABLE_QUERY = `query VenueRentalBookingsTable($venue_id: ID!, $query: TableQueryInput) {
  venueRentalBookingsTable(venue_id: $venue_id, query: $query) { total page page_size rows { ${BOOKING_FIELDS} } }
}`;

export const VENUE_RENTAL_STATS_QUERY = `query VenueRentalStats($venue_id: ID!) {
  venueRentalStats(venue_id: $venue_id) { currency_symbol bookings open rent_total deposits_held earned paid_out }
}`;

export const MARK_RENTAL_BOOKING_MUTATION = `mutation MarkRentalBooking($id: ID!, $input: MarkRentalBookingInput!) {
  markRentalBooking(id: $id, input: $input) { ${BOOKING_FIELDS} }
}`;

export const MARK_RENTAL_REFUNDED_MUTATION = `mutation MarkRentalRefunded($id: ID!, $reference: String!) {
  markRentalRefunded(id: $id, reference: $reference) { ${BOOKING_FIELDS} }
}`;

/* ------------------------------------------------------------------ *
 * The venue's own list: what the rented-items editor loads and saves.
 * ------------------------------------------------------------------ */

export interface VenueRentalItem {
  id: string;
  name: string;
  description: string;
  images: string[];
  unit: RentalUnit;
  rate: number;
  deposit: number;
  stock: number;
  per_guest_limit: number;
  is_available: boolean;
}

export interface RentalsVenue {
  id: string;
  venue_name: string;
  status: string;
  offers_rentals: boolean;
  rental_items: VenueRentalItem[];
  /** The venue's own rental terms (rich-text HTML), shown with Duncit's. */
  rental_terms_html: string;
  /** Whether its refundable deposits are taxed with the rent — the Venues console decides. */
  rental_deposit_gst: boolean;
}

/** The editor's caps, from venueRegistrationConfig — never hardcoded in a client. */
export interface RentalItemsConfig {
  rental_units: RentalUnit[];
  rental_item_limit: number;
  rental_image_limit: number;
  rental_rate_max: number;
  rental_deposit_max: number;
  rental_stock_max: number;
  rental_per_guest_max: number;
  rental_terms_max: number;
}

/** One item as the form holds it: numbers stay as typed until they are checked. */
export interface RentalItemValues {
  id: string | null;
  name: string;
  description: string;
  images: string[];
  unit: RentalUnit;
  rate: number | string;
  deposit: number | string;
  stock: number | string;
  per_guest_limit: number | string;
  is_available: boolean;
}

export interface RentalItemsValues {
  offers_rentals: boolean;
  items: RentalItemValues[];
  /** The venue's own rental terms, as rich-text HTML. */
  rental_terms_html: string;
}

export const emptyRentalItem = (): RentalItemValues => ({
  id: null,
  name: '',
  description: '',
  images: [],
  unit: 'SLOT',
  rate: '',
  deposit: 0,
  stock: 1,
  per_guest_limit: 1,
  is_available: true,
});

export const rentalItemsToValues = (
  venue: Pick<RentalsVenue, 'offers_rentals' | 'rental_items' | 'rental_terms_html'>
): RentalItemsValues => ({
  offers_rentals: venue.offers_rentals,
  items: venue.rental_items.map((item) => ({ ...item, images: [...item.images] })),
  rental_terms_html: venue.rental_terms_html ?? '',
});

/** What updateApprovedVenue is sent: the whole list, with each kept item's id so its bookings stay linked. */
export function toVenueRentalsInput(values: RentalItemsValues) {
  return {
    offers_rentals: values.offers_rentals,
    rental_terms_html: values.rental_terms_html,
    rental_items: values.items.map((item) => ({
      ...(item.id ? { id: item.id } : {}),
      name: item.name.trim(),
      description: item.description.trim(),
      images: item.images,
      unit: item.unit,
      rate: Number(item.rate),
      deposit: Number(item.deposit),
      stock: Number(item.stock),
      per_guest_limit: Number(item.per_guest_limit),
      is_available: item.is_available,
    })),
  };
}

/** Only an approved venue edits its live listing. */
export const isRentalListEditable = (venue: Pick<RentalsVenue, 'status'>): boolean => venue.status === 'APPROVED';

const RENTALS_VENUE_FIELDS = `id venue_name status offers_rentals rental_terms_html rental_deposit_gst
  rental_items { id name description images unit rate deposit stock per_guest_limit is_available }`;

export const OWNER_RENTAL_ITEMS_QUERY = `query OwnerVenueRentalItems($venue_id: ID!) {
  myVenue(venue_id: $venue_id) { ${RENTALS_VENUE_FIELDS} }
}`;

/** Any venue, for a Venues console editor. */
export const ADMIN_RENTAL_ITEMS_QUERY = `query AdminVenueRentalItems($venue_id: ID!) {
  venue(venue_doc_id: $venue_id) { ${RENTALS_VENUE_FIELDS} }
}`;

export const RENTAL_ITEMS_CONFIG_QUERY = `query VenueRentalItemsConfig {
  venueRegistrationConfig { rental_units rental_item_limit rental_image_limit rental_rate_max
    rental_deposit_max rental_stock_max rental_per_guest_max rental_terms_max }
}`;

export const UPDATE_VENUE_RENTALS_MUTATION = `mutation UpdateVenueRentals($venue_id: ID!, $input: UpdateApprovedVenueInput!) {
  updateApprovedVenue(venue_id: $venue_id, input: $input) { ${RENTALS_VENUE_FIELDS} }
}`;

/** An upcoming pod a guest can still rent items for — Pod Rent on /shop. */
export interface RentablePod {
  id: string;
  /** Public ids: the pod page is /club/<club_id>/pod/<pod_id>. */
  pod_id: string;
  club_id: string;
  pod_title: string;
  pod_date_time: string | null;
  cover_url: string;
  venue_name: string;
  item_count: number;
  from_rate: number;
  currency_symbol: string;
}

export const RENTABLE_PODS_QUERY = `query RentablePods($limit: Int) {
  rentablePods(limit: $limit) { id pod_id club_id pod_title pod_date_time cover_url venue_name item_count from_rate currency_symbol }
}`;

/**
 * What a pod checkout carries for rented items: only picks the venue still
 * lists while renting is open, priced the server's way, and the selections the
 * pay input sends. One rule for mWeb's and the app's checkout.
 */
export function checkoutRentalLines(
  catalogue: PodRentalCatalogue | null | undefined,
  picks: Readonly<Record<string, number>>
): { totals: RentalSelectionTotals; selections: RentalSelection[] } {
  if (!catalogue?.open) return { totals: rentalSelectionTotals([], {}, 1), selections: [] };
  const ids = new Set(catalogue.items.map((item) => item.id));
  const listed = Object.fromEntries(Object.entries(picks).filter(([id]) => ids.has(id)));
  return { totals: rentalSelectionTotals(catalogue.items, listed, catalogue.hours), selections: rentalSelections(listed) };
}

/** Venues console: whether the venue's refundable deposits are taxed with the rent. */
export const SET_VENUE_RENTAL_DEPOSIT_GST_MUTATION = `mutation SetVenueRentalDepositGst($venue_id: ID!, $charge_gst: Boolean!) {
  setVenueRentalDepositGst(venue_id: $venue_id, charge_gst: $charge_gst) { venue_id rental_deposit_gst }
}`;
