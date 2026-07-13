/**
 * Razorpay credential diagnostic. Reads the active/default RAZORPAY env entry
 * straight from Mongo (exactly how the server resolves it) and runs a real
 * Razorpay auth + order-create call. No charge — creating an order is free.
 *
 * Run:  node --env-file=.env scripts/test-razorpay.mjs
 */
import mongoose from 'mongoose';

const mask = (v) => {
  if (!v) return '(missing)';
  if (v.length <= 8) return '••••';
  return `${v.slice(0, 8)}…(${v.length} chars)`;
};

async function testKeys(keyId, keySecret, label) {
  let mode;
  if (keyId.startsWith('rzp_test_')) mode = 'TEST';
  else if (keyId.startsWith('rzp_live_')) mode = 'LIVE';
  else mode = '⚠️ unknown prefix';
  console.log(`\nTesting ${label}: key_id=${mask(keyId)}  mode=${mode}`);
  const auth = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');
  const res = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: { Authorization: auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: 100, currency: 'INR', receipt: `diag_${Date.now()}` }),
  });
  const json = await res.json().catch(() => ({}));
  if (res.ok && json?.id) {
    console.log(`✅ SUCCESS — keys are valid. Test order created: ${json.id} (${json.amount} ${json.currency})`);
  } else {
    console.log(`❌ FAILED HTTP ${res.status} — ${json?.error?.description || JSON.stringify(json)}`);
    if (res.status === 401) console.log('   → Key ID / Key Secret pair is wrong, mismatched, or the secret is missing.');
  }
}

async function main() {
  // Direct mode: validate keys passed via env without touching the DB.
  if (process.env.RZP_KEY_ID && process.env.RZP_KEY_SECRET) {
    await testKeys(process.env.RZP_KEY_ID.trim(), process.env.RZP_KEY_SECRET.trim(), 'keys from RZP_KEY_ID/RZP_KEY_SECRET');
    return;
  }

  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI not set (run with: node --env-file=.env scripts/test-razorpay.mjs)');

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
  const db = mongoose.connection.db;
  // Mongoose lowercases the whole model name: 'EnvEntry' -> 'enventries'.
  const col = db.collection('enventries');

  const all = await col.find({ category: 'RAZORPAY' }).toArray();
  console.log(`\nRAZORPAY env entries found: ${all.length}`);
  for (const e of all) {
    console.log(
      `  • "${e.name}"  active=${e.is_active}  default=${e.is_default}  ` +
        `key_id=${mask(e.config?.key_id)}  key_secret=${e.config?.key_secret ? 'set' : '(missing)'}`,
    );
  }

  const active = await col.findOne({ category: 'RAZORPAY', is_active: true, is_default: true });
  if (!active) {
    console.log(
      '\n❌ No ACTIVE + DEFAULT RAZORPAY entry. The server resolves keys only from the active default entry.\n' +
        '   Fix in Tech portal → Environment → Razorpay: ensure the entry is Active and "Set default".',
    );
    return;
  }

  const keyId = (active.config?.key_id || '').trim();
  const keySecret = (active.config?.key_secret || '').trim();
  const rawId = active.config?.key_id || '';
  const rawSecret = active.config?.key_secret || '';
  const idWhitespace = rawId === keyId ? '' : '⚠️ has surrounding whitespace';
  const secretWhitespace = rawSecret === keySecret ? '' : '⚠️ has surrounding whitespace';
  const secretState = keySecret ? `set (${keySecret.length} chars)` : '(missing)';
  console.log(`\nActive default entry "${active.name}":`);
  console.log(`  key_id    : ${mask(keyId)}  ${idWhitespace}`);
  console.log(`  key_secret: ${secretState}  ${secretWhitespace}`);
  let mode;
  if (keyId.startsWith('rzp_test_')) mode = 'TEST';
  else if (keyId.startsWith('rzp_live_')) mode = 'LIVE';
  else mode = '⚠️ unrecognised prefix';
  console.log(`  mode      : ${mode}`);

  if (!keyId || !keySecret) {
    console.log('\n❌ key_id and/or key_secret missing — payment will fail with "not configured".');
    return;
  }

  await testKeys(keyId, keySecret, 'active default entry');
}

try {
  await main();
} catch (e) {
  console.error('\nDiagnostic error:', e.message);
} finally {
  await mongoose.disconnect();
}
