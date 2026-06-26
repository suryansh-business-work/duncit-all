/**
 * Backfill `Host.host_categories` for existing APPROVED Onboarded Hosts.
 *
 * The "Host Requests" feature adds a Category mapping on every approved host.
 * New approvals populate it automatically (hostService.addCategoryFromRequest),
 * but hosts approved before the feature have an empty `host_categories` array.
 *
 * This script, for each APPROVED Host with no host_categories:
 *   1. Finds the matching CRM HostLead by contact email / phone.
 *   2. Reads its super_category_id / category_ids[0] / sub_category_ids[0].
 *   3. Resolves those ids to display names.
 *   4. Pushes a single host_categories entry (request_no = "" — historical).
 *
 * Best-effort: hosts with no matching lead, or a lead with no category, are
 * logged and skipped. Idempotent; safe to re-run.
 *
 * Run:
 *   npm run migrate:host-categories
 *   npm run migrate:host-categories:dry
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../src/config/db';
import { HostModel } from '../src/modules/venues/host/host.model';
import { HostLeadModel } from '../src/modules/crm/crm/crm.model';
import { CategoryModel } from '../src/modules/pods/category/category.model';

const dryRun = process.argv.includes('--dry-run');
const log = (...m: unknown[]) => console.log('[migrate-host-categories]', ...m);

async function findLeadByContact(email: string, phone: string) {
  const or: any[] = [];
  if (email) or.push({ 'contacts.email': email.toLowerCase() });
  if (phone) or.push({ 'contacts.mobile_number': phone }, { 'contacts.whatsapp_number': phone });
  if (or.length === 0) return null;
  return HostLeadModel.findOne({ $or: or }).lean();
}

async function nameFor(id: any): Promise<string> {
  if (!id) return '';
  const cat = await CategoryModel.findById(id).select('name').lean();
  return (cat as any)?.name ?? '';
}

async function run() {
  await connectDB();
  log(`mode: ${dryRun ? 'DRY-RUN' : 'WRITE'}`);

  const hosts = await HostModel.find({
    status: 'APPROVED',
    $or: [{ host_categories: { $exists: false } }, { host_categories: { $size: 0 } }],
  });
  log(`approved hosts missing category: ${hosts.length}`);

  let backfilled = 0;
  let unmatched = 0;
  for (const h of hosts) {
    const lead = await findLeadByContact(h.email ?? '', h.phone ?? '');
    if (!lead) {
      unmatched += 1;
      log(`no lead match for host ${h._id} (${h.email || h.phone || 'no contact'})`);
      continue;
    }
    const superId = (lead as any).super_category_id ?? null;
    const categoryId = ((lead as any).category_ids ?? [])[0] ?? null;
    const subId = ((lead as any).sub_category_ids ?? [])[0] ?? null;
    if (!superId && !categoryId && !subId) {
      unmatched += 1;
      log(`lead ${(lead as any)._id} for host ${h._id} has no category`);
      continue;
    }
    const entry = {
      super_category_id: superId ?? null,
      category_id: categoryId ?? null,
      sub_category_id: subId ?? null,
      super_category_name: await nameFor(superId),
      category_name: await nameFor(categoryId),
      sub_category_name: await nameFor(subId),
      request_no: '',
    };
    backfilled += 1;
    log(`host ${h._id} -> ${[entry.super_category_name, entry.category_name, entry.sub_category_name].filter(Boolean).join(' > ')}`);
    if (!dryRun) {
      h.host_categories.push(entry);
      await h.save();
    }
  }

  log(`backfilled: ${backfilled}, unmatched: ${unmatched}`);
  await mongoose.disconnect();
  log('done.');
}

run().catch((e) => {
  console.error('[migrate-host-categories] failed', e);
  process.exit(1);
});
