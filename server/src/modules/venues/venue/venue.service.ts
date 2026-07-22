import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { logs } from '@observability/log';
import {
  VenueModel,
  type IVenue,
  type IVenueAutoExtend,
  type IVenueRules,
  type IVenueSettings,
} from './venue.model';
import { LocationModel } from '@modules/platform/location/location.model';
import { UserModel } from '@modules/access/user/user.model';
import { CategoryModel } from '@modules/pods/category/category.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { VenueSlotModel } from '@modules/venues/venueSlot/venueSlot.model';
import { SlotTemplateModel } from '@modules/venues/slotTemplate/slotTemplate.model';
import { sendEmail } from '@services/email/email.service';
import { normalizeBankAccountInput, toBankAccountPub } from '@modules/finance/finance/bankAccount';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import {
  VENUE_AMENITIES,
  VENUE_CAPACITY_ITEM_LIMIT,
  VENUE_DOC_TYPES,
  VENUE_FACILITIES,
  VENUE_SECURITY,
  VENUE_TYPES,
} from './venue.constants';

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

const toAutoExtendPub = (a?: Partial<IVenueAutoExtend> | null) => ({
  enabled: a?.enabled ?? false,
  template_id: a?.template_id ? String(a.template_id) : null,
  horizon_days: a?.horizon_days ?? 30,
  until: a?.until ?? '',
});

const toSettingsPub = (s?: IVenueSettings | null) => ({
  operating_hours: {
    open: s?.operating_hours?.open ?? '09:00',
    close: s?.operating_hours?.close ?? '23:00',
  },
  weekly_off_days: [...(s?.weekly_off_days ?? [])].sort((a, b) => a - b),
  holidays: [...(s?.holidays ?? [])].sort((a, b) => a.localeCompare(b)),
  rules: toRulesPub(s?.rules),
  auto_extend: toAutoExtendPub(s?.auto_extend),
});

function normalizeRulesInput(base: ReturnType<typeof toRulesPub>, input: any) {
  const intField = (value: unknown, min: number, max: number, fallback: number) =>
    value === undefined ? fallback : clampInt(value, min, max, fallback);
  const boolField = (value: unknown, fallback: boolean) =>
    value === undefined ? fallback : Boolean(value);
  return {
    buffer_minutes: intField(input.buffer_minutes, 0, 1440, base.buffer_minutes),
    min_notice_minutes: intField(input.min_notice_minutes, 0, 525_600, base.min_notice_minutes),
    max_advance_days: intField(input.max_advance_days, 1, 60, base.max_advance_days),
    max_bookings_per_slot: intField(input.max_bookings_per_slot, 1, 100_000, base.max_bookings_per_slot),
    allow_instant_booking: boolField(input.allow_instant_booking, base.allow_instant_booking),
    allow_waitlist: boolField(input.allow_waitlist, base.allow_waitlist),
    booking_approval_required: boolField(input.booking_approval_required, base.booking_approval_required),
    allow_multiple_bookings: boolField(input.allow_multiple_bookings, base.allow_multiple_bookings),
  };
}

function normalizeAutoExtendInput(base: ReturnType<typeof toAutoExtendPub>, input: any) {
  const next = { ...base };
  if (input.enabled !== undefined) next.enabled = Boolean(input.enabled);
  if (input.horizon_days !== undefined) {
    next.horizon_days = clampInt(input.horizon_days, 1, 365, base.horizon_days);
  }
  if (input.template_id !== undefined) {
    const raw = input.template_id;
    if (raw === null || String(raw).trim() === '') next.template_id = null;
    else if (Types.ObjectId.isValid(String(raw))) next.template_id = String(raw);
    else fail('BAD_USER_INPUT', 'auto_extend.template_id must be a valid id');
  }
  if (input.until !== undefined) {
    const u = String(input.until).trim();
    if (u !== '' && !ISO_DATE_RE.test(u)) fail('BAD_USER_INPUT', 'auto_extend.until must be YYYY-MM-DD');
    next.until = u;
  }
  return next;
}

function normalizeOperatingHoursInput(input: any) {
  const open = String(input.open ?? '');
  const close = String(input.close ?? '');
  if (!HHMM_RE.test(open) || !HHMM_RE.test(close)) {
    fail('BAD_USER_INPUT', 'Operating hours must be HH:mm (24-hour)');
  }
  if (hhmmToMinutes(open) >= hhmmToMinutes(close)) {
    fail('BAD_USER_INPUT', 'Opening time must be before closing time');
  }
  return { open, close };
}

function normalizeWeeklyOffDaysInput(input: unknown) {
  const days = (input as unknown[]).map((d) => Math.trunc(Number(d)));
  if (days.some((d) => !Number.isFinite(d) || d < 0 || d > 6)) {
    fail('BAD_USER_INPUT', 'weekly_off_days must be integers 0..6 (Sun..Sat)');
  }
  return [...new Set(days)].sort((a, b) => a - b);
}

function normalizeHolidaysInput(input: unknown) {
  const hs = (input as unknown[]).map((h) => String(h).trim());
  if (hs.some((h) => !ISO_DATE_RE.test(h))) {
    fail('BAD_USER_INPUT', 'holidays must be YYYY-MM-DD dates');
  }
  return [...new Set(hs)].sort((a, b) => a.localeCompare(b));
}

function normalizeSettingsInput(current: IVenueSettings | undefined, input: any) {
  const base = toSettingsPub(current);
  const next = { ...base };
  if (input.operating_hours) {
    next.operating_hours = normalizeOperatingHoursInput(input.operating_hours);
  }
  if (input.weekly_off_days !== undefined) {
    next.weekly_off_days = normalizeWeeklyOffDaysInput(input.weekly_off_days);
  }
  if (input.holidays !== undefined) {
    next.holidays = normalizeHolidaysInput(input.holidays);
  }
  if (input.rules) next.rules = normalizeRulesInput(base.rules, input.rules);
  if (input.auto_extend) next.auto_extend = normalizeAutoExtendInput(base.auto_extend, input.auto_extend);
  // Auto-extend can never promise further ahead than slots may be scheduled.
  next.auto_extend = {
    ...next.auto_extend,
    horizon_days: Math.min(next.auto_extend.horizon_days, next.rules.max_advance_days),
  };
  return next;
}

const toVenueCategoryPub = (c?: IVenue['venue_category'] | null) => ({
  super_category_id: c?.super_category_id ? String(c.super_category_id) : null,
  category_id: c?.category_id ? String(c.category_id) : null,
  sub_category_id: c?.sub_category_id ? String(c.sub_category_id) : null,
  super_category_name: c?.super_category_name ?? '',
  category_name: c?.category_name ?? '',
  sub_category_name: c?.sub_category_name ?? '',
});

const toPub = (v: IVenue) => ({
  id: String(v._id),
  venue_no: v.venue_no ?? null,
  owner_user_id: String(v.owner_user_id),
  venue_name: v.venue_name ?? '',
  venue_type: v.venue_type ?? '',
  capacity: v.capacity ?? 0,
  capacity_items: (v.capacity_items ?? []).map((item) => ({
    label: item.label,
    capacity: item.capacity,
  })),
  venue_category: toVenueCategoryPub(v.venue_category),
  description: v.description ?? '',
  amenities: v.amenities ?? [],
  facilities: v.facilities ?? [],
  security: v.security ?? [],
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

/** Shared allowlists for the table engine (venuesTable / myVenuesTable —
 * DUNCIT TABLE CONTRACT v1). Only defaultSort differs per query. */
const VENUE_TABLE_FIELDS: Omit<TableEntityConfig, 'defaultSort'> = {
  searchFields: ['venue_no', 'venue_name', 'venue_type', 'city', 'locality', 'owner_name', 'owner_email'],
  sortFields: {
    venue_name: 'venue_name',
    venue_type: 'venue_type',
    city: 'city',
    locality: 'locality',
    capacity: 'capacity',
    owner_name: 'owner_name',
    status: 'status',
    is_active: 'is_active',
    venue_commission_pct: 'venue_commission_pct',
    submitted_at: 'submitted_at',
    created_at: 'created_at',
    updated_at: 'updated_at',
  },
  filterFields: {
    status: { type: 'enum' },
    is_active: { type: 'boolean' },
    venue_type: { type: 'string' },
    city: { type: 'string' },
    locality: { type: 'string' },
    location_id: { type: 'string' },
    capacity: { type: 'number' },
    submitted_at: { type: 'date' },
    created_at: { type: 'date' },
    updated_at: { type: 'date' },
  },
};

/** Admin/onboarding venues list defaults to newest-first (mirrors list()). */
const VENUE_TABLE_CONFIG: TableEntityConfig = {
  ...VENUE_TABLE_FIELDS,
  defaultSort: { created_at: -1 },
};

/** Owner "Your venue registrations" defaults to recently-updated (mirrors listMine()). */
const MY_VENUE_TABLE_CONFIG: TableEntityConfig = {
  ...VENUE_TABLE_FIELDS,
  defaultSort: { updated_at: -1 },
};

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);

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

/** Registration mutations may target a specific venue (edit from "Your venue
 * registrations"): it must belong to the caller and still be editable. Without
 * a venue_id we keep the historical "current open draft" behaviour. */
async function resolveEditableVenue(userId: string, venueId?: string | null) {
  if (!venueId) return getOrCreate(userId);
  if (!Types.ObjectId.isValid(venueId)) fail('BAD_USER_INPUT', 'Invalid venue id');
  const v = await VenueModel.findById(venueId);
  if (!v) fail('NOT_FOUND', 'Venue not found');
  if (String(v!.owner_user_id) !== String(userId)) fail('FORBIDDEN', 'Not your venue');
  if (v!.status !== 'DRAFT' && v!.status !== 'REJECTED') {
    fail('BAD_REQUEST', 'This venue application is no longer editable');
  }
  return v!;
}

/** Validates a Super → Category → Sub triple against the shared Category
 * collection (ids exist, levels match, parent chain lines up) and returns the
 * denormalized subdoc. */
async function normalizeVenueCategoryInput(input: any) {
  const ids = [input.super_category_id, input.category_id, input.sub_category_id].map(String);
  if (ids.some((id) => !Types.ObjectId.isValid(id))) {
    fail('BAD_USER_INPUT', 'Venue category selection is invalid');
  }
  const docs = await Promise.all(ids.map((id) => CategoryModel.findById(id)));
  const [superCat, category, subCat] = docs;
  if (superCat?.level !== 'SUPER') fail('BAD_USER_INPUT', 'Select a valid super category');
  if (category?.level !== 'CATEGORY' || String(category.parent_id) !== String(superCat!._id)) {
    fail('BAD_USER_INPUT', 'Select a valid category under the chosen super category');
  }
  if (subCat?.level !== 'SUB' || String(subCat.parent_id) !== String(category!._id)) {
    fail('BAD_USER_INPUT', 'Select a valid sub category under the chosen category');
  }
  return {
    super_category_id: superCat!._id,
    category_id: category!._id,
    sub_category_id: subCat!._id,
    super_category_name: superCat!.name,
    category_name: category!.name,
    sub_category_name: subCat!.name,
  };
}

/** Cleans the dynamic capacity list: labels required, capacities whole
 * numbers ≥ 1. Returns null when the input did not include the field. */
function normalizeCapacityItems(items: unknown) {
  if (items === undefined || items === null) return null;
  const list = (items as any[])
    .map((item) => ({
      label: String(item?.label ?? '').trim(),
      capacity: Math.trunc(Number(item?.capacity)),
    }))
    .filter((item) => item.label || Number.isFinite(item.capacity));
  if (list.length > VENUE_CAPACITY_ITEM_LIMIT) {
    fail('BAD_USER_INPUT', `At most ${VENUE_CAPACITY_ITEM_LIMIT} capacity entries are allowed`);
  }
  for (const item of list) {
    if (!item.label) fail('BAD_USER_INPUT', 'Every capacity entry needs a label');
    if (item.label.length > 80) fail('BAD_USER_INPUT', 'Capacity labels must be 80 characters or fewer');
    if (!Number.isFinite(item.capacity) || item.capacity < 1 || item.capacity > 100_000) {
      fail('BAD_USER_INPUT', `Enter a capacity between 1 and 100000 for "${item.label}"`);
    }
  }
  return list;
}

/** Normalizes a full step-1 payload (location + capacity list + category) into
 * a patch shared by owner submit and admin create/update. */
async function buildStep1Patch(input: any) {
  const patch: any = await normalizeStep1Location(input);
  const capacityItems = normalizeCapacityItems(input.capacity_items);
  if (capacityItems === null) {
    delete patch.capacity_items;
  } else {
    patch.capacity_items = capacityItems;
    // The scalar stays the source of truth for existing consumers — keep it
    // in lock-step with the itemised list whenever one is supplied.
    if (capacityItems.length > 0) {
      patch.capacity = capacityItems.reduce((sum, item) => sum + item.capacity, 0);
    }
  }
  if (input.venue_category === undefined || input.venue_category === null) {
    delete patch.venue_category;
  } else {
    patch.venue_category = await normalizeVenueCategoryInput(input.venue_category);
  }
  return patch;
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

/** Strip a single role from a user (used on hard-delete when they have no
 * remaining entity of that kind). No-op if the user is gone or never held it. */
async function removeUserRole(userId: Types.ObjectId, role: string) {
  const u: any = await UserModel.findById(userId).select('metadata.role_keys');
  const roles = (u?.metadata?.role_keys ?? []) as string[];
  if (!u || !roles.includes(role)) return;
  const { userService } = await import('@modules/access/user/user.service');
  await userService.assignRoles(String(userId), roles.filter((r) => r !== role));
}

/** Mongo query for the venues that auto-match a club, or null when the club has
 * no location (nothing can match yet). A venue matches when it is APPROVED +
 * active, sits in the club's location, and — when the club has them — shares the
 * club's Super category and Sub category (the club's `category_id` holds the
 * sub level, mirrored against the venue's `venue_category.sub_category_id`). */
function buildClubMatchQuery(criteria: {
  location_id?: string | null;
  locality?: string | null;
  super_category_id?: string | null;
  category_id?: string | null;
}): Record<string, unknown> | null {
  const { location_id, locality, super_category_id, category_id } = criteria;
  if (!location_id || !Types.ObjectId.isValid(location_id)) return null;
  const q: Record<string, unknown> = {
    status: 'APPROVED',
    is_active: true,
    location_id: new Types.ObjectId(location_id),
  };
  // Match by LOCALITY when the club has one — a club scoped to a locality only
  // links venues in that same locality (not the whole city). Legacy clubs with
  // no locality fall back to city-level matching.
  const trimmedLocality = (locality ?? '').trim();
  if (trimmedLocality) q.locality = trimmedLocality;
  if (super_category_id && Types.ObjectId.isValid(super_category_id)) {
    q['venue_category.super_category_id'] = new Types.ObjectId(super_category_id);
  }
  if (category_id && Types.ObjectId.isValid(category_id)) {
    q['venue_category.sub_category_id'] = new Types.ObjectId(category_id);
  }
  return q;
}

/** Applies the whitelisted owner-editable fields of an APPROVED venue in place.
 * Documents are append-only: existing entries are never replaced or removed. */
function applyApprovedVenueInput(v: any, input: any) {
  if (input.description !== undefined) v.description = String(input.description ?? '').slice(0, 2000);
  if (input.cover_image_url !== undefined) v.cover_image_url = String(input.cover_image_url ?? '');
  if (input.gallery !== undefined) {
    v.gallery = (input.gallery as unknown[]).map(String).filter(Boolean);
  }
  const capacityItems = normalizeCapacityItems(input.capacity_items);
  if (capacityItems !== null) {
    if (capacityItems.length === 0) fail('BAD_USER_INPUT', 'Keep at least one capacity entry');
    v.capacity_items = capacityItems as any;
    v.capacity = capacityItems.reduce((sum, item) => sum + item.capacity, 0);
  }
  if (input.add_documents !== undefined) {
    const added = (input.add_documents as any[])
      .filter((d) => d?.type && d?.url)
      .map((d) => ({ type: String(d.type).trim(), url: String(d.url).trim(), uploaded_at: new Date() }));
    v.documents = [...(v.documents ?? []), ...added] as any;
  }
  if (input.owner_name !== undefined) v.owner_name = String(input.owner_name ?? '').trim();
  if (input.owner_phone !== undefined) v.owner_phone = String(input.owner_phone ?? '').trim();
  if (input.owner_dob !== undefined) v.owner_dob = input.owner_dob ? new Date(input.owner_dob) : null;
  if (input.owner_address !== undefined) v.owner_address = String(input.owner_address ?? '');
}

/** Applies an admin status transition and its timestamp side-effects. */
function applyAdminStatus(v: any, status: string) {
  v.status = status as any;
  if (status === 'APPROVED' && !v.approved_at) v.approved_at = new Date();
  if (status === 'SUBMITTED' && !v.submitted_at) v.submitted_at = new Date();
  if (status !== 'REJECTED') v.rejected_at = null;
}

export const venueService = {
  registrationConfig() {
    return {
      venue_types: VENUE_TYPES,
      doc_types: VENUE_DOC_TYPES,
      capacity_item_limit: VENUE_CAPACITY_ITEM_LIMIT,
      amenities: VENUE_AMENITIES,
      facilities: VENUE_FACILITIES,
      security: VENUE_SECURITY,
    };
  },
  async getMine(userId: string, venueId?: string | null) {
    if (venueId) {
      if (!Types.ObjectId.isValid(venueId)) fail('BAD_USER_INPUT', 'Invalid venue id');
      const v = await VenueModel.findById(venueId);
      if (!v || String(v.owner_user_id) !== String(userId)) return null;
      return toPub(v);
    }
    const v = await findCurrentUserVenue(userId);
    return v ? toPub(v) : null;
  },
  async listMine(userId: string) {
    const uid = new Types.ObjectId(userId);
    const docs = await VenueModel.find({ owner_user_id: uid }).sort({ updated_at: -1, created_at: -1 }).limit(200);
    return docs.map(toPub);
  },
  async list(filter?: { status?: string; activeOnly?: boolean }) {
    const q: any = {};
    if (filter?.status) q.status = filter.status;
    // Customer-facing surfaces (publicVenues, developer API) pass activeOnly so
    // deactivated venues disappear; admin/onboarding lists keep showing them.
    if (filter?.activeOnly) q.is_active = { $ne: false };
    const docs = await VenueModel.find(q).sort({ created_at: -1 });
    return docs.map(toPub);
  },
  /** Consumer Venues page: APPROVED + active venues, optionally scoped to the
   * user's selected location, with server-side text search (the client
   * debounces) and a Super→Cat→Sub category filter. */
  async publicList(criteria?: {
    location_id?: string | null;
    search?: string | null;
    super_category_id?: string | null;
    category_id?: string | null;
    sub_category_id?: string | null;
  }) {
    const q: any = { status: 'APPROVED', is_active: { $ne: false } };
    if (criteria?.location_id && Types.ObjectId.isValid(criteria.location_id)) {
      q.location_id = new Types.ObjectId(criteria.location_id);
    }
    const levels = [
      ['venue_category.super_category_id', criteria?.super_category_id],
      ['venue_category.category_id', criteria?.category_id],
      ['venue_category.sub_category_id', criteria?.sub_category_id],
    ] as const;
    for (const [path, id] of levels) {
      if (id && Types.ObjectId.isValid(id)) q[path] = new Types.ObjectId(id);
    }
    const search = (criteria?.search ?? '').trim();
    if (search) {
      const rx = new RegExp(escapeRegex(search), 'i');
      q.$or = [{ venue_name: rx }, { venue_type: rx }, { city: rx }, { locality: rx }];
    }
    const docs = await VenueModel.find(q).sort({ created_at: -1 }).limit(200);
    return docs.map(toPub);
  },
  /** Public single-venue detail — only an APPROVED, active venue is visible.
   * (The admin getById would leak drafts/rejected venues.) */
  async getPublicById(venueId: string) {
    if (!Types.ObjectId.isValid(venueId)) return null;
    const v = await VenueModel.findById(venueId);
    if (!v) return null;
    if (v.status !== 'APPROVED' || v.is_active === false) return null;
    return toPub(v);
  },
  /** Server-side table page (search/filter/sort/paginate) for the admin/
   * onboarding venuesTable query — same rows as list(). */
  async table(input?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery<IVenue>(
      VenueModel,
      {},
      input,
      VENUE_TABLE_CONFIG
    );
    return { rows: docs.map(toPub), total, page, page_size };
  },
  /** Owner-scoped table page for myVenuesTable. The baseFilter pins
   * owner_user_id ($and-merged by runTableQuery), so client-supplied filters
   * can never widen the scope to another owner's venues. */
  async tableMine(userId: string, input?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery<IVenue>(
      VenueModel,
      { owner_user_id: new Types.ObjectId(userId) },
      input,
      MY_VENUE_TABLE_CONFIG
    );
    return { rows: docs.map(toPub), total, page, page_size };
  },
  /** APPROVED, active venues that match a club: same location, and the club's
   * Super + Sub category (when set). This is the single source of truth for the
   * club↔venue link — admin count, Club.matched_venues, and pod enforcement all
   * go through here. Returns [] when the club has no location yet. */
  async findMatchingForClub(criteria: {
    location_id?: string | null;
    locality?: string | null;
    super_category_id?: string | null;
    category_id?: string | null;
  }) {
    const q = buildClubMatchQuery(criteria);
    if (!q) return [];
    const docs = await VenueModel.find(q).sort({ venue_name: 1 });
    return docs.map(toPub);
  },
  async countMatchingForClub(criteria: {
    location_id?: string | null;
    locality?: string | null;
    super_category_id?: string | null;
    category_id?: string | null;
  }) {
    const q = buildClubMatchQuery(criteria);
    if (!q) return 0;
    return VenueModel.countDocuments(q);
  },
  async getById(id: string) {
    const v = await VenueModel.findById(id);
    return v ? toPub(v) : null;
  },
  async submitStep1(userId: string, input: any, venueId?: string | null) {
    const v = await resolveEditableVenue(userId, venueId);
    Object.assign(v, await buildStep1Patch(input));
    if (v.step_completed < 1) v.step_completed = 1;
    if (v.status === 'REJECTED') v.status = 'DRAFT';
    await v.save();
    return toPub(v);
  },
  async submitStep2(userId: string, input: any, venueId?: string | null) {
    const v = await resolveEditableVenue(userId, venueId);
    if (v.step_completed < 1) {
      throw new GraphQLError('Complete venue details first', { extensions: { code: 'BAD_REQUEST' } });
    }
    v.documents = (input.documents || [])
      .filter((d: any) => d?.type && d?.url)
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
  async submitStep3(userId: string, input: any, venueId?: string | null) {
    const v = await resolveEditableVenue(userId, venueId);
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
  async submitFinal(userId: string, venueId?: string | null) {
    const v = await resolveEditableVenue(userId, venueId);
    if (v.step_completed < 3) {
      throw new GraphQLError('Complete all steps first', { extensions: { code: 'BAD_REQUEST' } });
    }
    v.step_completed = 4;
    v.status = 'SUBMITTED';
    v.submitted_at = new Date();
    await v.save();
    return toPub(v);
  },
  /** Owner edit of an APPROVED venue — only the whitelisted fields change.
   * Documents are append-only: existing entries are never replaced or removed. */
  async updateApproved(userId: string, venueId: string, input: any) {
    if (!Types.ObjectId.isValid(venueId)) fail('BAD_USER_INPUT', 'Invalid venue id');
    const v = await VenueModel.findById(venueId);
    if (!v) return fail('NOT_FOUND', 'Venue not found');
    if (String(v.owner_user_id) !== String(userId)) fail('FORBIDDEN', 'Not your venue');
    if (v.status !== 'APPROVED') {
      fail('BAD_REQUEST', 'Only approved venues can be edited here');
    }
    applyApprovedVenueInput(v, input);
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
    const normalized = await buildStep1Patch(opts.step1);
    const documents = (opts.step2.documents || [])
      .filter((d: any) => d?.type && d?.url)
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
    Object.assign(v, await buildStep1Patch(opts.step1));
    v.documents = (opts.step2.documents || [])
      .filter((d: any) => d?.type && d?.url)
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
    if (opts.status) applyAdminStatus(v, opts.status);
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
    if (!v) return fail('NOT_FOUND', 'Venue not found');
    if (!isAdmin && String(v.owner_user_id) !== String(userId)) {
      fail('FORBIDDEN', 'Not your venue');
    }
    // `set(path, value)` bridges the pub-shaped normalized settings back onto the
    // Mongoose subdoc (it casts string ids → ObjectId on save) without a type
    // assertion — the plain `v.settings = … as IVenueSettings` tripped Sonar S4325.
    v.set('settings', normalizeSettingsInput(v.settings, input));
    v.markModified('settings');
    await v.save();
    // Don't make the owner wait for the daily sweep: top up straight away when
    // auto-extend is on. Best-effort — the scheduled job is the fallback.
    if (v.settings.auto_extend?.enabled) {
      const venueDocId = String(v._id);
      import('@modules/venues/autoExtend/autoExtend.service')
        .then(({ autoExtendService }) => autoExtendService.runForVenue(venueDocId))
        .catch(() => undefined);
    }
    return toPub(v);
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
        logs.server.warn('venue', 'setActive', {
          error: err,
          slug,
          venue_id: String(v._id),
          msg: 'venue status-change email failed',
        });
      }
    }

    return toPub(v);
  },

  /** Developer hard-delete: permanently removes a venue and its owned slot data
   * everywhere. BLOCKS when the venue still has live dependents (non-deleted
   * pods or booked/pending slots) so no active booking is ever orphaned. */
  async deleteVenue(venueId: string) {
    if (!Types.ObjectId.isValid(venueId)) fail('BAD_USER_INPUT', 'Invalid venue id');
    const venueOid = new Types.ObjectId(venueId);
    const venue = await VenueModel.findById(venueOid);
    if (!venue) fail('NOT_FOUND', 'Venue not found');

    const podCount = await PodModel.countDocuments({ venue_id: venueOid, deleted_at: null });
    const bookedSlots = await VenueSlotModel.countDocuments({
      venue_id: venueOid,
      $or: [{ status: { $in: ['BOOKED', 'PENDING'] } }, { booked_by_api_key_id: { $ne: null } }],
    });
    if (podCount > 0 || bookedSlots > 0) {
      const parts: string[] = [];
      if (podCount > 0) parts.push(`${podCount} pod(s)`);
      if (bookedSlots > 0) parts.push(`${bookedSlots} booked slot(s)`);
      fail(
        'BAD_REQUEST',
        `This venue still has ${parts.join(' and ')} attached. Remove or reassign them before deleting.`
      );
    }

    // No live dependents — remove the venue and its owned (unbooked) slot data.
    await VenueSlotModel.deleteMany({ venue_id: venueOid });
    await SlotTemplateModel.deleteMany({ venue_id: venueOid });
    await VenueModel.deleteOne({ _id: venueOid });

    // Drop the owner's VENUE_OWNER role only when this was their last venue.
    const remaining = await VenueModel.countDocuments({ owner_user_id: venue!.owner_user_id });
    if (remaining === 0) await removeUserRole(venue!.owner_user_id, 'VENUE_OWNER');
    return true;
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
  async createDraftFromApproval(prefill: {
    userId: string;
    name?: string;
    email?: string;
    phone?: string;
    category?: { super_category_id: string; category_id: string; sub_category_id: string } | null;
  }) {
    const v = await getOrCreate(prefill.userId);
    if (prefill.name && !v.venue_name) v.venue_name = prefill.name;
    if (prefill.name && !v.owner_name) v.owner_name = prefill.name;
    if (prefill.email && !v.owner_email) v.owner_email = prefill.email;
    if (prefill.phone && !v.owner_phone) v.owner_phone = prefill.phone;
    // Seed the category the applicant chose in the onboarding gate so the portal's
    // Edit Venue dialog prefills it. Never clobber a category an admin already set,
    // and never let a partial/invalid meeting category block the draft.
    if (prefill.category && !v.venue_category?.super_category_id) {
      try {
        v.venue_category = await normalizeVenueCategoryInput(prefill.category);
      } catch {
        // Meeting had no valid Super→Cat→Sub triple — leave the category empty.
      }
    }
    v.status = 'DRAFT';
    await v.save();
    return toPub(v);
  },
};
