/**
 * Give every existing Club Admin an onboarding record and an immutable id.
 *
 *   npm run migrate:club-admins:dry     # report only
 *   npm run migrate:club-admins         # write
 *
 * Host, Venue Partner and E-Commerce Brand have had a record since the day they
 * were onboarded. Club Admin got only a role, so the Onboarded Club Admins
 * table had nothing to show but a name and a date. This backfills the rest.
 *
 * Existing admins land APPROVED and active: they have been running clubs all
 * along, and starting them at Inactive would be this feature switching working
 * admins off. Only people onboarded from now on begin Inactive and wait for a
 * review.
 *
 * Idempotent — anyone who already has a record is skipped, so it is safe to
 * re-run against any environment.
 */
import mongoose from 'mongoose';
import { clubAdminProfileService } from '@modules/clubs/clubAdminProfile/clubAdminProfile.service';
import { ClubAdminProfileModel } from '@modules/clubs/clubAdminProfile/clubAdminProfile.model';
import { UserModel } from '@modules/access/user/user.model';

const DRY = process.argv.includes('--dry-run');

async function main(): Promise<void> {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI is not set.');
    process.exit(1);
  }

  await mongoose.connect(uri, { dbName: process.env.MONGO_DB_NAME });
  try {
    const admins = await UserModel.find({ 'metadata.role_keys': 'CLUB_ADMIN' })
      .select('full_name auth.email')
      .lean();
    const have = new Set(
      (await ClubAdminProfileModel.find().select('user_id').lean()).map((d: any) => String(d.user_id))
    );
    const missing = (admins as any[]).filter((u) => !have.has(String(u._id)));

    console.log(
      `${admins.length} Club Admin(s): ${have.size} already have a record, ${missing.length} need one.`
    );
    for (const user of missing) {
      console.log(`  + ${user.full_name || '(no name)'}  ${user.auth?.email || ''}`);
    }

    if (DRY) {
      console.log('\nDRY RUN — nothing written.');
      return;
    }
    if (missing.length === 0) {
      console.log('Nothing to do.');
      return;
    }

    const result = await clubAdminProfileService.backfill();
    console.log(`\nCreated ${result.created} record(s).`);

    // Read the ids back so the operator sees what was minted rather than
    // trusting a count.
    const created = await ClubAdminProfileModel.find({
      user_id: { $in: missing.map((u) => u._id) },
    })
      .select('club_admin_no full_name')
      .lean();
    for (const doc of created as any[]) {
      console.log(`  ${doc.club_admin_no}  ${doc.full_name || '(no name)'}`);
    }
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
