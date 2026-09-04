import { randomUUID } from 'node:crypto';
import { getRuntimeEnvValue } from '@config/runtimeEnv';

jest.mock('@config/runtimeEnv', () => ({ getRuntimeEnvValue: jest.fn() }));
const mockEnv = getRuntimeEnvValue as jest.Mock;

type Gateway = typeof import('../../shiprocket.gateway');

/**
 * The auth + REST plumbing of the ShipRocket gateway.
 *
 * The token cache AND the refused-credential latch are module state, so each
 * test loads its own instance — sharing one would let an earlier test's latched
 * refusal decide a later test's outcome, which is exactly the bug the latch
 * exists to cause on purpose in production.
 */
function loadGateway(): Gateway {
  let mod: Gateway | undefined;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mod = require('../../shiprocket.gateway') as Gateway;
  });
  return mod as Gateway;
}

/** Credentials are generated per run — never a literal in source (rule 26f). */
const password = () => randomUUID();

function configure(over: Record<string, string> = {}) {
  const values: Record<string, string> = {
    SHIPROCKET_EMAIL: 'sr@duncit.com',
    SHIPROCKET_PASSWORD: password(),
    SHIPROCKET_TOKEN_TTL_HOURS: '240',
    ...over,
  };
  mockEnv.mockImplementation(async (key: string) => values[key] ?? '');
  return values;
}

const reply = (body: unknown, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

interface FetchStub {
  fn: jest.Mock;
  urls: string[];
  logins: () => number;
}

/**
 * Stubs global fetch. `login` answers /auth/login (a single reply, or one per
 * successive call); `api` answers everything else the same way.
 */
function stubFetch(opts: {
  login?: unknown | unknown[];
  api?: unknown | unknown[];
}): FetchStub {
  const urls: string[] = [];
  const queue = (v: unknown | unknown[]) => (Array.isArray(v) ? [...v] : null);
  const loginQueue = queue(opts.login);
  const apiQueue = queue(opts.api);
  const fn = jest.fn(async (url: string, init?: RequestInit) => {
    urls.push(String(url));
    if (String(url).includes('/auth/login')) {
      return loginQueue ? loginQueue.shift() : opts.login;
    }
    // Every authenticated call must carry the bearer token.
    expect((init?.headers as Record<string, string>)?.Authorization).toMatch(/^Bearer /);
    return apiQueue ? apiQueue.shift() : opts.api;
  });
  (globalThis as any).fetch = fn;
  return { fn, urls, logins: () => urls.filter((u) => u.includes('/auth/login')).length };
}

afterEach(() => {
  delete (globalThis as any).fetch;
});

describe('shiprocket.gateway configuration', () => {
  it('is configured only once both the email and the password are set', async () => {
    const gw = loadGateway();
    configure();
    expect(await gw.isShiprocketConfigured()).toBe(true);

    configure({ SHIPROCKET_PASSWORD: '' });
    expect(await gw.isShiprocketConfigured()).toBe(false);

    configure({ SHIPROCKET_EMAIL: '' });
    expect(await gw.isShiprocketConfigured()).toBe(false);
  });

  it('names the Tech portal when a call is made with no credentials', async () => {
    const gw = loadGateway();
    mockEnv.mockResolvedValue('');
    await expect(gw.createOrderAdhoc({})).rejects.toThrow(/not configured.*Tech portal/i);
  });
});

describe('shiprocket.gateway token cache', () => {
  it('logs in once and reuses the token for later calls', async () => {
    const gw = loadGateway();
    configure();
    const f = stubFetch({ login: reply({ token: 'tok' }), api: reply({ order_id: 1 }) });
    await gw.createOrderAdhoc({});
    await gw.createOrderAdhoc({});
    expect(f.logins()).toBe(1);
  });

  it('logs in again once the cached token has aged out', async () => {
    const gw = loadGateway();
    configure({ SHIPROCKET_TOKEN_TTL_HOURS: '2' });
    const f = stubFetch({ login: reply({ token: 'tok' }), api: reply({ order_id: 1 }) });
    const start = Date.now();
    const clock = jest.spyOn(Date, 'now').mockReturnValue(start);
    await gw.createOrderAdhoc({});
    // Three hours later the two-hour token is stale.
    clock.mockReturnValue(start + 3 * 3_600_000);
    await gw.createOrderAdhoc({});
    clock.mockRestore();
    expect(f.logins()).toBe(2);
  });

  it('treats a missing or zero TTL as the ten-day default', async () => {
    const gw = loadGateway();
    configure({ SHIPROCKET_TOKEN_TTL_HOURS: '' });
    const f = stubFetch({ login: reply({ token: 'tok' }), api: reply({ order_id: 1 }) });
    await gw.createOrderAdhoc({});
    await gw.createOrderAdhoc({});
    expect(f.logins()).toBe(1);
  });

  // Rotating the password in the Tech portal changes the cache key, so the old
  // token is dropped without anyone having to clear anything.
  it('drops the cached token when the credentials are rotated', async () => {
    const gw = loadGateway();
    configure();
    const f = stubFetch({ login: reply({ token: 'tok' }), api: reply({ order_id: 1 }) });
    await gw.createOrderAdhoc({});
    configure();
    await gw.createOrderAdhoc({});
    expect(f.logins()).toBe(2);
  });
});

describe('shiprocket.gateway login failures', () => {
  // Retrying a wrong password cannot make it right, and ShipRocket counts the
  // attempts — this latch is what stopped a sweep locking the live account out.
  it('stops asking after ShipRocket refuses the credentials', async () => {
    const gw = loadGateway();
    configure();
    const f = stubFetch({ login: reply({ message: 'Invalid email and password combination' }, 403) });
    await expect(gw.createOrderAdhoc({})).rejects.toThrow(/not retried until they change/i);
    await expect(gw.createOrderAdhoc({})).rejects.toThrow(/Invalid email and password combination/);
    // The second attempt never reached ShipRocket.
    expect(f.logins()).toBe(1);
  });

  it('lets a rotated password past the refusal latch', async () => {
    const gw = loadGateway();
    configure();
    const f = stubFetch({
      login: [reply({ message: 'blocked' }, 403), reply({ token: 'tok' })],
      api: reply({ order_id: 1 }),
    });
    await expect(gw.createOrderAdhoc({})).rejects.toThrow(/blocked/);
    configure();
    await expect(gw.createOrderAdhoc({})).resolves.toMatchObject({ order_id: '1' });
    expect(f.logins()).toBe(2);
  });

  // A 5xx is ShipRocket having a bad minute, not a verdict on the password.
  it('keeps retrying after a server-side login failure', async () => {
    const gw = loadGateway();
    configure();
    const f = stubFetch({
      login: [reply({ message: 'gateway timeout' }, 502), reply({ token: 'tok' })],
      api: reply({ order_id: 9 }),
    });
    await expect(gw.createOrderAdhoc({})).rejects.toThrow(/login failed: gateway timeout/i);
    await expect(gw.createOrderAdhoc({})).resolves.toMatchObject({ order_id: '9' });
    expect(f.logins()).toBe(2);
  });

  it('treats a 2xx carrying no token as a malformed answer, not a refusal', async () => {
    const gw = loadGateway();
    configure();
    const f = stubFetch({
      login: [reply({}), reply({ token: 'tok' })],
      api: reply({ order_id: 3 }),
    });
    await expect(gw.createOrderAdhoc({})).rejects.toThrow(/login failed: 200/);
    await expect(gw.createOrderAdhoc({})).resolves.toMatchObject({ order_id: '3' });
    expect(f.logins()).toBe(2);
  });

  it('reports the status when the refusal body cannot be read', async () => {
    const gw = loadGateway();
    configure();
    stubFetch({
      login: {
        ok: false,
        status: 429,
        json: async () => {
          throw new Error('not json');
        },
      },
    });
    await expect(gw.createOrderAdhoc({})).rejects.toThrow(/login failed: 429/);
  });
});

describe('shiprocket.gateway request errors', () => {
  it('refreshes the token once and replays a call ShipRocket answered 401', async () => {
    const gw = loadGateway();
    configure();
    const f = stubFetch({
      login: reply({ token: 'tok' }),
      api: [reply({}, 401), reply({ order_id: 7, shipment_id: 'SH' })],
    });
    await expect(gw.createOrderAdhoc({})).resolves.toMatchObject({
      order_id: '7',
      shipment_id: 'SH',
    });
    expect(f.logins()).toBe(2);
  });

  it('gives up on a second consecutive 401 rather than looping', async () => {
    const gw = loadGateway();
    configure();
    stubFetch({
      login: reply({ token: 'tok' }),
      api: [reply({}, 401), reply({ message: 'still unauthorised' }, 401)],
    });
    await expect(gw.createOrderAdhoc({})).rejects.toThrow(/still unauthorised/);
  });

  it('surfaces a string error message from ShipRocket', async () => {
    const gw = loadGateway();
    configure();
    stubFetch({ login: reply({ token: 'tok' }), api: reply({ message: 'Pincode not serviceable' }, 422) });
    await expect(gw.createOrderAdhoc({})).rejects.toThrow(/ShipRocket error: Pincode not serviceable/);
  });

  it('serialises a structured error body instead of printing [object Object]', async () => {
    const gw = loadGateway();
    configure();
    stubFetch({ login: reply({ token: 'tok' }), api: reply({ errors: { pincode: ['required'] } }, 422) });
    await expect(gw.createOrderAdhoc({})).rejects.toThrow(/\{"pincode":\["required"\]\}/);
  });

  it('falls back to the status code when the error body says nothing', async () => {
    const gw = loadGateway();
    configure();
    stubFetch({ login: reply({ token: 'tok' }), api: reply({}, 500) });
    await expect(gw.createOrderAdhoc({})).rejects.toThrow(/ShipRocket error: ShipRocket 500/);
  });
});

describe('shiprocket.gateway endpoints', () => {
  const withToken = (api: unknown | unknown[]) =>
    stubFetch({ login: reply({ token: 'tok' }), api });

  it('normalises a missing ad-hoc order response to empty strings', async () => {
    const gw = loadGateway();
    configure();
    withToken(reply({}));
    await expect(gw.createOrderAdhoc({})).resolves.toEqual({
      order_id: '',
      shipment_id: '',
      status: '',
    });
  });

  it('reads the AWB out of the nested response envelope', async () => {
    const gw = loadGateway();
    configure();
    withToken(
      reply({
        response: {
          data: {
            awb_code: 'AWB-9',
            courier_name: 'Delhivery',
            courier_company_id: '7',
            label_url: 'https://labels.example/9.pdf',
          },
        },
      }),
    );
    await expect(gw.assignAwb('SH-9')).resolves.toEqual({
      awb: 'AWB-9',
      courier_name: 'Delhivery',
      courier_company_id: '7',
      label_url: 'https://labels.example/9.pdf',
    });
  });

  it('reads a flat AWB response and blanks a missing one', async () => {
    const gw = loadGateway();
    configure();
    withToken([reply({ awb_code: 'AWB-FLAT' }), reply(null)]);
    await expect(gw.assignAwb('SH-1')).resolves.toMatchObject({ awb: 'AWB-FLAT', courier_name: '' });
    await expect(gw.assignAwb('SH-2')).resolves.toMatchObject({ awb: '', label_url: '' });
  });

  it('returns the generated label url, or empty when there is none', async () => {
    const gw = loadGateway();
    configure();
    withToken([reply({ label_url: 'https://labels.example/a.pdf' }), reply({})]);
    await expect(gw.generateLabel('SH-1')).resolves.toBe('https://labels.example/a.pdf');
    await expect(gw.generateLabel('SH-2')).resolves.toBe('');
  });

  it('registers a pickup location from either id shape', async () => {
    const gw = loadGateway();
    configure();
    withToken([
      reply({ success: true, pickup_id: 'P-1' }),
      reply({ address: { id: 'P-2' } }),
      reply({ success: false }),
    ]);
    await expect(gw.addPickupLocation({})).resolves.toEqual({ pickup_id: 'P-1', registered: true });
    await expect(gw.addPickupLocation({})).resolves.toEqual({ pickup_id: 'P-2', registered: true });
    // A 200 that returns no id at all is NOT a registration.
    await expect(gw.addPickupLocation({})).resolves.toEqual({ pickup_id: '', registered: false });
  });
});

describe('shiprocket.gateway tracking', () => {
  it('reads the current status and activities from the tracking envelope', async () => {
    const gw = loadGateway();
    configure();
    stubFetch({
      login: reply({ token: 'tok' }),
      api: reply({
        tracking_data: {
          shipment_track: [{ current_status: 'IN TRANSIT' }],
          shipment_track_activities: [
            { status: 'Picked up', location: 'Pune', activity: 'Collected', date: '2026-09-04' },
          ],
        },
      }),
    });
    await expect(gw.trackByShipment('SH-1')).resolves.toEqual({
      current_status: 'IN TRANSIT',
      activities: [
        { status: 'Picked up', location: 'Pune', note: 'Collected', date: '2026-09-04' },
      ],
    });
  });

  it('falls back to the shipment-level track status when no track row is present', async () => {
    const gw = loadGateway();
    configure();
    stubFetch({
      login: reply({ token: 'tok' }),
      api: reply({ tracking_data: { track_status: 'DELIVERED', shipment_track_activities: [] } }),
    });
    await expect(gw.trackByAwb('AWB-1')).resolves.toEqual({
      current_status: 'DELIVERED',
      activities: [],
    });
  });

  // ShipRocket labels some activities with `sr-status-label` instead of `status`,
  // and the shipment row can be missing entirely — the newest activity is then
  // the only status there is.
  it('takes the status from the latest activity label when nothing else has one', async () => {
    const gw = loadGateway();
    configure();
    stubFetch({
      login: reply({ token: 'tok' }),
      api: reply({
        shipment_track_activities: [{ 'sr-status-label': 'OUT FOR DELIVERY' }],
      }),
    });
    await expect(gw.trackByAwb('AWB-2')).resolves.toEqual({
      current_status: 'OUT FOR DELIVERY',
      activities: [{ status: 'OUT FOR DELIVERY', location: '', note: '', date: '' }],
    });
  });

  it('answers with empty tracking rather than throwing on an empty body', async () => {
    const gw = loadGateway();
    configure();
    stubFetch({ login: reply({ token: 'tok' }), api: reply(null) });
    await expect(gw.trackByShipment('SH-0')).resolves.toEqual({
      current_status: '',
      activities: [],
    });
  });
});

/**
 * Shapes ShipRocket really returns that the happy path never shows. The
 * courier list in particular is quoted three different ways depending on the
 * account, and a rate we misread is a delivery charge we bill wrong.
 */
describe('shiprocket.gateway response shapes', () => {
  it('keeps going when an API response body is not JSON at all', async () => {
    const gw = loadGateway();
    configure();
    stubFetch({
      login: reply({ token: 'tok' }),
      api: {
        ok: true,
        status: 200,
        json: async () => {
          throw new Error('not json');
        },
      },
    });
    await expect(gw.createOrderAdhoc({})).resolves.toEqual({ order_id: '', shipment_id: '', status: '' });
  });

  it('reads a courier rate from whichever field the account quotes it in', async () => {
    const gw = loadGateway();
    configure();
    stubFetch({
      login: reply({ token: 'tok' }),
      api: reply({
        data: {
          available_courier_companies: [
            { courier_name: 'Bundled', total_charge: 70 },
            { courier_name: 'Rated', rate: 95 },
          ],
        },
      }),
    });
    await expect(
      gw.getServiceability({ pickupPincode: '110001', deliveryPincode: '560001', weightKg: 1 }),
    ).resolves.toMatchObject({ courier_name: 'Bundled', freight_charge: 70 });
  });

  // A courier that quotes nothing must read as free-of-charge zero rather
  // than NaN, which would poison the whole delivery total.
  it('treats a courier that quotes no rate at all as zero, and fills its blanks', async () => {
    const gw = loadGateway();
    configure();
    stubFetch({
      login: reply({ token: 'tok' }),
      api: reply({ data: { available_courier_companies: [{}] } }),
    });
    await expect(
      gw.getServiceability({ pickupPincode: '110001', deliveryPincode: '560001', weightKg: 1 }),
    ).resolves.toEqual({
      serviceable: true,
      courier_name: '',
      courier_company_id: '',
      freight_charge: 0,
      etd: '',
    });
  });

  it('answers null when the serviceability body carries no courier list', async () => {
    const gw = loadGateway();
    configure();
    stubFetch({ login: reply({ token: 'tok' }), api: reply({}) });
    await expect(
      gw.getServiceability({ pickupPincode: '110001', deliveryPincode: '560001', weightKg: 1 }),
    ).resolves.toBeNull();
  });

  it('leaves an unlabelled tracking activity blank instead of undefined', async () => {
    const gw = loadGateway();
    configure();
    stubFetch({
      login: reply({ token: 'tok' }),
      api: reply({ tracking_data: { track_status: 'PENDING', shipment_track_activities: [{}] } }),
    });
    await expect(gw.trackByShipment('SH-3')).resolves.toEqual({
      current_status: 'PENDING',
      activities: [{ status: '', location: '', note: '', date: '' }],
    });
  });
});
