import { logs } from '@observability/log';
import { srRequest, type Json } from './shiprocket.client';
import { listPickupLocations, walletBalance, type ShiprocketPickup } from './shiprocket.gateway';

/**
 * What stands between the ShipRocket account and a booked parcel.
 *
 * ShipRocket publishes no endpoint for the seller's KYC or for an API user's
 * permissions, so neither can be read. Both are found the only way they can
 * be: the endpoints the store actually depends on are called, once, read-only,
 * and what comes back is classified. A 401/403 on a call made with a valid
 * token is the API user missing that permission; ShipRocket naming KYC in any
 * refusal is the account not being cleared to ship. Everything the console
 * shows about the account is one of these answers — never a guess.
 */

export type ShiprocketArea = 'ORDERS' | 'COURIERS' | 'PICKUP' | 'WALLET';
/** NOT_CHECKED: the probe had no way to run (no pickup address to quote against). */
export type AreaState = 'OK' | 'FORBIDDEN' | 'FAILED' | 'NOT_CHECKED';

export interface AreaProbe {
  area: ShiprocketArea;
  state: AreaState;
  /** ShipRocket's own words; '' when it answered. */
  detail: string;
}

export type BlockerSeverity = 'BLOCKING' | 'WARNING';

/**
 * A code the console writes the sentence for (rule 38 — the copy is localized
 * there), plus whatever ShipRocket said, which no bundle can hold.
 */
export interface ShiprocketBlocker {
  code: string;
  severity: BlockerSeverity;
  detail: string;
}

export interface ShiprocketReadiness {
  areas: AreaProbe[];
  pickups: ShiprocketPickup[];
  /** Null when the wallet could not be read. */
  wallet: number | null;
}

const GET = { method: 'GET' };
/** One order is enough to prove the Orders permission. */
const ORDERS_PROBE = '/orders?per_page=1';
/** The lightest parcel a rate lookup accepts — the probe asks about permission, not price. */
const PROBE_WEIGHT_KG = '0.5';

/** ShipRocket's HTTP status off a thrown gateway error (0 when it never answered). */
const statusOf = (error: unknown) => Number((error as { extensions?: Json })?.extensions?.shiprocket_status) || 0;

/** A token that logs in but is refused by an endpoint = the API user has no access to it. */
const isPermissionRefusal = (status: number) => status === 401 || status === 403;

/** ShipRocket names KYC in the refusal itself; there is no field to read it from. */
const KYC_WORDING = /\bkyc\b|account (?:is )?not activ/i;

async function probe(area: ShiprocketArea, run: () => Promise<unknown>): Promise<AreaProbe> {
  try {
    await run();
    return { area, state: 'OK', detail: '' };
  } catch (error) {
    const detail = (error as Error).message ?? '';
    if (isPermissionRefusal(statusOf(error))) return { area, state: 'FORBIDDEN', detail };
    logs.server.warn('shiprocket', 'probe', { error, area, msg: 'capability probe failed' });
    return { area, state: 'FAILED', detail };
  }
}

/**
 * A rate lookup is the only read that exercises the Couriers permission. The
 * lane is the account's own pickup pincode to itself: nothing is booked, and
 * "no courier serves this" (404) proves the permission just as well as a quote.
 */
function probeCouriers(pincode: string): Promise<AreaProbe> {
  if (!pincode) return Promise.resolve({ area: 'COURIERS' as const, state: 'NOT_CHECKED' as const, detail: '' });
  const params = new URLSearchParams({
    pickup_postcode: pincode,
    delivery_postcode: pincode,
    weight: PROBE_WEIGHT_KG,
    cod: '0',
  });
  return probe('COURIERS', async () => {
    try {
      await srRequest(`/courier/serviceability/?${params.toString()}`, GET, { op: 'probeCouriers', retry: true });
    } catch (error) {
      if (statusOf(error) !== 404) throw error;
    }
  });
}

/**
 * One read of every area the store ships through. Called only with a login
 * that is not already refused — a refusal throws before any request, so a
 * probe can never spend a login attempt or lock the account.
 */
export async function probeShiprocket(): Promise<ShiprocketReadiness> {
  let pickups: ShiprocketPickup[] = [];
  const pickupProbe = await probe('PICKUP', async () => {
    pickups = await listPickupLocations();
  });
  let wallet: number | null = null;
  const [orders, walletProbe, couriers] = await Promise.all([
    probe('ORDERS', () => srRequest(ORDERS_PROBE, GET, { op: 'probeOrders', retry: true })),
    probe('WALLET', async () => {
      wallet = await walletBalance();
    }),
    probeCouriers(pickups[0]?.pincode ?? ''),
  ]);
  return { areas: [orders, couriers, pickupProbe, walletProbe], pickups, wallet };
}

const blocker = (code: string, severity: BlockerSeverity, detail = ''): ShiprocketBlocker => ({ code, severity, detail });

/** The API user's missing permissions, and any KYC refusal hiding in the answers. */
function accessBlockers(areas: AreaProbe[]): ShiprocketBlocker[] {
  const found: ShiprocketBlocker[] = [];
  const forbidden = areas.filter((a) => a.state === 'FORBIDDEN');
  if (forbidden.length > 0) {
    found.push(blocker('API_USER_PERMISSIONS', 'BLOCKING', forbidden.map((a) => a.area).join(', ')));
  }
  const kyc = areas.find((a) => KYC_WORDING.test(a.detail));
  if (kyc) found.push(blocker('KYC_PENDING', 'BLOCKING', kyc.detail));
  const failed = areas.find((a) => a.state === 'FAILED');
  if (failed) found.push(blocker('SHIPROCKET_UNREADABLE', 'WARNING', failed.detail));
  return found;
}

/** No pickup address, or none ShipRocket has verified, is a parcel that cannot be collected. */
function pickupBlockers(readiness: ShiprocketReadiness): ShiprocketBlocker[] {
  if (readiness.areas.find((a) => a.area === 'PICKUP')?.state !== 'OK') return [];
  if (readiness.pickups.length === 0) return [blocker('NO_PICKUP_ADDRESS', 'BLOCKING')];
  const unverified = readiness.pickups.filter((p) => !p.verified);
  if (unverified.length === 0) return [];
  const severity: BlockerSeverity = unverified.length === readiness.pickups.length ? 'BLOCKING' : 'WARNING';
  return [blocker('PICKUP_UNVERIFIED', severity, unverified.map((p) => p.nickname).join(', '))];
}

export interface BlockerInput {
  configured: boolean;
  loginRefused: boolean;
  loginMessage: string;
  webhookKeySet: boolean;
  /** Null when nothing was probed, because the credentials never got that far. */
  readiness: ShiprocketReadiness | null;
}

/**
 * Everything the account is blocked on, worst first. The two credential
 * failures stop the list: nothing else can be known until a login works.
 */
export function shiprocketBlockers(input: BlockerInput): ShiprocketBlocker[] {
  if (!input.configured) return [blocker('NOT_CONFIGURED', 'BLOCKING')];
  if (input.loginRefused) return [blocker('LOGIN_REFUSED', 'BLOCKING', input.loginMessage)];
  if (!input.readiness) return [];
  const found = [...accessBlockers(input.readiness.areas), ...pickupBlockers(input.readiness)];
  if (input.readiness.wallet !== null && input.readiness.wallet <= 0) found.push(blocker('WALLET_EMPTY', 'BLOCKING'));
  if (!input.webhookKeySet) found.push(blocker('WEBHOOK_KEY_MISSING', 'WARNING'));
  return found.sort((a, b) => Number(b.severity === 'BLOCKING') - Number(a.severity === 'BLOCKING'));
}
