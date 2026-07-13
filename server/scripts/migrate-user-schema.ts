/**
 * Forward migration: legacy flat User document → nested storage + relation
 * collections + denormalized counters.
 *
 * Idempotent + batched + reversible (see migrate-user-schema-rollback.ts).
 *
 * Run with:
 *   ts-node --transpile-only scripts/migrate-user-schema.ts
 *   ts-node --transpile-only scripts/migrate-user-schema.ts --dry-run
 *   ts-node --transpile-only scripts/migrate-user-schema.ts --batch-size=200
 *
 * Field mapping (every original field accounted for):
 *   first_name, last_name, dob, country, profile_photo, bio, city, zone,
 *     assigned_city → users.profile.*
 *   email, is_email_verified, password, google_id, last_login_provider,
 *     last_login_at, email_verification_otp_hash,
 *     email_verification_otp_expires_at → users.auth.*
 *   phone_number, phone_extension, is_phone_verified → users.auth.phone.*
 *   pet_profile, profile_links → users.pet_profile, users.profile_links
 *   whatsapp_extension, whatsapp_number, whatsapp_verified_at
 *     → users.communication.whatsapp.*
 *   status, onboarding_survey_completed, is_first_time_user, created_at,
 *     updated_at → users.metadata.*
 *   roles → user_roles collection (+ users.metadata.role_keys cache)
 *   assigned_zones → user_roles.scope.zone (+ users.metadata.assigned_zones)
 *   following_user_ids / follower_user_ids → user_relationships
 *   following_pod_ids → pod_followers
 *   following_club_ids → club_followers
 *   saved_pod_ids → user_saved_pods
 *   interest_category_ids → user_interests
 *   followers_count, following_count, saved_pods_count,
 *     following_pods_count, following_clubs_count, interests_count
 *     → users.counters.* (populated from actual counts)
 */
import 'dotenv/config';
import mongoose, { Types } from 'mongoose';
import { connectDB } from '../src/config/db';

type Args = { dryRun: boolean; batchSize: number };

function parseArgs(): Args {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes('--dry-run'),
    batchSize: Math.max(
      1,
      Number(
        args.find((a) => a.startsWith('--batch-size='))?.split('=')[1] ?? 200
      )
    ),
  };
}

const { dryRun, batchSize } = parseArgs();
const log = (...m: any[]) => console.log('[migrate]', ...m);

type Collections = {
  users: any;
  userRoles: any;
  userRelationships: any;
  podFollowers: any;
  clubFollowers: any;
  userSavedPods: any;
  userInterests: any;
};

// Strip undefined keys so the BSON does not end up with explicit null
// for optional unique fields (google_id, email). The partial-filter
// indexes only constrain rows where the field is a string.
const prune = <T extends Record<string, any>>(obj: T): T => {
  for (const k of Object.keys(obj)) {
    if (obj[k] === undefined) delete obj[k];
  }
  return obj;
};

function buildAuthDoc(doc: any): Record<string, any> {
  return prune({
    email: doc.email ? String(doc.email).toLowerCase() : undefined,
    is_email_verified: !!doc.is_email_verified,
    password: doc.password ?? undefined,
    google_id: doc.google_id ?? undefined,
    last_login_provider: doc.last_login_provider ?? null,
    last_login_at: doc.last_login_at ?? null,
    email_verification_otp_hash: doc.email_verification_otp_hash ?? undefined,
    email_verification_otp_expires_at: doc.email_verification_otp_expires_at ?? undefined,
    phone: prune({
      number: doc.phone_number ? String(doc.phone_number).trim() : undefined,
      extension: doc.phone_extension ? String(doc.phone_extension).trim() : undefined,
      is_verified: !!doc.is_phone_verified,
    }),
  });
}

function buildUserSet(doc: any, roleKeys: string[], assignedZones: string[]): Record<string, any> {
  const $set: Record<string, any> = {
    auth: buildAuthDoc(doc),
    profile: prune({
      first_name: doc.first_name ?? '',
      last_name: doc.last_name ?? '',
      dob: doc.dob ?? null,
      country: doc.country ?? 'India',
      profile_photo: doc.profile_photo ?? undefined,
      bio: doc.bio ?? undefined,
      locale: 'en-IN',
      timezone: 'Asia/Kolkata',
      city: doc.city ?? undefined,
      zone: doc.zone ?? undefined,
      assigned_city: doc.assigned_city ?? undefined,
    }),
    communication: {
      whatsapp: {
        extension: doc.whatsapp_extension ?? '',
        number: doc.whatsapp_number ?? '',
        verified_at: doc.whatsapp_verified_at ?? null,
      },
    },
    metadata: {
      status: doc.status ?? 'ACTIVE',
      onboarding_survey_completed: !!doc.onboarding_survey_completed,
      is_first_time_user: !!doc.is_first_time_user,
      deleted_at: null,
      role_keys: roleKeys,
      assigned_zones: assignedZones,
      created_at: doc.created_at ?? new Date(),
      updated_at: doc.updated_at ?? new Date(),
    },
    // Counters are computed from the source arrays for now. They are
    // rebuilt exactly from the same arrays below, so a re-run produces
    // identical values (idempotent).
    counters: {
      followers_count: (doc.follower_user_ids ?? []).length,
      following_count: (doc.following_user_ids ?? []).length,
      saved_pods_count: (doc.saved_pod_ids ?? []).length,
      following_pods_count: (doc.following_pod_ids ?? []).length,
      following_clubs_count: (doc.following_club_ids ?? []).length,
      interests_count: (doc.interest_category_ids ?? []).length,
    },
    security: {
      two_factor_enabled: false,
      failed_login_attempts: 0,
      locked_until: null,
      password_changed_at: null,
    },
  };

  if (Array.isArray(doc.pet_profile) === false && doc.pet_profile) {
    $set.pet_profile = doc.pet_profile;
  } else {
    $set.pet_profile = doc.pet_profile ?? null;
  }
  $set.profile_links = doc.profile_links ?? [];
  return $set;
}

// Build relation rows. ordered:false + try/catch on E11000 keeps the
// re-run idempotent — compound unique indexes prevent duplicates.
function buildRoleRows(
  doc: any,
  userId: Types.ObjectId,
  roleKeys: string[],
  assignedZones: string[]
): any[] {
  const rolesRows: any[] = [];
  for (const role of roleKeys) {
    if (role === 'ZONAL_ADMIN' && assignedZones.length) {
      for (const zone of assignedZones) {
        rolesRows.push({
          user_id: userId,
          role,
          scope: { city: null, zone },
          assigned_by: null,
          assigned_at: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
        });
      }
    } else if (role === 'CITY_ADMIN' && doc.assigned_city) {
      rolesRows.push({
        user_id: userId,
        role,
        scope: { city: doc.assigned_city, zone: null },
        assigned_by: null,
        assigned_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      });
    } else {
      rolesRows.push({
        user_id: userId,
        role,
        scope: { city: null, zone: null },
        assigned_by: null,
        assigned_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      });
    }
  }
  return rolesRows;
}

function buildRelationRows(doc: any, userId: Types.ObjectId) {
  const followRows = (doc.following_user_ids ?? []).map((targetId: any) => ({
    follower_id: userId,
    following_id: new Types.ObjectId(String(targetId)),
    created_at: new Date(),
    updated_at: new Date(),
  }));

  const podFollowerRows = (doc.following_pod_ids ?? []).map((podId: any) => ({
    user_id: userId,
    pod_id: new Types.ObjectId(String(podId)),
    created_at: new Date(),
    updated_at: new Date(),
  }));

  const clubFollowerRows = (doc.following_club_ids ?? []).map((clubId: any) => ({
    user_id: userId,
    club_id: new Types.ObjectId(String(clubId)),
    created_at: new Date(),
    updated_at: new Date(),
  }));

  const savedPodRows = (doc.saved_pod_ids ?? []).map((podId: any) => ({
    user_id: userId,
    pod_id: new Types.ObjectId(String(podId)),
    created_at: new Date(),
    updated_at: new Date(),
  }));

  const interestRows = (doc.interest_category_ids ?? []).map((catId: any) => ({
    user_id: userId,
    interest_category_id: new Types.ObjectId(String(catId)),
    created_at: new Date(),
    updated_at: new Date(),
  }));

  return { followRows, podFollowerRows, clubFollowerRows, savedPodRows, interestRows };
}

const safeInsert = async (collection: any, rows: any[]) => {
  if (!rows.length) return;
  try {
    await collection.insertMany(rows, { ordered: false });
  } catch (e: any) {
    // 11000 = duplicate-key; expected on re-run (compound unique).
    if (e?.code !== 11000 && !e?.writeErrors?.every((w: any) => w?.code === 11000)) {
      throw e;
    }
  }
};

/** Reshape one legacy user doc and fan its arrays out into relation rows. */
async function migrateUser(doc: any, col: Collections): Promise<'MIGRATED' | 'SKIPPED'> {
  const isAlready = !!doc.auth && !!doc.profile;
  if (isAlready) return 'SKIPPED';

  const userId: Types.ObjectId = doc._id;
  const roleKeys: string[] = Array.isArray(doc.roles) && doc.roles.length ? doc.roles : ['USER'];
  const assignedZones: string[] = Array.isArray(doc.assigned_zones) ? doc.assigned_zones : [];

  const $set = buildUserSet(doc, roleKeys, assignedZones);
  const rolesRows = buildRoleRows(doc, userId, roleKeys, assignedZones);
  const { followRows, podFollowerRows, clubFollowerRows, savedPodRows, interestRows } =
    buildRelationRows(doc, userId);

  if (dryRun) return 'MIGRATED';

  // Apply user doc reshape. We intentionally DO NOT $unset the legacy
  // fields here — keeping the original arrays in place is the rollback
  // path during the cutover window. A separate sweep can drop them once
  // we verify the new shape in production.
  await col.users.updateOne({ _id: userId }, { $set });

  await Promise.all([
    safeInsert(col.userRoles, rolesRows),
    safeInsert(col.userRelationships, followRows),
    safeInsert(col.podFollowers, podFollowerRows),
    safeInsert(col.clubFollowers, clubFollowerRows),
    safeInsert(col.userSavedPods, savedPodRows),
    safeInsert(col.userInterests, interestRows),
  ]);

  // Recompute follower_count for any user that this user follows — the
  // received side of the edge.
  if (followRows.length) {
    const targetIds = followRows.map((r: any) => r.following_id);
    await col.users.updateMany(
      { _id: { $in: targetIds } },
      { $set: { 'counters.followers_count_dirty': true } }
    );
  }

  return 'MIGRATED';
}

/**
 * Second pass — recompute followers_count from authoritative
 * user_relationships rows. Cheap; runs only on users we touched.
 */
async function rebuildFollowerCounts(col: Collections) {
  const dirty = col.users.find({ 'counters.followers_count_dirty': true }).project({ _id: 1 });
  while (await dirty.hasNext()) {
    const r: any = await dirty.next();
    const count = await col.userRelationships.countDocuments({ following_id: r._id });
    await col.users.updateOne(
      { _id: r._id },
      {
        $set: { 'counters.followers_count': count },
        $unset: { 'counters.followers_count_dirty': '' },
      }
    );
  }
}

async function migrate() {
  await connectDB();
  const db = mongoose.connection.db!;
  const col: Collections = {
    users: db.collection('users'),
    userRoles: db.collection('userroles'),
    userRelationships: db.collection('userrelationships'),
    podFollowers: db.collection('podfollowers'),
    clubFollowers: db.collection('clubfollowers'),
    userSavedPods: db.collection('usersavedpods'),
    userInterests: db.collection('userinterests'),
  };

  log(`mode: ${dryRun ? 'DRY-RUN' : 'WRITE'}  batch_size: ${batchSize}`);

  // Idempotency marker: a migrated doc has top-level `auth` and `profile`
  // subdocuments. The cursor only sees rows missing those fields.
  const cursor = col.users
    .find({ $or: [{ auth: { $exists: false } }, { profile: { $exists: false } }] })
    .batchSize(batchSize);

  let processed = 0;
  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  while (await cursor.hasNext()) {
    const doc: any = await cursor.next();
    if (!doc) break;
    processed += 1;
    try {
      const outcome = await migrateUser(doc, col);
      if (outcome === 'SKIPPED') {
        skipped += 1;
        continue;
      }
      migrated += 1;
      if (migrated % batchSize === 0) {
        log(`  progress: ${migrated} migrated / ${processed} scanned`);
      }
    } catch (err) {
      failed += 1;
      console.error('[migrate] failed for', String(doc._id), err);
    }
  }

  if (!dryRun) {
    log('rebuilding followers_count from user_relationships ...');
    await rebuildFollowerCounts(col);
  }

  log(
    `done. processed=${processed} migrated=${migrated} skipped=${skipped} failed=${failed} dryRun=${dryRun}`
  );
  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error('[migrate] fatal:', err);
  process.exit(1);
});
