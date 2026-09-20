import { Types } from 'mongoose';
import { GraphQLError } from 'graphql';
import { logs } from '@observability/log';
import {
  BrandPickupLocationModel,
  type IBrandPickupLocation,
} from '@modules/venues/brandPickupLocation/brandPickupLocation.model';
import type { IProductOrder } from '@modules/commerce/productOrder/productOrder.model';
import { getShiprocketAccount } from './shiprocket.account';
import { shiprocketLoginState, withShiprocketAccount } from './shiprocket.client';
import { accountForOrder } from './shiprocket.shipment';
import {
  addPickupLocation,
  listPickupLocations,
  ndrAction,
  walletBalance,
  type NdrAction,
  type ShiprocketPickup,
} from './shiprocket.gateway';
import { pickupProblems } from './shiprocket.address';

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
  await withShiprocketAccount(await accountForOrder(order), () => ndrAction(order.shiprocket.awb, action, note));
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

/** A ShipRocket pickup address written as one of our warehouses — ShipRocket's copy, verbatim. */
const mirrorOf = (p: ShiprocketPickup) => ({
  nickname: p.nickname,
  contact_name: p.name,
  phone: p.phone,
  email: p.email,
  address_line1: p.address_line1,
  address_line2: p.address_line2,
  city: p.city,
  state: p.state,
  pincode: p.pincode,
  country: 'India',
  shiprocket_registered: true,
  shiprocket_pickup_id: p.id,
  shiprocket_error: p.verified ? '' : AWAITING_VERIFICATION,
});

/**
 * Take in every pickup address the account has that we do not hold yet.
 *
 * ShipRocket is where a pickup address lives; ours is a copy of it, kept so a
 * product can point at one. So there is nothing to "import" by hand and no
 * such thing as an address that is on the account but not offered here — a
 * sync adopts it, and the list the console shows is the account's own list.
 */
async function adoptPickups(pickups: ShiprocketPickup[]) {
  const known = await BrandPickupLocationModel.find({}).select('nickname owner_kind is_default').lean();
  const held = new Set(known.map((w) => nicknameKey(w.nickname)));
  const fresh = pickups.filter((p) => !held.has(nicknameKey(p.nickname)));
  if (fresh.length === 0) return;
  // The store's first warehouse becomes the one new products default to.
  let needsDefault = !known.some((w) => w.owner_kind === 'DUNCIT' && w.is_default);
  for (const pickup of fresh) {
    try {
      await BrandPickupLocationModel.create({
        ...mirrorOf(pickup),
        owner_kind: 'DUNCIT',
        brand_id: null,
        review_status: 'APPROVED',
        is_default: needsDefault,
      });
      needsDefault = false;
    } catch (error) {
      // Two syncs at once (a double-click on the page) race for the same
      // nickname. The loser has nothing to do — the address is already in.
      if ((error as { code?: number }).code !== 11000) throw error;
      logs.server.warn('shiprocket', 'adoptPickup', { nickname: pickup.nickname, msg: 'already taken in' });
    }
  }
}

/**
 * The account's pickup addresses, as our warehouses.
 *
 * Every address ShipRocket has is taken in first, then each warehouse is
 * matched to the pickup address with the same nickname (the name
 * `pickup_location` must equal on every order) and what ShipRocket says is
 * recorded on it. A warehouse ShipRocket does NOT have is one of ours that
 * never landed there — a partner's awaiting approval, or a legacy row — and
 * it is marked so, because nothing can ship from it.
 *
 * When ShipRocket cannot be read the warehouses are still listed — as
 * UNKNOWN, with the reason — so they can be managed while the account is fixed.
 */
export async function syncPickupLocations() {
  const { pickups, error } = await readPickups();
  if (pickups) await adoptPickups(pickups);
  const warehouses = await BrandPickupLocationModel.find({}).sort({ owner_kind: 1, nickname: 1 });
  const byNickname = new Map((pickups ?? []).map((p) => [nicknameKey(p.nickname), p]));
  const rows = [];
  for (const w of warehouses) {
    const match = byNickname.get(nicknameKey(w.nickname)) ?? null;
    const state = pickups ? stateOf(match) : 'UNKNOWN';
    if (pickups) await recordMatch(w, match, state);
    rows.push({ warehouse: w, shiprocket_state: state });
  }
  return { warehouses: rows, shiprocket_error: error, synced_at: new Date().toISOString() };
}

export interface PickupInput {
  nickname: string;
  contact_name: string;
  phone: string;
  email: string;
  address_line1: string;
  address_line2?: string | null;
  city: string;
  state: string;
  pincode: string;
  country?: string | null;
  is_default?: boolean | null;
}

/** Letters, digits, spaces, dots, dashes and underscores — what ShipRocket takes as a pickup name. */
const NICKNAME = /^[\w .-]{2,60}$/;

const text = (v: string | null | undefined) => (v ?? '').trim();

function cleanPickupInput(input: PickupInput) {
  const clean = {
    nickname: text(input.nickname),
    contact_name: text(input.contact_name),
    phone: text(input.phone).replaceAll(/\D/g, '').slice(-10),
    email: text(input.email).toLowerCase(),
    address_line1: text(input.address_line1),
    address_line2: text(input.address_line2),
    city: text(input.city),
    state: text(input.state),
    pincode: text(input.pincode).replaceAll(/\D/g, ''),
    country: text(input.country) || 'India',
  };
  if (!NICKNAME.test(clean.nickname)) {
    bad('Name the warehouse with 2–60 letters, digits, spaces, dots, dashes or underscores');
  }
  const problems = pickupProblems({ ...clean, name: clean.contact_name, line1: clean.address_line1 });
  if (problems.length > 0) bad(`Enter ${problems.join(' and ')}`);
  return clean;
}

/**
 * Put the address on the ShipRocket account and answer with what the account
 * then holds. A nickname it already has is not an error — that address IS the
 * answer, and ShipRocket's API cannot edit one, so its copy wins.
 */
async function pushPickup(clean: ReturnType<typeof cleanPickupInput>): Promise<ShiprocketPickup> {
  const payload = {
    pickup_location: clean.nickname,
    name: clean.contact_name,
    email: clean.email,
    phone: clean.phone,
    address: clean.address_line1,
    address_2: clean.address_line2,
    city: clean.city,
    state: clean.state,
    country: clean.country,
    pin_code: clean.pincode,
  };
  try {
    await addPickupLocation(payload);
  } catch (error) {
    if (!/already/i.test((error as Error).message)) throw error;
  }
  const held = (await listPickupLocations()).find((p) => nicknameKey(p.nickname) === nicknameKey(clean.nickname));
  if (!held) bad('ShipRocket took the pickup address but does not list it yet — sync in a minute');
  return held!;
}

/**
 * Add one of the store's pickup addresses, from either console.
 *
 * ShipRocket first, and only then us: the address is created on the account,
 * read back, and OUR row is written from what came back. A row can therefore
 * never describe an address ShipRocket does not have — which is what used to
 * let a product be given a warehouse no courier would ever collect from.
 * ShipRocket refusing means nothing is saved at all.
 */
export async function saveDuncitPickup(id: string | null | undefined, input: PickupInput) {
  const clean = cleanPickupInput(input);
  const oid = id && Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : null;
  const existing = oid ? await BrandPickupLocationModel.findOne({ _id: oid, owner_kind: 'DUNCIT' }) : null;
  if (id && !existing) bad('Warehouse not found');
  if (existing?.shiprocket_registered) bad('ShipRocket holds this pickup address — change it in ShipRocket, then sync');
  const clash = await BrandPickupLocationModel.findOne({ nickname: clean.nickname }).select('_id').lean();
  if (clash && String(clash._id) !== id) bad(`A warehouse named "${clean.nickname}" already exists`);
  const held = await pushPickup(clean);
  const fields = {
    ...mirrorOf(held),
    country: clean.country,
    owner_kind: 'DUNCIT' as const,
    brand_id: null,
    review_status: 'APPROVED' as const,
  };
  const saved = existing
    ? await BrandPickupLocationModel.findByIdAndUpdate(existing._id, { $set: fields }, { new: true })
    : await BrandPickupLocationModel.create({ ...fields, is_default: !!input.is_default });
  if (input.is_default) {
    await BrandPickupLocationModel.updateMany({ owner_kind: 'DUNCIT', _id: { $ne: saved!._id } }, { $set: { is_default: false } });
    await BrandPickupLocationModel.updateOne({ _id: saved!._id }, { $set: { is_default: true } });
  }
  return (await BrandPickupLocationModel.findById(saved!._id))!;
}

/** The wallet, or ShipRocket's reason for not saying — a silent dash hides a refused account. */
async function wallet(): Promise<{ balance: number | null; error: string }> {
  try {
    return { balance: await walletBalance(), error: '' };
  } catch (error) {
    logs.server.warn('shiprocket', 'accountStatus', { error, msg: 'wallet balance unavailable' });
    return { balance: null, error: (error as Error).message };
  }
}

/** The account at a glance: which API user, credentials refused, wallet, webhook key. */
export async function shiprocketAccountStatus() {
  const [account, login] = await Promise.all([getShiprocketAccount(), shiprocketLoginState()]);
  const purse = account && !login.refused ? await wallet() : { balance: null, error: '' };
  return {
    configured: !!account,
    account_email: account?.email ?? '',
    login_refused: login.refused,
    login_message: login.message,
    wallet_balance: purse.balance,
    wallet_error: purse.error,
    webhook_key_set: !!account?.webhookSecret,
    default_pickup: account?.pickupLocation ?? '',
  };
}
