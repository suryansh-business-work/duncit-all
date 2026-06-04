/**
 * Collapse RBAC to portal-based roles.
 *
 * Access is now purely role-based — one Role per console (plus admin scopes and
 * app roles). The old `resources`, `actions` and `permissions` collections, and
 * the `permission_keys` array on roles, are obsolete. This script:
 *
 *   1. Backfills a Role doc for every entry in ROLE_CATALOG (idempotent upsert),
 *      so every portal's required role is assignable — this is what fixes
 *      "access nahi mil raha" for HR / Employee / Onboarding.
 *   2. Strips the dead `permission_keys` field off every role doc.
 *   3. Drops the now-unused `resources`, `actions` and `permissions` collections.
 *
 * Idempotent; safe to re-run.
 *
 * Run:
 *   npm run migrate:rbac-roles
 *   npm run migrate:rbac-roles -- --dry-run
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../src/config/db';
import { RoleModel } from '../src/modules/access/rbac/rbac.model';
import { rbacService } from '../src/modules/access/rbac/rbac.service';
import { ROLE_CATALOG } from '../src/modules/access/user/user.constants';

const dryRun = process.argv.includes('--dry-run');
const log = (...m: unknown[]) => console.log('[migrate-rbac-roles]', ...m);

const DEAD_COLLECTIONS = ['resources', 'actions', 'permissions'];

async function run() {
  await connectDB();
  const db = mongoose.connection.db;
  if (!db) throw new Error('No database connection');

  log(`mode: ${dryRun ? 'DRY-RUN' : 'WRITE'}`);

  // 1. Backfill the role catalog (one access per portal).
  if (dryRun) {
    log(`would upsert ${ROLE_CATALOG.length} roles: ${ROLE_CATALOG.map((r) => r.key).join(', ')}`);
  } else {
    await rbacService.seedDefaults();
    const count = await RoleModel.countDocuments();
    log(`roles present after seed: ${count}`);
  }

  // 2. Strip the dead permission_keys field off role docs.
  const withPerms = await RoleModel.collection.countDocuments({ permission_keys: { $exists: true } });
  log(`role docs carrying legacy permission_keys: ${withPerms}`);
  if (withPerms > 0 && !dryRun) {
    await RoleModel.collection.updateMany({}, { $unset: { permission_keys: '' } });
    log('stripped permission_keys from all roles');
  }

  // 3. Drop the obsolete collections.
  const existing = (await db.listCollections().toArray()).map((c) => c.name);
  for (const name of DEAD_COLLECTIONS) {
    if (!existing.includes(name)) {
      log(`collection "${name}" not present — skip`);
      continue;
    }
    const docs = await db.collection(name).countDocuments();
    log(`collection "${name}" has ${docs} docs → ${dryRun ? 'would drop' : 'dropping'}`);
    if (!dryRun) await db.collection(name).drop();
  }

  await mongoose.disconnect();
  log('done.');
}

run().catch((e) => {
  console.error('[migrate-rbac-roles] failed', e);
  process.exit(1);
});
