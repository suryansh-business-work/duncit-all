/**
 * List the ECOMM_MANAGER accounts that own no E-Commerce Brand — most likely
 * the pet store's own staff — so an admin can grant them ECOMM_STORE_MANAGER
 * before the deploy that moves the Ecomm console onto that role.
 *
 *     npm run check:ecomm-store-staff     # read-only, writes nothing
 *
 * Why: ECOMM_MANAGER used to open BOTH the pet store console
 * (ecomm-portal.duncit.com) and the Partner Brand area of the Partners portal.
 * Every approved brand partner holds it, so every brand partner could read the
 * store's orders, customers and coupons. The store now needs
 * ECOMM_STORE_MANAGER. The people who run the store today hold only
 * ECOMM_MANAGER and will be locked out of the console the moment this ships —
 * unless an admin grants them the new role first (Admin > Users > Roles).
 *
 * Read-only by design: whether an account is store staff or a brand partner
 * whose brand was deleted is a judgement, not a rule — this only narrows the
 * list. Accounts already holding ECOMM_STORE_MANAGER are shown as done.
 *
 * The models are NOT imported, so nothing here can build an index or run a
 * model hook against the database being inspected.
 */
import 'dotenv/config';
import mongoose from 'mongoose';

interface Candidate {
  _id: unknown;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  roles: string[];
}

async function findCandidates(): Promise<Candidate[]> {
  return mongoose.connection
    .collection('users')
    .aggregate<Candidate>([
      { $match: { 'metadata.role_keys': 'ECOMM_MANAGER' } },
      {
        $lookup: {
          from: 'ecommbrands',
          localField: '_id',
          foreignField: 'owner_user_id',
          as: 'owned_brands',
        },
      },
      { $match: { owned_brands: { $size: 0 } } },
      {
        $project: {
          email: '$auth.email',
          first_name: '$profile.first_name',
          last_name: '$profile.last_name',
          roles: '$metadata.role_keys',
        },
      },
      { $sort: { email: 1 } },
    ])
    .toArray();
}

function printCandidate(c: Candidate) {
  const name = [c.first_name, c.last_name].filter(Boolean).join(' ') || '-';
  const done = c.roles.includes('ECOMM_STORE_MANAGER') ? '  [already ECOMM_STORE_MANAGER]' : '';
  console.log(`  ${String(c._id)}  ${c.email ?? '-'}  ${name}${done}`);
}

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI is not set — point it at the database you want to check.');
    process.exitCode = 1;
    return;
  }
  await mongoose.connect(uri, { dbName: process.env.MONGO_DB_NAME, autoIndex: false });

  const candidates = await findCandidates();
  if (candidates.length === 0) {
    console.log('OK — every ECOMM_MANAGER account owns a brand. No store staff to migrate.');
  } else {
    const pending = candidates.filter((c) => !c.roles.includes('ECOMM_STORE_MANAGER')).length;
    console.log(`${candidates.length} ECOMM_MANAGER account(s) own no E-Commerce Brand (${pending} without ECOMM_STORE_MANAGER):\n`);
    for (const c of candidates) printCandidate(c);
    console.log(
      '\nGrant ECOMM_STORE_MANAGER (Admin > Users > Roles) to the ones who run the pet store BEFORE deploying.' +
        '\nThey must sign out and back in afterwards — roles ride the session token.'
    );
  }

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect().catch(() => {});
  process.exitCode = 1;
});
