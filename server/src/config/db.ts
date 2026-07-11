import mongoose from 'mongoose';

/**
 * Retry forever with capped exponential backoff. Crashing the container on
 * a transient outage (e.g. Atlas IP-allowlist hiccup, brief network blip)
 * propagates as 502 to every client portal — bad UX. Keep retrying instead;
 * once the upstream recovers, the next attempt connects and bootstrap
 * continues.
 */
export async function connectDB(): Promise<void> {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI is not set');
  // Staging shares the cluster but isolates its data in its own database.
  const dbName = process.env.MONGO_DB_NAME;

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
      // eslint-disable-next-line no-console
      console.log(`✅ MongoDB connected (attempt ${attempt})`);
      return;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(
        `⚠️  MongoDB connect attempt ${attempt} failed: ${(err as Error).message}`
      );
      await new Promise((r) => setTimeout(r, nextDelay()));
    }
  }
}
