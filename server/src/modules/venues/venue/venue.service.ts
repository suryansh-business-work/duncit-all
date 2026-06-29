import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { VenueModel, type IVenue, type IVenueRules, type IVenueSettings } from './venue.model';
import { LocationModel } from '@modules/platform/location/location.model';
import { UserModel } from '@modules/access/user/user.model';
import { sendEmail } from '@services/email/email.service';
import { normalizeBankAccountInput, toBankAccountPub } from '@modules/finance/finance/bankAccount';

const fail = (code: string, message: string): never => {
  throw new GraphQLError(message, { extensions: { code } });
};

const HHMM_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const hhmmToMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

const clampInt = (value: unknown, min: number, max: number, fallback: number) => {
  const n = Math.trunc(Number(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
};

const toRulesPub = (r?: Partial<IVenueRules> | null) => ({
  buffer_minutes: r?.buffer_minutes ?? 0,
  min_notice_minutes: r?.min_notice_minutes ?? 0,
  max_advance_days: r?.max_advance_days ?? 60,
  max_bookings_per_slot: r?.max_bookings_per_slot ?? 1,
  allow_instant_booking: r?.allow_instant_booking ?? true,
  allow_waitlist: r?.allow_waitlist ?? false,
  booking_approval_required: r?.booking_approval_required ?? false,
  allow_multiple_bookings: r?.allow_multiple_bookings ?? false,
});

const toSettingsPub = (s?: IVenueSettings | null) => ({
  operating_hours: {
    open: s?.operating_hours?.open ?? '09:00',
    close: s?.operating_hours?.close ?? '23:00',
  },
  weekly_off_days: [...(s?.weekly_off_days ?? [])].sort((a, b) => a - b),
  holidays: [...(s?.holidays ?? [])].sort((a, b) => a.localeCompare(b)),
  rules: toRulesPub(s?.rules),
});

function normalizeRulesInput(base: ReturnType<typeof toRulesPub>, input: any) {
  const intField = (value: unknown, min: number, max: number, fallback: number) =>
    value !== undefined ? clampInt(value, min, max, fallback) : fallback;
  const boolField = (value: unknown, fallback: boolean) =>
    value !== undefined ? Boolean(value) : fallback;
  return {
    buffer_minutes: intField(input.buffer_minutes, 0, 1440, base.buffer_minutes),
    min_notice_minutes: intField(input.min_notice_minutes, 0, 525_600, base.min_notice_minutes),
    max_advance_days: intField(input.max_advance_days, 1, 365, base.max_advance_days),
    max_bookings_per_slot: intField(input.max_bookings_per_slot, 1, 100_000, base.max_bookings_per_slot),
    allow_instant_booking: boolField(input.allow_instant_booking, base.allow_instant_booking),
    allow_waitlist: boolField(input.allow_waitlist, base.allow_waitlist),
    booking_approval_required: boolField(input.booking_approval_required, base.booking_approval_required),
    allow_multiple_bookings: boolField(input.allow_multiple_bookings, base.allow_multiple_bookings),
  };
}

function normalizeSettingsInput(current: IVenueSettings | undefined, input: any) {
  const base = toSettingsPub(current);
  const next = { ...base };
  if (input.operating_hours) {
    const open = String(input.operating_hours.open ?? '');
    const close = String(input.operating_hours.close ?? '');
    if (!HHMM_RE.test(open) || !HHMM_RE.test(close)) {
      fail('BAD_USER_INPUT', 'Operating hours must be HH:mm (24-hour)');
    }
    if (hhmmToMinutes(open) >= hhmmToMinutes(close)) {
      fail('BAD_USER_INPUT', 'Opening time must be before closing time');
    }
    next.operating_hours = { open, close };
  }
  if (input.weekly_off_days !== undefined) {
    const days = (input.weekly_off_days as unknown[]).map((d) => Math.trunc(Number(d)));
    if (days.some((d) => !Number.isFinite(d) || d < 0 || d > 6)) {
      fail('BAD_USER_INPUT', 'weekly_off_days must be integers 0..6 (Sun..Sat)');
    }
    next.weekly_off_days = [...new Set(days)].sort((a, b) => a - b);
  }
  if (input.holidays !== undefined) {
    const hs = (input.holidays as unknown[]).map((h) => String(h).trim());
    if (hs.some((h) => !ISO_DATE_RE.test(h))) {
      fail('BAD_USER_INPUT', 'holidays must be YYYY-MM-DD dates');
    }
    next.holidays = [...new Set(hs)].sort((a, b) => a.localeCompare(b));
  }
  if (input.rules) next.rules = normalizeRulesInput(base.rules, input.rules);
  return next;
}

const toPub = (v: IVenue) => ({
  id: String(v._id),
  owner_user_id: String(v.owner_user_id),
  venue_name: v.venue_name ?? '',
  venue_type: v.venue_type ?? '',
  capacity: v.capacity ?? 0,
  description: v.description ?? '',
  amenities: v.amenities ?? [],
  cover_image_url: v.cover_image_url ?? '',
  gallery: v.gallery ?? [],
  location_id: v.location_id ? String(v.location_id) : null,
  country: v.country ?? 'India',
  country_code: v.country_code ?? 'IN',
  address_line1: v.address_line1 ?? '',
  address_line2: v.address_line2 ?? '',
  city: v.city ?? '',
  state: v.state ?? '',
  state_code: v.state_code ?? '',
  locality: v.locality ?? '',
  postal_code: v.postal_code ?? '',
  lat: v.lat ?? null,
  lng: v.lng ?? null,
  documents: (v.documents ?? []).map((d) => ({
    type: d.type,
    url: d.url,
    uploaded_at: d.uploaded_at?.toISOString?.() ?? '',
  })),
  gstin: v.gstin ?? '',
  pan: v.pan ?? '',
  bank_account: toBankAccountPub(v.bank_account),
  owner_name: v.owner_name ?? '',
  owner_email: v.owner_email ?? '',
  owner_phone: v.owner_phone ?? '',
  owner_dob: v.owner_dob ? v.owner_dob.toISOString() : null,
  owner_address: v.owner_address ?? '',
  tags: v.tags ?? [],
  venue_share_pct: v.venue_share_pct ?? 0,
  venue_commission_pct: v.venue_commission_pct ?? 0,
  settings: toSettingsPub(v.settings),
  step_completed: v.step_completed ?? 0,
  status: v.status,
  is_active: v.is_active ?? true,
  reviewer_notes: v.reviewer_notes ?? '',
  submitted_at: v.submitted_at ? v.submitted_at.toISOString() : null,
  approved_at: v.approved_at ? v.approved_at.toISOString() : null,
  rejected_at: v.rejected_at ? v.rejected_at.toISOString() : null,
  created_at: v.created_at?.toISOString?.() ?? '',
  updated_at: v.updated_at?.toISOString?.() ?? '',
});

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function findStep1Location(input: any) {
  if (input.location_id) return LocationModel.findById(input.location_id);

  const city = String(input.city ?? '').trim();
  if (!city) return null;

  const cityRegex = new RegExp(`^${escapeRegex(city)}$`, 'i');
  const query: any = { $or: [{ city: cityRegex }, { location_name: cityRegex }] };
  if (input.state) query.state = new RegExp(`^${escapeRegex(String(input.state).trim())}$`, 'i');
  if (input.country_code) query.country_code = input.country_code;
  return LocationModel.findOne(query);
}

async function getOrCreate(userId: string) {
  const uid = new Types.ObjectId(userId);
  // Only draft/rejected applications are editable. Approved/submitted venues must not be reused for a new registration.
  let v = await VenueModel.findOne({ owner_user_id: uid, status: { $in: ['DRAFT', 'REJECTED'] } })
    .sort({ updated_at: -1, created_at: -1 });
  if (!v) v = await VenueModel.create({ owner_user_id: uid });
  return v;
}

async function findCurrentUserVenue(userId: string) {
  const uid = new Types.ObjectId(userId);
  const activeApplication = await VenueModel.findOne({
    owner_user_id: uid,
    status: { $in: ['DRAFT', 'REJECTED', 'SUBMITTED'] },
  }).sort({ updated_at: -1, created_at: -1 });

  if (activeApplication) return activeApplication;
  return VenueModel.findOne({ owner_user_id: uid }).sort({ updated_at: -1, created_at: -1 });
}

async function normalizeStep1Location(input: any) {
  const next = { ...input };
  const location = await findStep1Location(next);
  if (!location) {
    throw new GraphQLError('Selected location was not found', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }

  const locality = String(next.locality ?? '').trim();
  const zones = location.location_zones ?? [];
  const zone = locality
    ? zones.find((item) => item.zone_name === locality || item.zone_code === locality)
    : null;

  if (zones.length > 0 && !locality) {
    throw new GraphQLError('Select a locality for this city', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }

  if (locality && !zone) {
    throw new GraphQLError('Selected locality is not available for this city', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }

  return {
    ...next,
    location_id: location._id,
    country: location.country ?? 'India',
    country_code: location.country_code ?? 'IN',
    state: location.state ?? '',
    state_code: location.state_code ?? '',
    city: location.city || location.location_name,
    locality: zone?.zone_name || locality || location.location_name || location.city,
    postal_code: zone?.pincode || location.location_pincode,
  };
}

async function assignApprovedVenueRole(userId: Types.ObjectId) {
  const { userService } = await import('@modules/access/user/user.service');
  const u: any = await UserModel.findById(userId).select('metadata.role_keys');
  const current = new Set<string>((u?.metadata?.role_keys ?? []) as string[]);
  current.add('USER');
  current.add('VENUE_OWNER');
  await userService.assignRoles(String(userId), Array.from(current));
}

export const venueService = {
  async getMine(userId: string) {
    const v = await findCurrentUserVenue(userId);
    return v ? toPub(v) : null;
  },
  async listMine(userId: string) {
    const uid = new Types.ObjectId(userId);
    const docs = await VenueModel.find({ owner_user_id: uid }).sort({ updated_at: -1, created_at: -1 }).limit(200);
    return docs.map(toPub);
  },
  async list(filter?: { status?: string }) {
    const q: any = {};
    if (filter?.status) q.status = filter.status;
    const docs = await VenueModel.find(q).sort({ created_at: -1 });
    return docs.map(toPub);
  },
  async getById(id: string) {
    const v = await VenueModel.findById(id);
    return v ? toPub(v) : null;
  },
  async submitStep1(userId: string, input: any) {
    const v = await getOrCreate(userId);
    Object.assign(v, await normalizeStep1Location(input));
    if (v.step_completed < 1) v.step_completed = 1;
    if (v.status === 'REJECTED') v.status = 'DRAFT';
    await v.save();
    return toPub(v);
  },
  async submitStep2(userId: string, input: any) {
    const v = await getOrCreate(userId);
    if (v.step_completed < 1) {
      throw new GraphQLError('Complete venue details first', { extensions: { code: 'BAD_REQUEST' } });
    }
    v.documents = (input.documents || [])
      .filter((d: any) => d && d.type && d.url)
      .map((d: any) => ({
        type: String(d.type).trim(),
        url: String(d.url).trim(),
        uploaded_at: new Date(),
      }));
    if (input.gstin !== undefined) v.gstin = input.gstin;
    if (input.pan !== undefined) v.pan = input.pan;
    if (v.step_completed < 2) v.step_completed = 2;
    await v.save();
    return toPub(v);
  },
  async submitStep3(userId: string, input: any) {
    const v = await getOrCreate(userId);
    if (v.step_completed < 2) {
      throw new GraphQLError('Complete documentation step first', { extensions: { code: 'BAD_REQUEST' } });
    }
    v.owner_name = input.owner_name;
    v.owner_email = input.owner_email;
    v.owner_phone = input.owner_phone;
    if (input.owner_dob) v.owner_dob = new Date(input.owner_dob);
    if (input.owner_address !== undefined) v.owner_address = input.owner_address;
    if (input.bank_account !== undefined) v.bank_account = normalizeBankAccountInput(input.bank_account) as any;
    if (v.step_completed < 3) v.step_completed = 3;
    await v.save();
    return toPub(v);
  },
  async submitFinal(userId: string) {
    const v = await getOrCreate(userId);
    if (v.step_completed < 3) {
      throw new GraphQLError('Complete all steps first', { extensions: { code: 'BAD_REQUEST' } });
    }
    v.step_completed = 4;
    v.status = 'SUBMITTED';
    v.submitted_at = new Date();
    await v.save();
    return toPub(v);
  },
  async approve(id: string, notes?: string, tags?: string[]) {
    const v = await VenueModel.findById(id);
    if (!v) throw new GraphQLError('Venue not found', { extensions: { code: 'NOT_FOUND' } });
    v.status = 'APPROVED';
    v.approved_at = new Date();
    v.reviewer_notes = notes ?? v.reviewer_notes;
    if (tags) v.tags = tags.map((tag) => tag.trim()).filter(Boolean);
    await v.save();
    await assignApprovedVenueRole(v.owner_user_id);
    return toPub(v);
  },
  async reject(id: string, notes: string) {
    const v = await VenueModel.findById(id);
    if (!v) throw new GraphQLError('Venue not found', { extensions: { code: 'NOT_FOUND' } });
    v.status = 'REJECTED';
    v.rejected_at = new Date();
    v.reviewer_notes = notes;
    await v.save();
    return toPub(v);
  },
  async adminCreate(opts: {
    ownerUserId: string;
    step1: any;
    step2: any;
    step3: any;
    submit?: boolean;
  }) {
    // Always insert a brand-new venue. An admin may register multiple
    // venues for the same owner (one user can run several cafes), so we
    // must not look up and overwrite a pre-existing venue document here.
    // Doing so silently replaced one of the owner's existing venues — that
    // was the bug that made "other cafes disappear" after create-on-behalf.
    if (!opts.ownerUserId || !Types.ObjectId.isValid(opts.ownerUserId)) {
      throw new GraphQLError('Valid owner_user_id is required', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }
    const normalized = await normalizeStep1Location(opts.step1);
    const documents = (opts.step2.documents || [])
      .filter((d: any) => d && d.type && d.url)
      .map((d: any) => ({
        type: String(d.type).trim(),
        url: String(d.url).trim(),
        uploaded_at: new Date(),
      }));
    const v = await VenueModel.create({
      owner_user_id: new Types.ObjectId(opts.ownerUserId),
      ...normalized,
      documents,
      gstin: opts.step2.gstin ?? '',
      pan: opts.step2.pan ?? '',
      bank_account: normalizeBankAccountInput(opts.step3.bank_account),
      owner_name: opts.step3.owner_name,
      owner_email: opts.step3.owner_email,
      owner_phone: opts.step3.owner_phone,
      owner_dob: opts.step3.owner_dob ? new Date(opts.step3.owner_dob) : null,
      owner_address: opts.step3.owner_address ?? '',
      tags: Array.isArray(opts.step1.tags) ? opts.step1.tags : [],
      step_completed: opts.submit ? 4 : 3,
      status: opts.submit ? 'SUBMITTED' : 'DRAFT',
      submitted_at: opts.submit ? new Date() : null,
    });
    return toPub(v);
  },
  async adminUpdate(id: string, opts: { step1: any; step2: any; step3: any; status?: string }) {
    const v = await VenueModel.findById(id);
    if (!v) throw new GraphQLError('Venue not found', { extensions: { code: 'NOT_FOUND' } });
    Object.assign(v, await normalizeStep1Location(opts.step1));
    v.documents = (opts.step2.documents || [])
      .filter((d: any) => d && d.type && d.url)
      .map((d: any) => ({ type: String(d.type).trim(), url: String(d.url).trim(), uploaded_at: new Date() }));
    if (opts.step2.gstin !== undefined) v.gstin = opts.step2.gstin;
    if (opts.step2.pan !== undefined) v.pan = opts.step2.pan;
    if (opts.step3.bank_account !== undefined) v.bank_account = normalizeBankAccountInput(opts.step3.bank_account) as any;
    v.owner_name = opts.step3.owner_name;
    v.owner_email = opts.step3.owner_email;
    v.owner_phone = opts.step3.owner_phone;
    v.owner_dob = opts.step3.owner_dob ? new Date(opts.step3.owner_dob) : null;
    if (opts.step3.owner_address !== undefined) v.owner_address = opts.step3.owner_address;
    if (opts.step1.tags !== undefined) v.tags = opts.step1.tags;
    v.step_completed = Math.max(v.step_completed ?? 0, 3);
    if (opts.status) {
      v.status = opts.status as any;
      if (opts.status === 'APPROVED' && !v.approved_at) v.approved_at = new Date();
      if (opts.status === 'SUBMITTED' && !v.submitted_at) v.submitted_at = new Date();
      if (opts.status !== 'REJECTED') v.rejected_at = null;
    }
    await v.save();
    if (opts.status === 'APPROVED') await assignApprovedVenueRole(v.owner_user_id);
    return toPub(v);
  },

  async setDeductions(venueId: string, sharePct: number, commissionPct: number) {
    const share = Number(sharePct);
    const commission = Number(commissionPct);
    const valid = (n: number) => Number.isFinite(n) && n >= 0 && n <= 100;
    if (!valid(share) || !valid(commission)) {
      throw new GraphQLError('Venue share and commission must be between 0 and 100', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }
    const v = await VenueModel.findByIdAndUpdate(
      venueId,
      { $set: { venue_share_pct: share, venue_commission_pct: commission } },
      { new: true }
    );
    if (!v) throw new GraphQLError('Venue not found', { extensions: { code: 'NOT_FOUND' } });
    return toPub(v);
  },

  /** Owner (or admin) updates operating hours / weekly-off / holidays / rules.
   * Drives the Recurring Availability generator + validation. */
  async updateSettings(userId: string, isAdmin: boolean, venueId: string, input: any) {
    if (!Types.ObjectId.isValid(venueId)) fail('BAD_USER_INPUT', 'Invalid venue id');
    const v = await VenueModel.findById(venueId);
    if (!v) fail('NOT_FOUND', 'Venue not found');
    if (!isAdmin && String(v!.owner_user_id) !== String(userId)) {
      fail('FORBIDDEN', 'Not your venue');
    }
    v!.settings = normalizeSettingsInput(v!.settings, input) as IVenueSettings;
    v!.markModified('settings');
    await v!.save();
    return toPub(v!);
  },

  async setActive(venueId: string, active: boolean) {
    const v = await VenueModel.findById(venueId);
    if (!v) throw new GraphQLError('Venue not found', { extensions: { code: 'NOT_FOUND' } });
    v.is_active = active;
    await v.save();

    if (v.owner_email) {
      const slug = active ? 'venue-activated' : 'venue-deactivated';
      try {
        await sendEmail({
          to: v.owner_email,
          subject: active ? 'Your venue is now active' : 'Your venue has been deactivated',
          template: slug,
          vars: {
            owner_name: v.owner_name ?? '',
            venue_name: v.venue_name ?? '',
            status: active ? 'active' : 'deactivated',
          },
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn(`[venue.setActive] email failed for ${slug}:`, (err as Error).message);
      }
    }

    return toPub(v);
  },

  async deleteVenue(venueId: string) {
    const r = await VenueModel.deleteOne({ _id: new Types.ObjectId(venueId) });
    return r.deletedCount > 0;
  },

  /** Un-approve a user's venues when their VENUE_OWNER role is revoked from Access. */
  async revokeApprovalForUser(userId: string) {
    const docs = await VenueModel.find({ owner_user_id: new Types.ObjectId(userId), status: 'APPROVED' });
    for (const v of docs) {
      v.status = 'REJECTED';
      v.rejected_at = new Date();
      v.reviewer_notes = 'Approval revoked — venue access was removed.';
      await v.save();
    }
    return true;
  },

  /** Draft a venue shell from an approved onboarding-meeting request so it shows
   * in the Onboarded Venues list (status DRAFT). Reuses the owner's open draft. */
  async createDraftFromApproval(prefill: { userId: string; name?: string; email?: string; phone?: string }) {
    const v = await getOrCreate(prefill.userId);
    if (prefill.name && !v.venue_name) v.venue_name = prefill.name;
    if (prefill.name && !v.owner_name) v.owner_name = prefill.name;
    if (prefill.email && !v.owner_email) v.owner_email = prefill.email;
    if (prefill.phone && !v.owner_phone) v.owner_phone = prefill.phone;
    v.status = 'DRAFT';
    await v.save();
    return toPub(v);
  },
};
