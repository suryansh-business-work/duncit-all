import { randomUUID } from 'node:crypto';
import { EnvEntryModel } from '@modules/platform/envEntry/envEntry.model';

/**
 * A stand-in for ShipRocket's REST API, installed as `globalThis.fetch`, so the
 * real client (login, token kept in the database, the refusal latch, retries)
 * and the real shipment code run end to end without touching the network.
 *
 * Routes are keyed on method + path under `/v1/external`; `state` is what the
 * account looks like right now (wallet, couriers, what tracking reports) and a
 * test changes it between steps. Every request is recorded in `calls`.
 */
export type Json = Record<string, any>;

export interface SrCall {
  method: string;
  path: string;
  query: URLSearchParams;
  body: Json;
  /** The Authorization header the client sent. */
  auth: string;
}

export interface FakeState {
  /** What `/auth/login` answers: 200 hands out a token, a 4xx refuses the credentials. */
  loginStatus: number;
  wallet: number;
  couriers: Json[];
  recommended: number;
  /** The ShipRocket order `/orders?search` finds — one a lost answer already booked. */
  existing: Json | null;
  /** What `/courier/track/awb/{awb}` reports. */
  trackStatus: string;
  trackActivities: Json[];
}

export interface FakeShiprocket {
  state: FakeState;
  calls: SrCall[];
  count: (method: string, path: string | RegExp) => number;
  last: (method: string, path: string | RegExp) => SrCall | undefined;
  /** The next `times` calls to this exact method + path answer `status`. */
  failNext: (method: string, path: string, status: number, times?: number) => void;
  restore: () => void;
}

type Reply = [status: number, body: Json];

const SR_PREFIX = '/v1/external';
const TEN_DAYS_S = 10 * 24 * 3600;

export const WAREHOUSE = 'DUN-WH-NOIDA';

/** A throwaway credential, built at runtime — never a literal in source (Sonar S2068). */
export const runtimeSecret = (label: string) => `${label}-${randomUUID()}`;

/** A JWT-shaped token expiring in ten days — the client reads its expiry from `exp`. */
export function fakeJwt(): string {
  const payload = Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + TEN_DAYS_S })).toString('base64url');
  return `e30.${payload}.c2ln`;
}

export interface AccountConfig {
  email: string;
  password: string;
  webhook_secret: string;
  pickup_location: string;
}

/** The Tech portal's SHIPROCKET entry: the default, active, with a webhook key and a default pickup. */
export async function seedShiprocketAccount(over: Partial<AccountConfig> = {}) {
  const config: AccountConfig = {
    email: 'ops@duncit.com',
    password: runtimeSecret('sr'),
    webhook_secret: runtimeSecret('hook'),
    pickup_location: WAREHOUSE,
    ...over,
  };
  const entry = await EnvEntryModel.create({
    name: 'ShipRocket — pet store',
    category: 'SHIPROCKET',
    is_active: true,
    is_default: true,
    config,
  });
  return { entry, config };
}

const DEFAULT_COURIERS: Json[] = [
  { courier_company_id: 12, courier_name: 'Delhivery Surface', rate: 68, etd: 'Sep 23, 2026', cod: 1, rating: 4.3 },
  { courier_company_id: 24, courier_name: 'Xpressbees Surface', rate: 74, etd: 'Sep 24, 2026', cod: 1, rating: 4.1 },
];

const response = (status: number, body: Json): Response =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as unknown as Response;

const parseBody = (body: unknown): Json => (typeof body === 'string' && body ? JSON.parse(body) : {});

const matches = (call: SrCall, method: string, path: string | RegExp) =>
  call.method === method && (typeof path === 'string' ? call.path === path : path.test(call.path));

function toCall(input: string | URL | Request, init?: RequestInit): SrCall {
  const url = new URL(input instanceof Request ? input.url : input.toString());
  const path = url.pathname.startsWith(SR_PREFIX) ? url.pathname.slice(SR_PREFIX.length) : url.pathname;
  return {
    method: String(init?.method ?? 'GET').toUpperCase(),
    path,
    query: url.searchParams,
    body: parseBody(init?.body),
    auth: new Headers(init?.headers).get('authorization') ?? '',
  };
}

export function installFakeShiprocket(): FakeShiprocket {
  const state: FakeState = {
    loginStatus: 200,
    wallet: 1500,
    couriers: DEFAULT_COURIERS.map((c) => ({ ...c })),
    recommended: 12,
    existing: null,
    trackStatus: '',
    trackActivities: [],
  };
  const calls: SrCall[] = [];
  const failures = new Map<string, { status: number; left: number }>();
  const seq = { orders: 0, returns: 0, pickups: 0 };

  const courierById = (id: unknown) =>
    state.couriers.find((c) => String(c.courier_company_id) === String(id)) ?? state.couriers[0];

  const login = (): Reply => {
    if (state.loginStatus === 200) return [200, { token: fakeJwt(), company_id: 482193 }];
    if (state.loginStatus >= 500) return [state.loginStatus, { message: 'Service Temporarily Unavailable' }];
    return [state.loginStatus, { message: 'Invalid email and password combination' }];
  };

  const assignAwb = (call: SrCall): Reply => {
    const courier = courierById(call.body.courier_id ?? state.recommended);
    const prefix = call.body.is_return ? '5923' : '1433';
    const data = {
      awb_code: `${prefix}${call.body.shipment_id}`,
      courier_company_id: courier.courier_company_id,
      courier_name: courier.courier_name,
      shipment_id: call.body.shipment_id,
    };
    return [200, { awb_assign_status: 1, response: { data } }];
  };

  const track = (call: SrCall): Reply => {
    const awb = call.path.split('/').at(-1) ?? '';
    const tracking_data = {
      track_status: 1,
      shipment_status: 0,
      shipment_track: [{ awb_code: awb, current_status: state.trackStatus }],
      shipment_track_activities: state.trackActivities,
      etd: '',
    };
    return [200, { tracking_data }];
  };

  const routes: { method: string; path: RegExp; reply: (call: SrCall) => Reply }[] = [
    { method: 'POST', path: /^\/auth\/login$/, reply: login },
    { method: 'GET', path: /^\/orders$/, reply: () => [200, { data: state.existing ? [state.existing] : [] }] },
    {
      method: 'POST',
      path: /^\/orders\/create\/adhoc$/,
      reply: () => {
        seq.orders += 1;
        return [200, { order_id: 7300000 + seq.orders, shipment_id: 6300000 + seq.orders, status: 'NEW', status_code: 1 }];
      },
    },
    {
      method: 'GET',
      path: /^\/courier\/serviceability\/$/,
      reply: () => [200, { data: { recommended_courier_company_id: state.recommended, available_courier_companies: state.couriers } }],
    },
    {
      method: 'GET',
      path: /^\/account\/details\/wallet-balance$/,
      reply: () => [200, { data: { balance_amount: state.wallet.toFixed(2) } }],
    },
    { method: 'POST', path: /^\/courier\/assign\/awb$/, reply: assignAwb },
    {
      method: 'POST',
      path: /^\/courier\/generate\/pickup$/,
      reply: () => {
        seq.pickups += 1;
        const pickup = { pickup_scheduled_date: '2026-09-20 11:00:00', pickup_token_number: `Reference No: 1946${seq.pickups}` };
        return [200, { pickup_status: 1, response: pickup }];
      },
    },
    { method: 'POST', path: /^\/orders\/cancel$/, reply: () => [200, { message: 'Order cancelled successfully.' }] },
    {
      method: 'POST',
      path: /^\/orders\/create\/return$/,
      reply: () => {
        seq.returns += 1;
        return [200, { order_id: 7400000 + seq.returns, shipment_id: 6400000 + seq.returns, status: 'RETURN PENDING' }];
      },
    },
    { method: 'POST', path: /^\/ndr\/[^/]+\/action$/, reply: () => [200, { status: true, message: 'Action taken' }] },
    { method: 'GET', path: /^\/courier\/track\/awb\/[^/]+$/, reply: track },
  ];

  const failureFor = (call: SrCall): Reply | null => {
    const hit = failures.get(`${call.method} ${call.path}`);
    if (!hit || hit.left <= 0) return null;
    hit.left -= 1;
    return [hit.status, { message: `ShipRocket answered ${hit.status}` }];
  };

  const route = (call: SrCall): Reply => {
    const hit = routes.find((r) => r.method === call.method && r.path.test(call.path));
    return hit ? hit.reply(call) : [404, { message: 'No such ShipRocket route' }];
  };

  const handler = async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const call = toCall(input, init);
    calls.push(call);
    const [status, body] = failureFor(call) ?? route(call);
    return response(status, body);
  };

  const g = globalThis as { fetch: typeof fetch };
  const realFetch = g.fetch;
  g.fetch = handler;

  const select = (method: string, path: string | RegExp) => calls.filter((c) => matches(c, method, path));
  return {
    state,
    calls,
    count: (method, path) => select(method, path).length,
    last: (method, path) => select(method, path).at(-1),
    failNext: (method, path, status, times = 1) => {
      failures.set(`${method} ${path}`, { status, left: times });
    },
    restore: () => {
      g.fetch = realFetch;
    },
  };
}
