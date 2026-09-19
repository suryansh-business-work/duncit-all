import { GraphQLError } from 'graphql';
import { logs } from '@observability/log';
import { BrandPickupLocationModel } from '@modules/venues/brandPickupLocation/brandPickupLocation.model';
import type { IProductOrder } from '@modules/commerce/productOrder/productOrder.model';
import { getShiprocketAccount } from './shiprocket.account';
import { shiprocketLoginState } from './shiprocket.client';
import { listPickupLocations, ndrAction, walletBalance, type NdrAction } from './shiprocket.gateway';

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

export type PickupSyncState = 'READY' | 'AWAITING_VERIFICATION' | 'NOT_IN_SHIPROCKET';

/**
 * Match every warehouse to the ShipRocket pickup address with the same
 * nickname (the name `pickup_location` must equal on every order), record
 * what ShipRocket says, and list the account's pickups no warehouse uses.
 */
export async function syncPickupLocations() {
  const [pickups, warehouses] = await Promise.all([
    listPickupLocations(),
    BrandPickupLocationModel.find({}).sort({ owner_kind: 1, nickname: 1 }),
  ]);
  const byNickname = new Map(pickups.map((p) => [p.nickname.toLowerCase(), p]));
  const used = new Set<string>();
  const rows = [];
  for (const w of warehouses) {
    const match = byNickname.get(String(w.nickname).toLowerCase()) ?? null;
    if (match) used.add(match.nickname.toLowerCase());
    let state: PickupSyncState = 'NOT_IN_SHIPROCKET';
    if (match) state = match.verified ? 'READY' : 'AWAITING_VERIFICATION';
    w.shiprocket_registered = !!match;
    w.shiprocket_pickup_id = match?.id ?? w.shiprocket_pickup_id;
    w.shiprocket_error = state === 'AWAITING_VERIFICATION' ? 'Awaiting phone verification in ShipRocket' : '';
    if (state === 'NOT_IN_SHIPROCKET') w.shiprocket_error = `No ShipRocket pickup address is named "${w.nickname}"`;
    await w.save();
    rows.push({
      warehouse_id: String(w._id),
      nickname: w.nickname,
      owner_kind: w.owner_kind,
      city: w.city,
      pincode: w.pincode,
      state,
      shiprocket_id: match?.id ?? '',
    });
  }
  const unmatched = pickups
    .filter((p) => !used.has(p.nickname.toLowerCase()))
    .map((p) => ({ nickname: p.nickname, city: p.city, pincode: p.pincode, verified: p.verified }));
  return { warehouses: rows, shiprocket_only: unmatched, synced_at: new Date().toISOString() };
}

/** The account at a glance: configured, credentials refused, wallet, webhook key. */
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
    login_refused: login.refused,
    login_message: login.message,
    wallet_balance: wallet,
    webhook_key_set: !!account?.webhookSecret,
    default_pickup: account?.pickupLocation ?? '',
  };
}
