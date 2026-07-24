import dns from 'node:dns';
import mongoose from 'mongoose';
import { logs } from '@observability/log';

const DEFAULT_MONGO_DNS = ['8.8.8.8', '1.1.1.1'];

/**
 * `mongodb+srv://` needs an SRV + TXT DNS lookup. Some local, VPN or Windows
 * resolvers refuse that query (`querySrv ECONNREFUSED`) even when Compass
 * connects fine — Node's c-ares resolver takes a different path than the OS /
 * Compass. Pointing Node at a public resolver makes the SRV lookup succeed.
 */
function isDnsSrvFailure(message: string): boolean {
  const m = message.toLowerCase();
  return m.includes('querysrv') || m.includes('querytxt') || m.includes('_mongodb._tcp');
}

/** DNS servers to use for the Mongo SRV lookup (MONGO_DNS_SERVERS override). */
function mongoDnsServers(): string[] {
  const raw = process.env.MONGO_DNS_SERVERS;
  if (!raw) return DEFAULT_MONGO_DNS;
  const parsed = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return parsed.length > 0 ? parsed : DEFAULT_MONGO_DNS;
}

let dnsOverridden = false;
let dnsHintShown = false;

/**
 * Repoint Node's resolver at a public DNS so the Atlas SRV lookup succeeds.
 * Production is deliberately never auto-touched: the prod container resolves
 * internal Docker service names (e.g. `signoz-otel-collector`, `open-wa`) via
 * Docker's embedded DNS, which a public resolver would break. This runs only
 * when MONGO_DNS_SERVERS is set, or — outside production — after an SRV lookup
 * has actually been refused.
 */
function overrideMongoDns(reason: string): void {
  if (dnsOverridden) return;
  const servers = mongoDnsServers();
  try {
    // dns.setServers throws synchronously on a malformed IP — never let a bad
    // MONGO_DNS_SERVERS value crash boot; keep retrying with the default resolver.
    dns.setServers(servers);
  } catch (e) {
    console.warn(`⚠️  Ignoring invalid MONGO_DNS_SERVERS (${servers.join(', ')}): ${(e as Error).message}`);
    return;
  }
  dnsOverridden = true;
  const msg = `Resolving MongoDB SRV via DNS ${servers.join(', ')} (${reason}).`;
  console.info(`ℹ️  ${msg}`);
  logs.server.info('db', 'connectDB', { msg });
}

/**
 * Retry forever with capped exponential backoff. Crashing the container on
 * a transient outage (e.g. Atlas IP-allowlist hiccup, brief network blip)
 * propagates as 502 to every client portal — bad UX. Keep retrying instead;
 * once the upstream recovers, the next attempt connects and bootstrap
 * continues.
 */
export async function connectDB(): Promise<void> {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('ERROR: MONGO_URI is not set.');
    console.error('Create server/.env from server/.env.example and set MONGO_URI.');
    throw new Error('MONGO_URI is not set');
  }
  // Staging shares the cluster but isolates its data in its own database.
  const dbName = process.env.MONGO_DB_NAME;
  const isProd = process.env.NODE_ENV === 'production';

  // Explicit opt-in (any environment): apply the override before connecting.
  if (process.env.MONGO_DNS_SERVERS) {
    overrideMongoDns('MONGO_DNS_SERVERS set');
  }

  mongoose.set('strictQuery', true);

  let attempt = 0;
  // Backoff: 3s, 6s, 9s, … capped at 30s.
  const nextDelay = () => Math.min(3000 * Math.max(1, attempt), 30_000);

  // eslint-disable-next-line no-constant-condition
  while (true) {
    attempt += 1;
    try {
      await mongoose.connect(uri, {
        // Mumbai → Mumbai latency to this VPS spikes (TLS handshakes have
        // been measured at 1–7s). 30s leaves no headroom for replica-set
        // discovery across 3 shards; bumping to 60s removes spurious
        // "ServerSelectionTimedOut" failures during startup.
        serverSelectionTimeoutMS: 60_000,
        connectTimeoutMS: 60_000,
        socketTimeoutMS: 60_000,
        family: 4, // prefer IPv4 — avoids some Atlas SRV resolution issues
        retryWrites: true,
        ...(dbName ? { dbName } : {}),
      });
      console.info('✅ MongoDB connected');
      logs.server.info('db', 'connectDB', {
        attempt,
        msg: '✅ MongoDB connected',
      });
      return;
    } catch (err) {
      const message = (err as Error).message;
      console.warn(`⚠️  MongoDB connect attempt ${attempt} failed: ${message}`);
      logs.server.warn('db', 'connectDB', {
        error: err,
        attempt,
        msg: `⚠️  MongoDB connect attempt ${attempt} failed: ${message}`,
      });

      if (isDnsSrvFailure(message) && !dnsOverridden) {
        if (isProd) {
          if (!dnsHintShown) {
            dnsHintShown = true;
            console.warn(
              '   ↳ DNS SRV lookup was refused. Set MONGO_DNS_SERVERS=8.8.8.8,1.1.1.1, ' +
                'or switch MONGO_URI to a non-SRV standard connection string.',
            );
          }
        } else {
          // Local/dev only — auto-heal so the next attempt uses a public resolver.
          overrideMongoDns('SRV lookup was refused');
        }
      }
      await new Promise((r) => setTimeout(r, nextDelay()));
    }
  }
}
