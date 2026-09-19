import { GraphQLError } from 'graphql';
import { logs } from '@observability/log';
import {
  BrandPickupLocationModel,
  type IBrandPickupLocation,
} from '@modules/venues/brandPickupLocation/brandPickupLocation.model';
import type { IProductOrder } from '@modules/commerce/productOrder/productOrder.model';
import { getShiprocketAccount } from './shiprocket.account';
import { shiprocketLoginState } from './shiprocket.client';
import {
  listPickupLocations,
  ndrAction,
  walletBalance,
  type NdrAction,
  type ShiprocketPickup,
} from './shiprocket.gateway';

/**
 * The operator's side of ShipRocket: answering a failed delivery, keeping our
 * warehouses in step with the account's pickup addresses, and the account's
 * health at a glance (credentials, wallet, webhook key).
 */

const bad = (message: string): never => {
  throw new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });
};

const NDR_ACTIONS = new Set<NdrAction>(['re-attempt', 'return']);

/** Answer an NDR: ask the courier to try again, or to bring the parcel back (RTO). */
export async function answerNdr(order: IProductOrder, action: NdrAction, comments: string) {
  if (!NDR_ACTIONS.has(action)) bad('Choose re-attempt or return');
  if (order.fulfilment_status !== 'NDR' || !order.shiprocket.awb) bad('This order has no failed delivery to answer');
  const note = String(comments ?? '').trim().slice(0, 300) || (action === 're-attempt' ? 'Please re-attempt delivery' : 'Return to origin');
  await ndrAction(order.shiprocket.awb, action, note);
  order.shiprocket.ndr_action = action;
  order.shiprocket.ndr_actioned_at = new Date();
  order.shiprocket.alert = '';
  order.shiprocket.alert_message = '';
  order.tracking_events.push({
    status: action === 're-attempt' ? 'NDR_REATTEMPT' : 'NDR_RETURN',
    code: 0,
    location: '',
    note,
    at: new Date(),
  } as any);
  await order.save();
  return order;
}

/** UNKNOWN: ShipRocket could not be read, so nothing is said about it. */
export type PickupSyncState = 'READY' | 'AWAITING_VERIFICATION' | 'NOT_IN_SHIPROCKET' | 'UNKNOWN';

const AWAITING_VERIFICATION = 'Awaiting phone verification in ShipRocket';

const nicknameKey = (nickname: string) => String(nickname).trim().toLowerCase();

const stateOf = (match: ShiprocketPickup | null): PickupSyncState => {
  if (!match) return 'NOT_IN_SHIPROCKET';
  return match.verified ? 'READY' : 'AWAITING_VERIFICATION';
};

/** Record on the warehouse what ShipRocket says about it. */
async function recordMatch(w: IBrandPickupLocation, match: ShiprocketPickup | null, state: PickupSyncState) {
  w.shiprocket_registered = !!match;
  w.shiprocket_pickup_id = match?.id ?? w.shiprocket_pickup_id;
  w.shiprocket_error = state === 'AWAITING_VERIFICATION' ? AWAITING_VERIFICATION : '';
  if (state === 'NOT_IN_SHIPROCKET') w.shiprocket_error = `No ShipRocket pickup address is named "${w.nickname}"`;
  await w.save();
}

/** The account's pickups, or why they could not be read. */
async function readPickups(): Promise<{ pickups: ShiprocketPickup[] | null; error: string }> {
  try {
    return { pickups: await listPickupLocations(), error: '' };
  } catch (error) {
    return { pickups: null, error: (error as Error).message };
  }
}

/**
 * Match every warehouse to the ShipRocket pickup address with the same
 * nickname (the name `pickup_location` must equal on every order), record
 * what ShipRocket says, and list the account's pickups no warehouse uses.
 * When ShipRocket cannot be read the warehouses are still listed — as
 * UNKNOWN, with the reason — so they can be managed while the account is fixed.
 */
export async function syncPickupLocations() {
  const [{ pickups, error }, warehouses] = await Promise.all([
    readPickups(),
    BrandPickupLocationModel.find({}).sort({ owner_kind: 1, nickname: 1 }),
  ]);
  const byNickname = new Map((pickups ?? []).map((p) => [nicknameKey(p.nickname), p]));
  const used = new Set<string>();
  const rows = [];
  for (const w of warehouses) {
    const match = byNickname.get(nicknameKey(w.nickname)) ?? null;
    if (match) used.add(nicknameKey(match.nickname));
    const state = pickups ? stateOf(match) : 'UNKNOWN';
    if (pickups) await recordMatch(w, match, state);
    rows.push({ warehouse: w, shiprocket_state: state });
  }
  const unmatched = (pickups ?? [])
    .filter((p) => !used.has(nicknameKey(p.nickname)))
    .map((p) => ({ nickname: p.nickname, city: p.city, pincode: p.pincode, verified: p.verified }));
  return { warehouses: rows, shiprocket_only: unmatched, shiprocket_error: error, synced_at: new Date().toISOString() };
}

/**
 * Make a warehouse of a pickup address that is on the ShipRocket account but
 * not ours yet — the quickest way to a ready pickup, since ShipRocket has
 * already verified it. It is Duncit's own; the store's products can ship from it.
 */
export async function importShiprocketPickup(nickname: string) {
  const key = nicknameKey(nickname);
  const pickup = (await listPickupLocations()).find((p) => nicknameKey(p.nickname) === key);
  if (!pickup) return bad(`ShipRocket has no pickup address named "${nickname}" — sync and try again`);
  const warehouses = await BrandPickupLocationModel.find({}).select('nickname owner_kind is_default').lean();
  if (warehouses.some((w) => nicknameKey(w.nickname) === key)) bad(`A warehouse named "${pickup.nickname}" already exists`);
  return BrandPickupLocationModel.create({
    owner_kind: 'DUNCIT',
    brand_id: null,
    review_status: 'APPROVED',
    nickname: pickup.nickname,
    contact_name: pickup.name,
    phone: pickup.phone,
    email: pickup.email,
    address_line1: pickup.address_line1,
    address_line2: pickup.address_line2,
    city: pickup.city,
    state: pickup.state,
    pincode: pickup.pincode,
    country: 'India',
    // The store's first warehouse becomes the one new products default to.
    is_default: !warehouses.some((w) => w.owner_kind === 'DUNCIT' && w.is_default),
    shiprocket_registered: true,
    shiprocket_pickup_id: pickup.id,
    shiprocket_error: pickup.verified ? '' : AWAITING_VERIFICATION,
  });
}

/** The account at a glance: which API user, credentials refused, wallet, webhook key. */
export async function shiprocketAccountStatus() {
  const [account, login] = await Promise.all([getShiprocketAccount(), shiprocketLoginState()]);
  let wallet: number | null = null;
  if (account && !login.refused) {
    try {
      wallet = await walletBalance();
    } catch (error) {
      logs.server.warn('shiprocket', 'accountStatus', { error, msg: 'wallet balance unavailable' });
    }
  }
  return {
    configured: !!account,
    account_email: account?.email ?? '',
    login_refused: login.refused,
    login_message: login.message,
    wallet_balance: wallet,
    webhook_key_set: !!account?.webhookSecret,
    default_pickup: account?.pickupLocation ?? '',
  };
}
