import { Types } from 'mongoose';
import { GraphQLError } from 'graphql';
import { logs } from '@observability/log';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import { ClubModel } from '@modules/clubs/club/club.model';
import { CategoryModel } from '@modules/pods/category/category.model';
import { UserModel } from '@modules/access/user/user.model';
import { whatsappService } from '@modules/platform/whatsapp/whatsapp.service';
import { nextEntityNo } from '@modules/venues/entityIdCounter';
import { ClubAdminProfileModel, type IClubAdminProfile } from './clubAdminProfile.model';

const notFound = () =>
  new GraphQLError('Club Admin not found', { extensions: { code: 'NOT_FOUND' } });
const badInput = (message: string) =>
  new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });

const CLUB_ADMIN_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['club_admin_no', 'full_name', 'email', 'phone'],
  sortFields: {
    club_admin_no: 'club_admin_no',
    full_name: 'full_name',
    email: 'email',
    status: 'status',
    is_active: 'is_active',
    commission_pct: 'commission_pct',
    joined_at: 'joined_at',
    created_at: 'created_at',
  },
  filterFields: {
    status: { type: 'enum' },
    is_active: { type: 'boolean' },
    commission_pct: { type: 'number' },
    joined_at: { type: 'date' },
    created_at: { type: 'date' },
  },
  defaultSort: { created_at: -1 },
};

const oid = (value?: string | null) =>
  value && Types.ObjectId.isValid(value) ? new Types.ObjectId(value) : null;

/** The admin's own account, with only the fields a WhatsApp send reads: the
 * number lives on the user, never on the onboarding record. */
const waRecipient = (userId: Types.ObjectId) =>
  UserModel.findById(userId).select('auth.phone communication.whatsapp').lean();

/**
 * Category NAMES and assigned CLUBS for a page of rows.
 *
 * Two extra queries for the whole page rather than two per row — the shape
 * `buildClubInfoRows` already uses next door. Clubs come from
 * `Club.admin_user_ids`, which is where they have always lived.
 */
async function enrich(docs: IClubAdminProfile[]) {
  if (docs.length === 0) return [];

  const categoryIds = docs
    .flatMap((d) => [d.super_category_id, d.category_id, d.sub_category_id])
    .filter(Boolean);
  const userIds = docs.map((d) => d.user_id);

  const [categories, clubs] = await Promise.all([
    CategoryModel.find({ _id: { $in: categoryIds } })
      .select('name')
      .lean(),
    ClubModel.find({ admin_user_ids: { $in: userIds } })
      .select('club_name admin_user_ids')
      .lean(),
  ]);

  const nameById = new Map(categories.map((c: any) => [String(c._id), c.name as string]));
  const clubsByUser = new Map<string, { id: string; club_name: string }[]>();
  for (const club of clubs as any[]) {
    for (const admin of club.admin_user_ids ?? []) {
      const key = String(admin);
      const bucket = clubsByUser.get(key);
      const entry = { id: String(club._id), club_name: club.club_name };
      if (bucket) bucket.push(entry);
      else clubsByUser.set(key, [entry]);
    }
  }

  const label = (id: unknown) => (id ? (nameById.get(String(id)) ?? null) : null);

  return docs.map((doc) => ({
    id: String(doc._id),
    club_admin_no: doc.club_admin_no,
    user_id: String(doc.user_id),
    full_name: doc.full_name,
    email: doc.email,
    phone: doc.phone,
    super_category: label(doc.super_category_id),
    category: label(doc.category_id),
    sub_category: label(doc.sub_category_id),
    super_category_id: doc.super_category_id ? String(doc.super_category_id) : null,
    category_id: doc.category_id ? String(doc.category_id) : null,
    sub_category_id: doc.sub_category_id ? String(doc.sub_category_id) : null,
    assigned_clubs: clubsByUser.get(String(doc.user_id)) ?? [],
    status: doc.status,
    is_active: doc.is_active,
    commission_pct: doc.commission_pct,
    joined_at: doc.joined_at ? doc.joined_at.toISOString() : null,
    reviewer_notes: doc.reviewer_notes,
    request_no: doc.request_no,
    created_at: doc.created_at?.toISOString() ?? null,
  }));
}

const one = async (doc: IClubAdminProfile) => (await enrich([doc]))[0];

export const clubAdminProfileService = {
  /** Server-side table page for the clubAdminProfilesTable query. */
  async table(input?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery<IClubAdminProfile>(
      ClubAdminProfileModel,
      {},
      input,
      CLUB_ADMIN_TABLE_CONFIG
    );
    return { rows: await enrich(docs), total, page, page_size };
  },

  async byId(id: string) {
    const doc = await ClubAdminProfileModel.findById(id);
    return doc ? one(doc) : null;
  },

  /**
   * Draft the record when an onboarding meeting is approved — the Club Admin
   * half of `draftFromMeeting`.
   *
   * It lands DRAFT and therefore reads as **Inactive**: the role is granted so
   * the person can see their dashboard, but they are not a live Club Admin
   * until the Onboarding Admin reviews them. Re-approving an already-approved
   * admin refreshes the category and leaves the approval alone.
   */
  async createDraftFromApproval(prefill: {
    userId: string;
    name?: string;
    email?: string;
    phone?: string;
    category?: {
      super_category_id: string;
      category_id: string;
      sub_category_id: string;
    } | null;
    request_no?: string | null;
  }) {
    if (!Types.ObjectId.isValid(prefill.userId)) throw badInput('Invalid user');
    const doc =
      (await ClubAdminProfileModel.findOne({ user_id: prefill.userId })) ??
      new ClubAdminProfileModel({ user_id: new Types.ObjectId(prefill.userId) });

    if (prefill.category) {
      doc.super_category_id = oid(prefill.category.super_category_id);
      doc.category_id = oid(prefill.category.category_id);
      doc.sub_category_id = oid(prefill.category.sub_category_id);
    }
    if (prefill.name && !doc.full_name) doc.full_name = prefill.name;
    if (prefill.email && !doc.email) doc.email = prefill.email;
    // Meeting phones arrive as "+91 9876543210" — strip whitespace only, never
    // digits, so a foreign number is not truncated. Same as the host twin.
    if (prefill.phone && !doc.phone) doc.phone = prefill.phone.replace(/\s+/g, '');
    if (prefill.request_no && !doc.request_no) doc.request_no = prefill.request_no;
    // The onboarding meeting completing IS the joining date.
    doc.joined_at ??= new Date();

    await doc.save();
    return one(doc);
  },

  async update(
    id: string,
    input: {
      full_name?: string;
      email?: string;
      phone?: string;
      super_category_id?: string | null;
      category_id?: string | null;
      sub_category_id?: string | null;
      commission_pct?: number | null;
    }
  ) {
    const doc = await ClubAdminProfileModel.findById(id);
    if (!doc) throw notFound();
    if (input.full_name !== undefined) doc.full_name = input.full_name;
    if (input.email !== undefined) doc.email = input.email;
    if (input.phone !== undefined) doc.phone = input.phone;
    if (input.super_category_id !== undefined) doc.super_category_id = oid(input.super_category_id);
    if (input.category_id !== undefined) doc.category_id = oid(input.category_id);
    if (input.sub_category_id !== undefined) doc.sub_category_id = oid(input.sub_category_id);
    if (input.commission_pct !== undefined) doc.commission_pct = input.commission_pct;
    await doc.save();
    return one(doc);
  },

  /** Approve: the record goes live and the table reads Active. */
  async approve(id: string, notes?: string | null) {
    const doc = await ClubAdminProfileModel.findById(id);
    if (!doc) throw notFound();
    doc.status = 'APPROVED';
    doc.is_active = true;
    doc.approved_at = new Date();
    doc.joined_at ??= doc.approved_at;
    if (notes !== undefined && notes !== null) doc.reviewer_notes = notes;
    await doc.save();
    return one(doc);
  },

  /**
   * Reject: still Inactive in the table, but recorded as a decision rather than
   * a not-yet — which is the difference between "nobody has looked" and
   * "somebody looked and said no".
   */
  async reject(id: string, notes: string) {
    if (!notes.trim()) throw badInput('A reason is required to reject a Club Admin');
    const doc = await ClubAdminProfileModel.findById(id);
    if (!doc) throw notFound();
    doc.status = 'REJECTED';
    doc.is_active = false;
    doc.reviewer_notes = notes;
    await doc.save();
    return one(doc);
  },

  async setCommission(id: string, commission_pct: number | null) {
    if (commission_pct !== null && (commission_pct < 0 || commission_pct > 100)) {
      throw badInput('Commission must be between 0 and 100');
    }
    const doc = await ClubAdminProfileModel.findById(id);
    if (!doc) throw notFound();
    doc.commission_pct = commission_pct;
    await doc.save();
    return one(doc);
  },

  async setActive(id: string, is_active: boolean) {
    const doc = await ClubAdminProfileModel.findById(id);
    if (!doc) throw notFound();
    // Nothing changed, so nobody is told: an account message carries no entity
    // for the WhatsApp duplicate index to key on, and pressing Deactivate twice
    // would otherwise be two billed messages.
    if (doc.is_active === is_active) return one(doc);
    doc.is_active = is_active;
    await doc.save();
    await whatsappService.send({
      event: is_active ? 'CLUB_ADMIN_ACCOUNT_REACTIVATED' : 'CLUB_ADMIN_ACCOUNT_SUSPENDED',
      user: await waRecipient(doc.user_id),
      name: doc.full_name,
      params: [doc.full_name],
    });
    return one(doc);
  },

  /**
   * Delete the onboarding record and unassign the person from every club.
   *
   * The user account and its CLUB_ADMIN role are left alone: deleting an
   * onboarding record must not delete a person's login. Leaving them on a club
   * would, though — a club with an admin who no longer exists in the list is
   * the kind of orphan nobody notices until it matters.
   */
  async remove(id: string) {
    const doc = await ClubAdminProfileModel.findById(id);
    if (!doc) return false;
    await ClubModel.updateMany(
      { admin_user_ids: doc.user_id },
      { $pull: { admin_user_ids: doc.user_id } }
    );
    await ClubAdminProfileModel.deleteOne({ _id: doc._id });
    logs.server.info('clubAdminProfile', 'remove', {
      club_admin_no: doc.club_admin_no,
      user_id: String(doc.user_id),
    });
    return true;
  },

  /**
   * Clubs this Club Admin could run: the ones matching their taxonomy — plus
   * any they already run that do not.
   *
   * A club stores its SUB category in `category_id` and its top level in
   * `super_category_id` — there is no third field. So a sub narrows exactly, a
   * middle category widens to its children, and a super is the broadest. The
   * same resolution `listAdminClubsPage` uses, so both screens agree on what
   * "matching" means.
   *
   * The "plus" matters. An admin can hold a club from outside their category —
   * assigned before the category was set, or from the club's own admin list —
   * and the taxonomy filter alone hid it. The picker then showed fewer clubs
   * than the row beside it listed as assigned, with no way to give one back:
   * a checkbox you cannot see is not a decision you can make. They come back
   * flagged, so the screen can say why they are there.
   */
  /**
   * Club Admins whose onboarding taxonomy matches a club's — the MIRROR of
   * `matchingClubs`, which already answers the same question from the other end.
   *
   * The New Club form used to offer every CLUB_ADMIN role-holder on the
   * platform, so a club could be handed to an admin onboarded for an unrelated
   * category. A Club Admin picks their Super > Category > Sub at onboarding and
   * that is what they are approved against, so it is what the picker filters on.
   *
   * Matching is deliberately at the level the CLUB provides: a club with a Sub
   * matches admins on that Sub; with only a Category, any admin whose Sub sits
   * under it (or who chose that Category outright); with only a Super, on the
   * Super. Passing nothing returns everyone, so the picker still works before a
   * category is chosen rather than looking broken.
   *
   * Only APPROVED and active admins are offered: a DRAFT profile is somebody
   * mid-onboarding who cannot yet be handed a club.
   */
  async candidatesForClub(filter: {
    super_category_id?: string | null;
    category_id?: string | null;
    sub_category_id?: string | null;
    search?: string | null;
  }) {
    const query: any = { status: 'APPROVED', is_active: true };

    if (filter.sub_category_id && Types.ObjectId.isValid(filter.sub_category_id)) {
      query.sub_category_id = new Types.ObjectId(filter.sub_category_id);
    } else if (filter.category_id && Types.ObjectId.isValid(filter.category_id)) {
      const subs = await CategoryModel.find({ parent_id: filter.category_id })
        .select('_id')
        .lean();
      const subIds = subs.map((s: any) => s._id);
      query.$or = [
        { category_id: new Types.ObjectId(filter.category_id) },
        ...(subIds.length > 0 ? [{ sub_category_id: { $in: subIds } }] : []),
      ];
    } else if (filter.super_category_id && Types.ObjectId.isValid(filter.super_category_id)) {
      query.super_category_id = new Types.ObjectId(filter.super_category_id);
    }

    const term = filter.search?.trim();
    if (term) {
      const rx = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`), 'i');
      const nameOrEmail = [{ full_name: rx }, { email: rx }];
      // A category $or is already in play when only a Category was given — AND
      // the two rather than letting the search overwrite the taxonomy filter.
      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: nameOrEmail }];
        delete query.$or;
      } else {
        query.$or = nameOrEmail;
      }
    }

    const docs = await ClubAdminProfileModel.find(query)
      .select('user_id full_name email super_category_id category_id sub_category_id')
      .sort({ full_name: 1 })
      .limit(50)
      .lean();

    return (docs as any[]).map((d) => ({
      user_id: String(d.user_id),
      full_name: d.full_name ?? '',
      email: d.email ?? '',
    }));
  },

  async matchingClubs(id: string, search?: string | null) {
    const doc = await ClubAdminProfileModel.findById(id);
    if (!doc) throw notFound();

    const taxonomy: any = {};
    if (doc.sub_category_id) {
      taxonomy.category_id = doc.sub_category_id;
    } else if (doc.category_id) {
      const subs = await CategoryModel.find({ parent_id: doc.category_id }).select('_id').lean();
      taxonomy.category_id = { $in: subs.map((s: any) => s._id) };
    } else if (doc.super_category_id) {
      taxonomy.super_category_id = doc.super_category_id;
    }

    const hasTaxonomy = Object.keys(taxonomy).length > 0;
    const query: any = hasTaxonomy
      ? { $or: [taxonomy, { admin_user_ids: doc.user_id }] }
      : {};
    if (search?.trim()) {
      query.club_name = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`), 'i');
    }

    const clubs = await ClubModel.find(query)
      .select('club_name admin_user_ids category_id super_category_id')
      .sort({ club_name: 1 })
      .limit(200)
      .lean();

    /** Does this club fall inside the admin's own category? */
    const inTaxonomy = (club: any): boolean => {
      if (!hasTaxonomy) return true;
      if (taxonomy.super_category_id) {
        return String(club.super_category_id ?? '') === String(taxonomy.super_category_id);
      }
      const want = taxonomy.category_id;
      const ids: string[] = want?.$in
        ? want.$in.map((v: any) => String(v))
        : [String(want)];
      return ids.includes(String(club.category_id ?? ''));
    };

    return (clubs as any[]).map((club) => ({
      id: String(club._id),
      club_name: club.club_name,
      assigned: (club.admin_user_ids ?? []).some((a: any) => String(a) === String(doc.user_id)),
      matches_category: inTaxonomy(club),
    }));
  },

  /**
   * Set exactly which clubs this admin runs.
   *
   * Written as a difference rather than a wholesale rewrite: a club can have
   * several admins, and replacing `admin_user_ids` would quietly remove
   * everyone else who runs it.
   */
  async assignClubs(id: string, clubIds: string[]) {
    const doc = await ClubAdminProfileModel.findById(id);
    if (!doc) throw notFound();
    const wanted = clubIds.filter((c) => Types.ObjectId.isValid(c)).map((c) => new Types.ObjectId(c));

    await ClubModel.updateMany(
      { _id: { $nin: wanted }, admin_user_ids: doc.user_id },
      { $pull: { admin_user_ids: doc.user_id } }
    );
    if (wanted.length) {
      await ClubModel.updateMany(
        { _id: { $in: wanted } },
        { $addToSet: { admin_user_ids: doc.user_id } }
      );
    }
    return one(doc);
  },

  /**
   * Give every existing Club Admin a record, so the table is complete on the
   * day it ships rather than only for people onboarded after it.
   *
   * Anyone holding the CLUB_ADMIN role without a profile gets one, seeded from
   * their account and from the meeting that granted the role. They land
   * APPROVED and active: they have been running clubs all along, and dropping
   * them to Inactive would be this feature switching working admins off.
   */
  async backfill(): Promise<{ created: number; skipped: number }> {
    /*
      An id for anyone who somehow has a record without one.

      The hook that mints them fires on INSERT, so a record written before the
      id existed would keep a blank one for good — and the table would show a
      dash in the column that is supposed to be this person's permanent handle.
      Creating the missing records below cannot fix those, because they are not
      missing. Done first so a record repaired here is not counted as created.
    */
    const idless = await ClubAdminProfileModel.find({
      $or: [{ club_admin_no: null }, { club_admin_no: { $exists: false } }],
    }).select('_id');
    for (const doc of idless) {
      doc.club_admin_no = await nextEntityNo('CADM', 'club_admin');
      await doc.save();
    }
    if (idless.length > 0) {
      logs.server.info('clubAdminProfile', 'backfill.ids', { count: idless.length });
    }

    // The user document stores a name in two halves and a phone in two parts —
    // `full_name` / `phone_number` are shapes `toPublic` builds, not fields.
    const users = await UserModel.find({ 'metadata.role_keys': 'CLUB_ADMIN' })
      .select('profile.first_name profile.last_name auth.email auth.phone created_at')
      .lean();
    const existing = new Set(
      (await ClubAdminProfileModel.find().select('user_id').lean()).map((d: any) =>
        String(d.user_id)
      )
    );

    const { MeetingModel } = await import('@modules/survey/meeting.model');
    let created = 0;

    for (const user of users as any[]) {
      const userId = String(user._id);
      if (existing.has(userId)) continue;

      // The approved CLUB_ADMIN meeting is where the taxonomy and the real
      // joining date live; without one we fall back to the account itself.
      const meeting = await MeetingModel.findOne({
        user_id: user._id,
        kind: 'CLUB_ADMIN',
        approval_status: 'APPROVED',
      })
        .sort({ created_at: -1 })
        .lean();

      const name = [user.profile?.first_name, user.profile?.last_name]
        .filter(Boolean)
        .join(' ')
        .trim();
      const phone = user.auth?.phone
        ? `${user.auth.phone.extension ?? ''}${user.auth.phone.number ?? ''}`
        : '';

      await ClubAdminProfileModel.create({
        user_id: user._id,
        full_name: name,
        email: user.auth?.email ?? '',
        phone,
        super_category_id: (meeting as any)?.super_category_id ?? null,
        category_id: (meeting as any)?.category_id ?? null,
        sub_category_id: (meeting as any)?.sub_category_id ?? null,
        request_no: (meeting as any)?.request_no ?? null,
        status: 'APPROVED',
        is_active: true,
        approved_at: (meeting as any)?.feedback_sent_at ?? user.created_at ?? new Date(),
        joined_at: (meeting as any)?.feedback_sent_at ?? user.created_at ?? new Date(),
      });
      created += 1;
    }

    return { created, skipped: users.length - created };
  },
};
