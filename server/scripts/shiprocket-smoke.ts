/**
 * ShipRocket smoke test — READ-ONLY. Never creates an order, AWB or pickup.
 *
 *   SHIPROCKET_EMAIL=… SHIPROCKET_PASSWORD=… pnpm --filter server shiprocket:smoke
 *
 * Optional: SMOKE_PICKUP_PINCODE (default 201017), SMOKE_DELIVERY_PINCODES
 * (default "110001,400001"), SMOKE_WEIGHT_KG (default 1).
 *
 * Credentials come from the environment only — never from a file. Use the
 * same API user the Tech portal holds (ShipRocket → Settings → API).
 *
 * Exits 1 on any failed step, printing ShipRocket's own reason.
 */
const BASE = 'https://apiv2.shiprocket.in/v1/external';
const TIMEOUT_MS = 20_000;

type Json = Record<string, any>;

const env = (key: string, fallback = '') => (process.env[key] ?? fallback).trim();

async function call(path: string, init: RequestInit, token?: string): Promise<Json> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const data = (await res.json().catch(() => ({}))) as Json;
  if (!res.ok) throw new Error(`${path.split('?')[0]} → HTTP ${res.status}: ${JSON.stringify(data?.message ?? data)}`);
  return data;
}

async function login(): Promise<string> {
  const email = env('SHIPROCKET_EMAIL');
  const password = env('SHIPROCKET_PASSWORD');
  if (!email || !password) throw new Error('Set SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD in the environment');
  const data = await call('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  if (!data.token) throw new Error('Login answered without a token');
  console.log(`✔ login: company ${data.company_id ?? '?'} (${email})`);
  return String(data.token);
}

async function pickups(token: string) {
  const data = await call('/settings/company/pickup', { method: 'GET' }, token);
  const rows: Json[] = data?.data?.shipping_address ?? [];
  console.log(`✔ pickup locations: ${rows.length}`);
  for (const p of rows) {
    console.log(`   - "${p.pickup_location}" ${p.city} ${p.pin_code} verified=${Number(p.phone_verified) === 1}`);
  }
}

async function wallet(token: string) {
  const data = await call('/account/details/wallet-balance', { method: 'GET' }, token);
  console.log(`✔ wallet balance: ₹${data?.data?.balance_amount ?? '?'}`);
}

async function lane(token: string, from: string, to: string, weight: string) {
  const params = new URLSearchParams({ pickup_postcode: from, delivery_postcode: to, weight, cod: '0' });
  const data = await call(`/courier/serviceability/?${params.toString()}`, { method: 'GET' }, token);
  const couriers: Json[] = data?.data?.available_courier_companies ?? [];
  const cheapest = couriers.reduce<Json | null>(
    (min, c) => (min === null || Number(c.rate) < Number(min.rate) ? c : min),
    null
  );
  const best = cheapest ? `${cheapest.courier_name} ₹${cheapest.rate}, ETA ${cheapest.etd}` : 'none';
  console.log(`✔ ${from} → ${to} (${weight} kg): ${couriers.length} courier(s); cheapest ${best}`);
}

async function main() {
  const token = await login();
  await pickups(token);
  await wallet(token);
  const from = env('SMOKE_PICKUP_PINCODE', '201017');
  const weight = env('SMOKE_WEIGHT_KG', '1');
  for (const to of env('SMOKE_DELIVERY_PINCODES', '110001,400001').split(',').map((p) => p.trim()).filter(Boolean)) {
    await lane(token, from, to, weight);
  }
  console.log('ShipRocket smoke test passed — nothing was created.');
}

// A CommonJS script (the server has no "type": "module"), so no top-level await.
main().catch((error: unknown) => {
  console.error(`✘ ${(error as Error).message}`);
  process.exitCode = 1;
});
