#!/usr/bin/env node
/**
 * PRODUCTION HOTFIX — run this ONCE, from server/:
 *
 *     node scripts/fix-prod-pod-types.mjs
 *
 * WHAT HAPPENED: a boot-time pod_type migration (uncommitted work) ran against
 * the live cluster because server/.env points at it and, with MONGO_DB_NAME
 * unset, the server defaults to the `test` database — which is where the
 * deployed API's data actually lives. It rewrote pod_type to the new FREE/PAID
 * values, which the DEPLOYED server's GraphQL enum cannot represent, so every
 * pod list in production fails with:
 *     Enum "PodType" cannot represent value: "PAID"
 *
 * WHAT THIS DOES: maps the new values back to legacy ones the deployed enum
 * accepts (PAID -> NATIVE_PAID, FREE -> NATIVE_FREE), pods and drafts both.
 * Production serves again the moment it completes. Idempotent; re-running is a
 * no-op. When the FREE/PAID release actually deploys, its own migration
 * re-collapses these forward.
 */
import { readFileSync } from 'node:fs';
import dns from 'node:dns';
import { createRequire } from 'node:module';

dns.setServers(['8.8.8.8', '1.1.1.1']);
const require = createRequire(import.meta.url);
const mongoose = require('../node_modules/mongoose');

const uri = readFileSync(new URL('../.env', import.meta.url), 'utf8')
  .split(/\r?\n/)
  .find((l) => l.startsWith('MONGO_URI'))
  .slice('MONGO_URI='.length)
  .trim();

const conn = await mongoose.createConnection(uri, { serverSelectionTimeoutMS: 25000 }).asPromise();
try {
  const db = conn.useDb('test').db;

  const paid = await db.collection('pods').updateMany({ pod_type: 'PAID' }, { $set: { pod_type: 'NATIVE_PAID' } });
  const free = await db.collection('pods').updateMany({ pod_type: 'FREE' }, { $set: { pod_type: 'NATIVE_FREE' } });
  console.log(`pods: PAID->NATIVE_PAID ${paid.modifiedCount}, FREE->NATIVE_FREE ${free.modifiedCount}`);

  const collections = (await db.listCollections().toArray()).map((c) => c.name);
  for (const name of collections.filter((c) => /draft/i.test(c))) {
    for (const [find, replacement] of [
      ['"pod_type":"PAID"', '"pod_type":"NATIVE_PAID"'],
      ['"pod_type":"FREE"', '"pod_type":"NATIVE_FREE"'],
    ]) {
      const escaped = find.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
      const res = await db.collection(name).updateMany({ payload: { $regex: escaped } }, [
        { $set: { payload: { $replaceAll: { input: '$payload', find, replacement } } } },
      ]);
      if (res.modifiedCount) console.log(`${name}: ${find} -> ${res.modifiedCount}`);
    }
  }

  const counts = await db.collection('pods').aggregate([{ $group: { _id: '$pod_type', n: { $sum: 1 } } }]).toArray();
  console.log('final pod_type counts:', counts.map((x) => `${x._id}=${x.n}`).join('  ') || '(no pods)');
  const bad = counts.filter((x) => x._id === 'FREE' || x._id === 'PAID');
  console.log(bad.length === 0 ? 'OK — production data is servable by the deployed enum again.' : 'STILL BROKEN — rerun or investigate.');
} finally {
  await conn.close();
}
