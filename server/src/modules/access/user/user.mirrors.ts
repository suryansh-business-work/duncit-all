import { Types } from 'mongoose';
import { ApprovalRequestModel } from '@modules/approval/approval.model';
import { AudienceListModel } from '@modules/crm/marketing/audienceList.model';
import { ClubAdminProfileModel } from '@modules/clubs/clubAdminProfile/clubAdminProfile.model';
import { HostModel } from '@modules/venues/host/host.model';
import { HostRequestModel } from '@modules/crm/hostRequest/hostRequest.model';
import { InventoryProductModel } from '@modules/venues/inventory/inventory.model';
import { MeetingModel } from '@modules/survey/meeting.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { UserModel } from './user.model';

/**
 * The user fields that are MIRRORED onto other collections, and kept correct.
 *
 * Everywhere else, a row stores the user id and the name is resolved at read
 * time (`userDisplayMap`). These collections cannot do that: their admin tables
 * search, sort and filter on the person's name or email, and Mongo cannot query
 * a value that is not on the document. Dropping the copies would not "move the
 * data to the context" — it would silently break search in nine consoles.
 *
 * So the copy stays and becomes DERIVED instead of stale: every profile change
 * fans out through `syncUserMirrors`, called from `publishSession` on the same
 * mutations that emit `user:changed`. The account is still the only place the
 * value is authored; these are an index of it.
 *
 * Deliberately NOT included:
 * - Anything that records what was true at a moment — invoices and their
 *   bill-to, orders, payout releases, issued tickets, signed documents,
 *   grievances, the Reported-Problem reporter snapshot, pod audit actors.
 *   Refreshing those would rewrite history, which is the opposite of the point.
 * - `EcommBrand.contact_*`, because a brand may nominate someone other than its
 *   owner as the contact; overwriting that on every profile save would quietly
 *   undo a deliberate choice.
 */
export interface UserMirrorFields {
  name: string;
  email: string;
  phone: string;
}

/** How one collection stores this user: which field holds the id, and what to
 * write. `stringId` marks the collections that keep the id as a string rather
 * than an ObjectId — `requested_by` on approvals is one. */
interface Mirror {
  label: string;
  update: (id: Types.ObjectId, raw: string, f: UserMirrorFields) => Promise<unknown>;
}

const MIRRORS: Mirror[] = [
  {
    label: 'approval.subject',
    update: (id, _raw, f) =>
      ApprovalRequestModel.updateMany(
        { subject_user_id: id },
        { $set: { subject_name: f.name, subject_email: f.email, subject_phone: f.phone } }
      ),
  },
  {
    label: 'approval.requested_by',
    update: (_id, raw, f) =>
      ApprovalRequestModel.updateMany({ requested_by: raw }, { $set: { requested_by_name: f.name } }),
  },
  {
    label: 'venue.owner',
    update: (id, _raw, f) =>
      VenueModel.updateMany(
        { owner_user_id: id },
        { $set: { owner_name: f.name, owner_email: f.email, owner_phone: f.phone } }
      ),
  },
  {
    label: 'clubAdminProfile',
    update: (id, _raw, f) =>
      ClubAdminProfileModel.updateMany(
        { user_id: id },
        { $set: { full_name: f.name, email: f.email, phone: f.phone } }
      ),
  },
  {
    label: 'host',
    update: (id, _raw, f) =>
      HostModel.updateMany(
        { user_id: id },
        { $set: { full_name: f.name, email: f.email, phone: f.phone } }
      ),
  },
  {
    label: 'hostRequest.contact',
    update: (id, _raw, f) =>
      HostRequestModel.updateMany(
        { host_user_id: id },
        { $set: { contact_name: f.name, contact_email: f.email, contact_phone: f.phone } }
      ),
  },
  {
    label: 'meeting.contact',
    update: (id, _raw, f) =>
      MeetingModel.updateMany(
        { user_id: id },
        { $set: { contact_name: f.name, contact_phone: f.phone } }
      ),
  },
  {
    label: 'inventory.listing_submitted_by',
    update: (_id, raw, f) =>
      InventoryProductModel.updateMany(
        { listing_submitted_by_id: raw },
        { $set: { listing_submitted_by_name: f.name } }
      ),
  },
  {
    label: 'audienceList.owner',
    update: (id, _raw, f) => AudienceListModel.updateMany({ owner_user_id: id }, { $set: { owner: f.name } }),
  },
];

/** Read the three fields the mirrors carry. */
export async function userMirrorFields(userId: string): Promise<UserMirrorFields | null> {
  if (!Types.ObjectId.isValid(userId)) return null;
  const u: any = await UserModel.findById(userId)
    .select('profile.first_name profile.last_name auth.email auth.phone.number auth.phone.extension')
    .lean();
  if (!u) return null;
  const profile = u.profile ?? {};
  const phone = u.auth?.phone ?? {};
  const ext = phone.extension ? `+${String(phone.extension).replace(/^\+/, '')}` : '';
  return {
    name: `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim(),
    email: u.auth?.email ?? '',
    phone: phone.number ? `${ext}${phone.number}` : '',
  };
}

/**
 * Refresh every mirrored copy of this user's display fields.
 *
 * Each collection is updated independently and a failure in one is swallowed:
 * this runs off a profile save, and a user must not be told their name could
 * not be changed because an unrelated collection was briefly unavailable. The
 * mirrors are an index — the account already holds the truth, and the next
 * profile save re-runs the whole fan-out.
 */
export async function syncUserMirrors(userId: string): Promise<void> {
  const fields = await userMirrorFields(userId);
  if (!fields) return;
  const id = new Types.ObjectId(userId);
  await Promise.all(
    MIRRORS.map((m) => m.update(id, userId, fields).catch(() => undefined))
  );
}
