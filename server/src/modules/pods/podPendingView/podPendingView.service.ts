import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { PodModel, type IPod } from '@modules/pods/pod/pod.model';
import { mapPodToPublic, loadPodClubSlugMap } from '@modules/pods/pod/pod.service';
import { CategoryModel } from '@modules/pods/category/category.model';
import { ClubModel } from '@modules/clubs/club/club.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { VenueSlotModel } from '@modules/venues/venueSlot/venueSlot.model';
import { UserModel } from '@modules/access/user/user.model';
import { getFinanceSettings } from '@modules/finance/finance/finance.model';
import { breakdownService } from '@modules/finance/finance/breakdown.service';

const joinParts = (parts: Array<string | null | undefined>) =>
  parts
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(', ');

/** "+<ext> <number>" when an extension is stored, else the bare number. */
const contactNumber = (extension?: string | null, number?: string | null): string | null => {
  const num = (number ?? '').trim();
  if (!num) return null;
  const ext = (extension ?? '').trim();
  if (!ext) return num;
  const prefix = ext.startsWith('+') ? ext : `+${ext}`;
  return `${prefix} ${num}`;
};

/** The pod's hosts, plus co-hosts who have not declined, may read the view. */
function assertCanView(doc: IPod, userId: string): void {
  const isHost = (doc.pod_hosts_id ?? []).some((id) => String(id) === userId);
  const isCoHost = (doc.co_hosts ?? []).some(
    (c) => String(c.user_id) === userId && c.status !== 'DECLINED'
  );
  if (!isHost && !isCoHost) {
    throw new GraphQLError("Only this pod's hosts can view its venue and admin contacts", {
      extensions: { code: 'FORBIDDEN' },
    });
  }
}

async function venueContact(doc: IPod) {
  if (!doc.venue_id) return null;
  const venue = await VenueModel.findById(doc.venue_id)
    .select(
      'venue_name owner_name owner_phone owner_email address_line1 address_line2 locality city state postal_code country lat lng'
    )
    .lean();
  if (!venue) return null;
  return {
    venue_id: String(venue._id),
    venue_name: venue.venue_name ?? '',
    contact_person: venue.owner_name?.trim() || null,
    phone: contactNumber(null, venue.owner_phone),
    email: venue.owner_email?.trim() || null,
    address:
      joinParts([
        venue.address_line1,
        venue.address_line2,
        venue.locality,
        venue.city,
        venue.state,
        venue.postal_code,
        venue.country,
      ]) || null,
    lat: venue.lat ?? null,
    lng: venue.lng ?? null,
  };
}

/** The club's admin roster + category name in one read. */
async function clubInfo(clubId: Types.ObjectId) {
  const club = await ClubModel.findById(clubId).select('admin_user_ids category_id').lean();
  const category = club?.category_id
    ? await CategoryModel.findById(club.category_id).select('name').lean()
    : null;
  return {
    adminIds: (club?.admin_user_ids ?? []).map(String),
    categoryName: category?.name ?? '',
  };
}

async function clubAdminContact(adminIds: string[]) {
  const adminId = adminIds[0];
  if (!adminId) return null;
  const admin: any = await UserModel.findById(adminId).select(
    'profile.first_name profile.last_name profile.profile_photo auth.email auth.phone communication.whatsapp'
  );
  if (!admin) return null;
  return {
    user_id: String(admin._id),
    name: `${admin.profile?.first_name ?? ''} ${admin.profile?.last_name ?? ''}`.trim(),
    profile_photo: admin.profile?.profile_photo ?? null,
    phone: contactNumber(admin.auth?.phone?.extension, admin.auth?.phone?.number),
    whatsapp: contactNumber(
      admin.communication?.whatsapp?.extension,
      admin.communication?.whatsapp?.number
    ),
    email: admin.auth?.email ?? null,
  };
}

/** The primary host's projected payout (host_receives) — server owns the math. */
async function expectedEarnings(doc: IPod): Promise<number> {
  const primaryHost = String((doc.pod_hosts_id ?? [])[0] ?? '');
  const slot = doc.venue_slot_id
    ? await VenueSlotModel.findById(doc.venue_slot_id).select('price').lean()
    : null;
  const projection = await breakdownService.potentialPodEarnings(
    primaryHost,
    doc.pod_amount ?? 0,
    doc.no_of_spots ?? 0,
    doc.venue_id ? String(doc.venue_id) : null,
    slot?.price ?? null
  );
  return projection.waterfall.host_receives;
}

export const podPendingViewService = {
  async hostPodPendingView(podDocId: string, userId: string) {
    if (!Types.ObjectId.isValid(podDocId)) {
      throw new GraphQLError('Invalid pod id', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const doc = await PodModel.findById(podDocId);
    if (!doc) {
      throw new GraphQLError('Pod not found', { extensions: { code: 'NOT_FOUND' } });
    }
    assertCanView(doc, userId);

    const [slugMap, venue, club] = await Promise.all([
      loadPodClubSlugMap([doc]),
      venueContact(doc),
      clubInfo(doc.club_id),
    ]);
    // Sequential on purpose: getFinanceSettings() lazily creates its singleton
    // (find-then-create), and expectedEarnings() reads it too — running them
    // concurrently can race a duplicate-key insert on first boot.
    const earnings = await expectedEarnings(doc);
    const financeSettings = await getFinanceSettings();
    const club_admin = await clubAdminContact(club.adminIds);

    return {
      pod: mapPodToPublic(doc, slugMap),
      category_name: club.categoryName,
      expected_earnings: earnings,
      currency_symbol: financeSettings.currency_symbol,
      venue,
      club_admin,
    };
  },
};
