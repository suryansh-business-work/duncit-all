import { randomInt } from 'node:crypto';
import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { podSeatsAvailable, podSeatsTaken } from './pod.seats';
import { podLifecycleFilter, type PodLifecycle } from './pod.lifecycle';
import { podRowStatusFilter, type PodRowStatus } from './pod.rowStatus';
import { PodModel, type PodMode, type PodType } from './pod.model';
import { UserModel } from '@modules/access/user/user.model';
import { UserRoleModel } from '@modules/access/user/relations';
import { ClubModel } from '@modules/clubs/club/club.model';
import { CategoryModel } from '@modules/pods/category/category.model';
import { HostModel } from '@modules/venues/host/host.model';
import { InventoryProductModel } from '@modules/venues/inventory/inventory.model';
import { LocationModel } from '@modules/platform/location/location.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { venueService } from '@modules/venues/venue/venue.service';
import { VenueSlotModel } from '@modules/venues/venueSlot/venueSlot.model';
import { venueSlotService } from '@modules/venues/venueSlot/venueSlot.service';
import { PaymentModel } from '@modules/finance/payment/payment.model';
import { getFinanceSettings } from '@modules/finance/finance/finance.model';
import { breakdownService, bucketForPod } from '@modules/finance/finance/breakdown.service';
import { settingsService } from '@modules/platform/settings/settings.service';
import { whatsappService } from '@modules/platform/whatsapp/whatsapp.service';
import { accountHealthService } from '@modules/access/accountHealth/accountHealth.service';
import {
  sendPodRefundEmail,
  sendPodUpdatedEmail,
  sendVenueSlotRequestEmail,
} from '@services/email/email.service';
import { getUrlConfigs } from '@config/url-configs';
import { moderationService } from '@modules/moderation/moderation.service';
import { assertInvitable } from './coHost.service';
import {
  escapedSearchRegex,
  runTableQuery,
  type TableEntityConfig,
  type TableQueryInput,
} from '@utils/table-query';
import { LEGACY_POD_TYPE_MAP } from './pod-type.migration';
import { podAuditService, snapshotPod } from '@modules/pods/podAudit/podAudit.service';
import type { PodAuditSource } from '@modules/pods/podAudit/podAudit.model';
import { notifySocialActivity } from '@modules/engagement/notification/social-notify';
import { logs } from '@observability/log';
import { notifyEach, notifyEvent } from '@services/notify/notify.service';

/**
 * Ceiling on the unpaginated `pods` read.
 *
 * `pods` has no page argument — the discovery surfaces take the whole set and
 * filter it client-side — so without a ceiling the query grew with the
 * collection forever. The number is far above any city's live pod count and
 * exists to bound the worst case, not to page: hitting it is logged as a
 * warning precisely because it means the feed has outgrown this shape.
 * Env-tunable so a spike can be absorbed without a deploy.
 */
const POD_LIST_MAX = Number(process.env.POD_LIST_MAX_ROWS) || 1000;

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

async function loadClubSlugMap(podDocs: any[]): Promise<Map<string, string>> {
  const ids = Array.from(
    new Set(podDocs.map((p) => p?.club_id && String(p.club_id)).filter(Boolean))
  );
  if (ids.length === 0) return new Map();
  const clubs = await ClubModel.find({ _id: { $in: ids } }, { club_id: 1 });
  return new Map(clubs.map((c: any) => [String(c._id), c.club_id]));
}

/** The host who owns a pod — the repo-wide convention is the first entry. */
const podOwnerId = (d: any): string => String((d?.pod_hosts_id ?? [])[0] ?? '');

/**
 * Where a pod notification should land. Both surfaces route a pod by
 * club-slug + pod-slug, so a pod whose club could not be resolved gets no link
 * rather than a broken `/club//pod/x`.
 */
export function podNotificationLink(d: any, clubSlugById: Map<string, string>): string | null {
  const clubSlug = d?.club_id ? clubSlugById.get(String(d.club_id)) : null;
  if (!clubSlug || !d?.pod_id) return null;
  return `/club/${clubSlug}/pod/${d.pod_id}`;
}

const toPub = (d: any, clubSlugById?: Map<string, string>) => {
  if (!d) return null;
  const clubId = d.club_id ? String(d.club_id) : null;
  const clubSlug = clubId ? clubSlugById?.get(clubId) ?? '' : '';
  return {
    id: String(d._id),
    pod_id: d.pod_id,
    pod_title: d.pod_title,
    pod_hosts_id: (d.pod_hosts_id ?? []).map(String),
    co_hosts: (d.co_hosts ?? []).map((c: any) => ({
      user_id: String(c.user_id),
      status: c.status ?? 'PENDING',
      invited_at: c.invited_at?.toISOString?.() ?? '',
      responded_at: c.responded_at?.toISOString?.() ?? null,
    })),
    location_id: d.location_id ? String(d.location_id) : null,
    venue_id: d.venue_id ? String(d.venue_id) : null,
    venue_slot_id: d.venue_slot_id ? String(d.venue_slot_id) : null,
    club_id: clubId,
    club_slug: clubSlug,
    zone_name: d.zone_name ?? null,
    pod_mode: d.pod_mode ?? 'PHYSICAL',
    meeting_platform: d.pod_mode === 'VIRTUAL' ? d.meeting_platform ?? null : null,
    meeting_url: d.pod_mode === 'VIRTUAL' ? d.meeting_url ?? null : null,
    meeting_notes: d.pod_mode === 'VIRTUAL' ? d.meeting_notes ?? null : null,
    pod_hashtag: d.pod_hashtag ?? [],
    pod_images_and_videos: (d.pod_images_and_videos ?? []).map((m: any) => ({
      url: m.url,
      type: m.type ?? 'IMAGE',
    })),
    reel_url: d.reel_url ?? null,
    pod_hits: d.pod_hits ?? 0,
    pod_attendees: (d.pod_attendees ?? []).map(String),
    seats_taken: podSeatsTaken(d),
    seats_available: podSeatsAvailable(d),
    pod_description: d.pod_description ?? '',
    pod_date_time: d.pod_date_time?.toISOString?.() ?? null,
    pod_end_date_time: d.pod_end_date_time?.toISOString?.() ?? null,
    pod_type: d.pod_type,
    pod_amount: d.pod_amount ?? 0,
    pod_occurrence: d.pod_occurrence ?? 'ONE_TIME',
    no_of_spots: d.no_of_spots ?? 0,
    pod_info: d.pod_info ?? '',
    what_this_pod_offers: d.what_this_pod_offers ?? [],
    available_perks: d.available_perks ?? [],
    payment_terms: d.payment_terms ?? null,
    place_charges: (d.place_charges ?? []).map((c: any) => ({
      label: c.label,
      amount: c.amount ?? 0,
      note: c.note ?? null,
    })),
    products_enabled: !!d.products_enabled,
    product_requests: (d.product_requests ?? []).map((item: any) => ({
      product_id: String(item.product_id),
      product_name: item.product_name,
      image_url: item.image_url ?? '',
      images: Array.isArray(item.images) ? item.images : [],
      unit_cost: item.unit_cost ?? 0,
      quantity: item.quantity ?? 0,
      // Units still buyable from this pod — sales decrement it (sold_count).
      available_count: Math.max(0, (item.quantity ?? 0) - (item.sold_count ?? 0)),
      total_cost: item.total_cost ?? 0,
    })),
    product_cost_total: d.product_cost_total ?? 0,
    is_active: !!d.is_active,
    is_deleted: !!d.deleted_at,
    deleted_at: d.deleted_at?.toISOString?.() ?? null,
    venue_approval_status: d.venue_approval_status ?? 'NONE',
    auto_pod_id: d.source_auto_pod_id ? String(d.source_auto_pod_id) : null,
    liked_user_ids: (d.liked_user_ids ?? []).map(String),
    like_count: (d.liked_user_ids ?? []).length,
    comment_count: (d.comments ?? []).length,
    completed_at: d.completed_at?.toISOString?.() ?? null,
    created_at: d.created_at?.toISOString?.() ?? '',
    updated_at: d.updated_at?.toISOString?.() ?? '',
  };
};

/** Shared helpers so co-located features (e.g. search) can return pods in the
 * same public shape the `Pod` field resolvers expect. */
export const mapPodToPublic = (doc: any, clubSlugById?: Map<string, string>) =>
  toPub(doc, clubSlugById);
export const loadPodClubSlugMap = (podDocs: any[]) => loadClubSlugMap(podDocs);

/** Shared allowlists for the table engine (podsTable / myHostPodsTable —
 * DUNCIT TABLE CONTRACT v1). Only defaultSort could differ; both lists sort by
 * pod_date_time desc today (mirrors list() / listMyHostPods()). */
const POD_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['pod_title', 'pod_id'],
  sortFields: {
    pod_title: 'pod_title',
    pod_date_time: 'pod_date_time',
    pod_amount: 'pod_amount',
    pod_hits: 'pod_hits',
    no_of_spots: 'no_of_spots',
    is_active: 'is_active',
    completed_at: 'completed_at',
    created_at: 'created_at',
    updated_at: 'updated_at',
    club_id: 'club_id',
    pod_mode: 'pod_mode',
    pod_type: 'pod_type',
    venue_approval_status: 'venue_approval_status',
  },
  filterFields: {
    club_id: { type: 'string' },
    venue_id: { type: 'string' },
    location_id: { type: 'string' },
    zone_name: { type: 'string' },
    host_user_id: { path: 'pod_hosts_id', type: 'string' },
    pod_mode: { type: 'enum' },
    pod_type: { type: 'enum' },
    pod_occurrence: { type: 'enum' },
    venue_approval_status: { type: 'enum' },
    is_active: { type: 'boolean' },
    products_enabled: { type: 'boolean' },
    pod_amount: { type: 'number' },
    pod_date_time: { type: 'date' },
    completed_at: { type: 'date' },
    created_at: { type: 'date' },
  },
  defaultSort: { pod_date_time: -1 },
};

/** Table filter values are string-typed, and released app binaries in the
 * field may still send the legacy pod_type values — coerce them to FREE/PAID
 * at the boundary so their filters keep matching instead of returning nothing. */
function coerceLegacyPodTypeFilters(input?: TableQueryInput | null): TableQueryInput | null | undefined {
  if (!input?.filters?.length) return input;
  const filters = input.filters.map((f) => {
    if (f.field !== 'pod_type') return f;
    return {
      ...f,
      value: f.value == null ? f.value : LEGACY_POD_TYPE_MAP[f.value] ?? f.value,
      values: f.values == null ? f.values : f.values.map((v) => LEGACY_POD_TYPE_MAP[v] ?? v),
    };
  });
  return { ...input, filters };
}

const MEET_ALPHABET = 'abcdefghijklmnopqrstuvwxyz';

/** `length` lowercase letters from a CSPRNG (used for placeholder meeting codes). */
function randomAlpha(length: number): string {
  let out = '';
  for (let i = 0; i < length; i += 1) out += MEET_ALPHABET[randomInt(MEET_ALPHABET.length)];
  return out;
}

function notFound(): never {
  throw new GraphQLError('Pod not found', { extensions: { code: 'NOT_FOUND' } });
}

const WRITABLE_POD_TYPES = new Set<PodType>(['FREE', 'PAID']);

/** Creation and price-changing edits accept only FREE or PAID, and FREE is
 * virtual-only — a physical pod must be PAID. */
function assertWritablePodType(type: PodType, mode: PodMode) {
  if (!WRITABLE_POD_TYPES.has(type)) {
    throw new GraphQLError('pod_type must be FREE or PAID', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
  if (mode === 'PHYSICAL' && type === 'FREE') {
    throw new GraphQLError('Physical pods must be paid — free pods are only available for virtual pods', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
}

function validateAmount(type: PodType, amount: number) {
  if (amount < 0 || amount > 1999) {
    throw new GraphQLError('pod_amount must be between 0 and 1999', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
  if (type === 'FREE' && amount !== 0) {
    throw new GraphQLError('Free pods must have amount 0', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
}

function validateFutureDates(startValue?: string | Date | null, endValue?: string | Date | null) {
  const now = Date.now();
  const start = startValue ? new Date(startValue) : null;
  const end = endValue ? new Date(endValue) : null;
  if (!start || Number.isNaN(start.getTime()) || start.getTime() <= now) {
    throw new GraphQLError('Start date/time must be after current date/time', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
  if (end && (Number.isNaN(end.getTime()) || end.getTime() <= now || end.getTime() < start.getTime())) {
    throw new GraphQLError('End date/time must be after current date/time and start date/time', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
}

function normalizeStatusMedia(media: any) {
  const url = String(media?.url ?? '').trim();
  if (!/^https?:\/\//i.test(url)) {
    throw new GraphQLError('Status media must be uploaded before saving', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
  const type = media?.type === 'VIDEO' ? 'VIDEO' : 'IMAGE';
  return { url, type };
}

function normalizePodMode(mode?: string | null): PodMode {
  return mode === 'VIRTUAL' ? 'VIRTUAL' : 'PHYSICAL';
}

/**
 * Reel videos are uploaded (direct-to-ImageKit) before the pod is saved, so the
 * only acceptable value is a hosted https URL. Empty/null clears the reel.
 */
function normalizeReelUrl(value?: string | null): string | null {
  const url = String(value ?? '').trim();
  if (!url) return null;
  if (!/^https?:\/\//i.test(url)) {
    throw new GraphQLError('Reel video must be uploaded before saving', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
  return url;
}

function validateMeetingDetails(mode: PodMode, input: any, current?: any) {
  if (mode !== 'VIRTUAL') return;
  const meetingUrl = input.meeting_url === undefined ? current?.meeting_url : input.meeting_url;
  const trimmed = typeof meetingUrl === 'string' ? meetingUrl.trim() : '';
  if (!trimmed) {
    throw new GraphQLError('Meeting link is required for virtual pods', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error('bad protocol');
  } catch {
    throw new GraphQLError('Meeting link must be a valid http(s) URL', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
}

/** Every pod must carry at least one IMAGE in its media gallery. */
export function validateHasImage(media: any[] | null | undefined) {
  const hasImage = (media ?? []).some((m: any) => (m?.type ?? 'IMAGE') === 'IMAGE' && m?.url);
  if (!hasImage) {
    throw new GraphQLError('At least one pod image is required', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
}

/**
 * The moderatable content of a pod write. An absent field reads as empty text,
 * which never violates anything.
 */
export function podContentOf(input: any) {
  const text = (value: unknown) => (typeof value === 'string' ? value : '');
  const media = Array.isArray(input?.pod_images_and_videos) ? input.pod_images_and_videos : [];
  return {
    pod_title: text(input?.pod_title),
    pod_description: text(input?.pod_description),
    pod_info: text(input?.pod_info),
    pod_hashtag: Array.isArray(input?.pod_hashtag) ? input.pod_hashtag.map(String) : [],
    image_urls: media.map((item: any) => String(item?.url ?? '')).filter(Boolean),
  };
}

type PodContent = ReturnType<typeof podContentOf>;

/** Which pod field a moderation violation belongs to, in audit-trail terms. */
const VIOLATION_AUDIT_FIELD: Record<string, keyof PodContent | 'pod_images_and_videos'> = {
  pod_title: 'pod_title',
  pod_description: 'pod_description',
  pod_info: 'pod_info',
  pod_hashtag: 'pod_hashtag',
  image: 'pod_images_and_videos',
};

/** The refused values, in the same shape `snapshotPod` stores them, so the
 * monitoring console diffs a blocked attempt exactly like a saved edit. */
const attemptedValues = (content: PodContent): Record<string, string> => ({
  pod_title: content.pod_title,
  pod_description: content.pod_description,
  pod_info: content.pod_info,
  pod_hashtag: content.pod_hashtag.join(', '),
  pod_images_and_videos: content.image_urls.join(', '),
});

const sameList = (a: string[], b: string[]) =>
  a.length === b.length && a.every((item, index) => item === b[index]);

/**
 * The content fields this write actually CHANGES.
 *
 * An edit is judged on what it introduces, not on what it inherits. The portal
 * editor posts the whole form on every save, so screening the payload as-is
 * would let a description written before these rules existed block an
 * unrelated price correction forever. Touch that description and it must come
 * out clean; leave it alone and it is not this edit's business.
 */
function changedContent(doc: any, next: PodContent): PodContent {
  const current = podContentOf(doc);
  return {
    pod_title: next.pod_title === current.pod_title ? '' : next.pod_title,
    pod_description: next.pod_description === current.pod_description ? '' : next.pod_description,
    pod_info: next.pod_info === current.pod_info ? '' : next.pod_info,
    pod_hashtag: sameList(next.pod_hashtag, current.pod_hashtag) ? [] : next.pod_hashtag,
    image_urls: sameList(next.image_urls, current.image_urls) ? [] : next.image_urls,
  };
}

/**
 * Content guard for an edit of an EXISTING pod — host, Club Admin and Admin
 * alike. A refusal is not silently dropped: it lands in the AI-monitored audit
 * trail as a REJECTED entry carrying what was attempted and why it was
 * refused, so both monitoring consoles show the attempt and not only the edits
 * that got through.
 */
async function assertEditContentClean(
  doc: any,
  attempt: PodContent,
  audit: { actorUserId?: string | null; source: PodAuditSource }
) {
  const content = changedContent(doc, attempt);
  const violations = moderationService.podViolations(content);
  if (violations.length === 0) return;

  const before = snapshotPod(doc);
  const attempted = attemptedValues(content);
  const fields = [...new Set(violations.map((v) => VIOLATION_AUDIT_FIELD[v.field]).filter(Boolean))];
  await podAuditService.record({
    pod: doc,
    action: 'REJECTED',
    source: audit.source,
    actorUserId: audit.actorUserId,
    changes: fields.map((field) => ({
      field: String(field),
      from: before[String(field)] ?? '',
      to: attempted[String(field)] ?? '',
    })),
    note: violations
      .map((v) => {
        const evidence = v.evidence ? ` ("${v.evidence}")` : '';
        return `${v.field}: ${v.message}${evidence}`;
      })
      .join(' · '),
  });
  throw moderationService.podRejection(violations);
}

/** Subjects offered in the host's delete-pod reason dropdown (kept in sync with the apps). */
export const POD_DELETE_REASON_SUBJECTS = [
  'Event cancelled',
  'Venue unavailable',
  'Low attendance',
  'Rescheduling',
  'Other',
] as const;

const POD_DELETE_REASON_SET = new Set<string>(POD_DELETE_REASON_SUBJECTS);

function buildDeleteReason(subject: string, note?: string | null): string {
  const cleanSubject = (subject ?? '').trim();
  const cleanNote = (note ?? '').trim();
  if (!POD_DELETE_REASON_SET.has(cleanSubject)) {
    throw new GraphQLError('Select a valid delete reason', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
  if (cleanSubject === 'Other' && !cleanNote) {
    throw new GraphQLError('Please describe the reason', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
  return cleanNote ? `${cleanSubject} — ${cleanNote}` : cleanSubject;
}

/**
 * The one host-capability gate. Host powers follow the HOST role — granted by
 * the admin role toggle AND automatically on host-application approval — with
 * an approved host profile accepted as a fallback so legacy approved hosts
 * (without the cached role) keep working. A deactivated host is refused even
 * while still holding the cached role; role-only hosts (no Host doc) are
 * unaffected.
 *
 * Exported so a host claiming an Auto Pod is authorised by exactly the same
 * rule as a host creating one — two gates would drift on who counts as active.
 */
export async function assertActiveHost(userId: string) {
  const userObjectId = new Types.ObjectId(userId);
  const hostDoc = await HostModel.findOne({ user_id: userObjectId }).select('status is_active');
  if (hostDoc?.is_active === false) {
    throw new GraphQLError('Your host account has been deactivated', {
      extensions: { code: 'FORBIDDEN' },
    });
  }
  const hasHostRole = await UserRoleModel.exists({ user_id: userObjectId, role: 'HOST' });
  const approvedHost = !hasHostRole && hostDoc?.status === 'APPROVED';
  if (!hasHostRole && !approvedHost) {
    throw new GraphQLError('Host access is required before creating pods', {
      extensions: { code: 'FORBIDDEN' },
    });
  }
}

/** Loads a pod and asserts the viewer is one of its hosts. */
/** Exported so sibling modules (ticket check-in) authorise a host action against
 * exactly the same rule as hostUpdatePod / hostDeletePod — one gate, one truth. */
export async function findHostedPod(id: string, userId: string) {
  if (!Types.ObjectId.isValid(id)) {
    throw new GraphQLError('Invalid pod id', { extensions: { code: 'BAD_USER_INPUT' } });
  }
  const doc = await PodModel.findById(id);
  if (!doc) notFound();
  const isHost = (doc!.pod_hosts_id ?? []).some((hostId: any) => String(hostId) === userId);
  if (!isHost) {
    throw new GraphQLError('Only the pod host can manage this pod', {
      extensions: { code: 'FORBIDDEN' },
    });
  }
  return doc!;
}

const podWhenLabel = (doc: any) =>
  doc.pod_date_time
    ? new Date(doc.pod_date_time).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
    : '—';

// WhatsApp templates print the date and the time as two separate placeholders,
// so the combined label above cannot serve them.
const podDateLabel = (doc: any) =>
  doc.pod_date_time ? new Date(doc.pod_date_time).toLocaleString('en-IN', { dateStyle: 'medium' }) : '';
const podTimeLabel = (doc: any) =>
  doc.pod_date_time ? new Date(doc.pod_date_time).toLocaleString('en-IN', { timeStyle: 'short' }) : '';

/** Attendee users (excluding the acting host) with an email on file. */
async function podAudience(doc: any, excludeUserId: string) {
  const ids = (doc.pod_attendees ?? [])
    .map(String)
    .filter((id: string) => id !== excludeUserId);
  if (ids.length === 0) return [];
  // The phone fields are selected because this audience now also feeds WhatsApp,
  // and `destinationFor` reads them off the document — without them it returns
  // '' for every attendee and the whole fan-out silently skips.
  const users = await UserModel.find({ _id: { $in: ids } })
    .select('profile.first_name profile.last_name auth.email auth.phone communication.whatsapp')
    .lean();
  return users
    .map((u: any) => ({
      user_id: String(u._id),
      email: u.auth?.email ?? '',
      name: `${u.profile?.first_name ?? ''} ${u.profile?.last_name ?? ''}`.trim() || 'there',
      /** The raw document, for `destinationFor`. */
      user: u,
    }));
  // Attendees with no address are NOT filtered out. This audience is only ever
  // used to email, and dropping them here meant a cancelled pod left no trace
  // that someone was never told. The send records a FAILED row naming the
  // template instead, which is the answer to "why didn't they hear from us?".
}

/** Who cancelled a pod — doubles as the refund metadata tag and the audit source. */
type PodCancelInitiator = 'HOST' | 'VENUE_OWNER' | 'ADMIN' | 'CLUB_ADMIN';

/** Duncit's own side of a cancellation. A type guard rather than a comparison at
 * the call site so `remove` can hand the source straight to the shared path. */
const isDuncitCancel = (source: PodAuditSource): source is 'ADMIN' | 'CLUB_ADMIN' =>
  source === 'ADMIN' || source === 'CLUB_ADMIN';

/** The admin and club-admin deletes carry no reason field, and both the refund
 * metadata and the cancellation email print one. */
const DUNCIT_CANCEL_REASON = 'Cancelled by Duncit';

/** The WhatsApp scenario each cancel path fires. Duncit and a club admin share
 * one template — the attendee is told the platform cancelled it either way. */
const WA_CANCEL_EVENT: Record<PodCancelInitiator, string> = {
  HOST: 'USER_POD_CANCELLED_BY_HOST',
  VENUE_OWNER: 'USER_POD_CANCELLED_BY_VENUE',
  ADMIN: 'USER_POD_CANCELLED_BY_DUNCIT',
  CLUB_ADMIN: 'USER_POD_CANCELLED_BY_DUNCIT',
};

/** The service method a cancellation's failures are filed under. */
const CANCEL_LOG_COMPONENT: Record<PodCancelInitiator, string> = {
  HOST: 'hostRemove',
  VENUE_OWNER: 'venueCancelPod',
  ADMIN: 'remove',
  CLUB_ADMIN: 'remove',
};

/**
 * Soft-deletes a pod exactly once. The `deleted_at` flip is a CONDITIONAL write,
 * so when two cancels race only one caller gets `true` back — the loser must not
 * fan out a second round of cancellation emails or dock the venue's health
 * twice. Returns false when the pod was already cancelled.
 */
async function softDeletePod(
  id: string,
  audit?: { actorUserId?: string | null; source: PodAuditSource; note?: string | null }
): Promise<boolean> {
  const doc = await PodModel.findById(id).setOptions({ includeDeleted: true });
  if (!doc) notFound();
  if (doc!.deleted_at) return false;
  // Release the venue slot + reserved inventory, then claim the delete. The
  // filter carries deleted_at itself, so the soft-delete hook leaves it alone
  // and the write only lands while the pod is still live.
  await applyProductDeltas(doc!.product_requests ?? [], []);
  await venueSlotService.releaseForPod(String(doc!._id));
  const claimed = await PodModel.findOneAndUpdate(
    { _id: doc!._id, deleted_at: null },
    { $set: { deleted_at: new Date(), is_active: false } },
    { new: true }
  ).setOptions({ includeDeleted: true });
  if (!claimed) return false;
  await podAuditService.record({
    pod: claimed,
    action: 'DELETE',
    source: audit?.source ?? 'SYSTEM',
    actorUserId: audit?.actorUserId,
    note: audit?.note,
  });
  return true;
}

/**
 * The money-and-mail half of a pod cancellation, shared by the host delete and
 * the venue-owner cancel flows: refund every SUCCESS payment, snapshot the
 * audience, commit the soft delete, then best-effort email a cancellation note
 * to each attendee and a refund note to each payer. Returns the refunded count,
 * or null when a concurrent cancel had already committed the delete — the
 * caller must then skip every follow-up effect rather than double-apply it.
 */
async function refundAndNotifyCancellation(
  doc: any,
  actorUserId: string,
  reason: string,
  initiatedBy: PodCancelInitiator
): Promise<number | null> {
  const podTitle = doc.pod_title;
  const logComponent = CANCEL_LOG_COMPONENT[initiatedBy];

  const payments = await PaymentModel.find({ pod_id: doc._id, status: 'SUCCESS' });
  // Keyed by payer and SUMMED: one person can hold several payments for a pod
  // (a second seat, a re-try), every one of them is flipped to REFUNDED here,
  // and keeping only the last document quoted them a fraction of their refund.
  const refundedByUser = new Map<string, { total: number; currency_symbol: string }>();
  for (const payment of payments) {
    payment.status = 'REFUNDED';
    (payment as any).metadata = {
      ...(payment as any).metadata,
      refund_reason: reason,
      refunded_at: new Date().toISOString(),
      refund_initiated_by: initiatedBy,
      refund_initiator_id: actorUserId,
    };
    payment.markModified('metadata');
    await payment.save();
    const payerId = String(payment.user_id);
    const soFar = refundedByUser.get(payerId);
    refundedByUser.set(payerId, {
      total: (soFar?.total ?? 0) + (payment.total ?? 0),
      currency_symbol: payment.currency_symbol,
    });
  }

  const audience = await podAudience(doc, actorUserId);
  const won = await softDeletePod(String(doc._id), {
    actorUserId,
    source: initiatedBy,
    note: reason,
  });
  // Another cancel committed first: it already emailed this audience, so
  // sending again would double-notify every attendee and payer.
  if (!won) return null;

  // Best-effort after the delete commits: the payers' refund records.
  //
  // The CANCELLATION email is not here any more. It used to be one generic
  // `pod-cancelled` to everybody; `notifyPodCancellation` below now sends
  // `user-pod-cancelled-by-host` / `-venue` / `-duncit` instead — the same
  // audience, but naming who cancelled, the refund and how long it takes, off
  // the array the WhatsApp message was already built from. Sending both would
  // put two cancellation emails in front of every attendee.
  try {
    await Promise.allSettled(
      payments.map((payment) =>
        sendPodRefundEmail({
          to: payment.user_email,
          name: payment.user_name,
          pod_title: podTitle,
          amount: `${payment.currency_symbol}${payment.total}`,
          reason,
        })
      )
    );
  } catch (err) {
    logs.server.error('pod', logComponent, {
      error: err,
      msg: 'delete emails failed',
    });
  }

  await whatsappPodCancellation(doc, initiatedBy, audience, refundedByUser);

  return payments.length;
}

/** The refund as an email prints it: with its currency, or as a dash. */
const refundLabel = (refund?: { total: number; currency_symbol: string }): string =>
  refund && refund.total > 0 ? `${refund.currency_symbol}${refund.total}` : '—';

/**
 * The same cancellation over WhatsApp, one attendee at a time — AiSensy
 * rate-limits, so a 40-attendee pod fanned out in parallel is 40 concurrent
 * POSTs. The send never throws; every outcome lands in the WhatsApp log.
 *
 * The template quotes a refund and how long it takes, so the working-days
 * promise comes from Finance Settings rather than a constant here.
 */
async function whatsappPodCancellation(
  doc: any,
  initiatedBy: PodCancelInitiator,
  audience: Awaited<ReturnType<typeof podAudience>>,
  refundedByUser: Map<string, { total: number; currency_symbol: string }>
) {
  const [{ mwebUrl }, financeSettings, clubSlugById] = await Promise.all([
    getUrlConfigs(),
    getFinanceSettings(),
    loadClubSlugMap([doc]),
  ]);
  const path = podNotificationLink(doc, clubSlugById);
  const podLink = path ? `${mwebUrl.replace(/\/+$/, '')}${path}` : '';
  // `notifyEach`, not `sendEach`: the same fan-out now also sends
  // `user-pod-cancelled-by-host` / `-venue` / `-duncit`, filled from this very
  // array. `podAudience` already carries each attendee's address.
  await notifyEach(
    audience.map((attendee) => ({
      event: WA_CANCEL_EVENT[initiatedBy],
      email: attendee.email,
      entityId: String(doc._id),
      user: attendee.user,
      name: attendee.name,
      params: [
        attendee.name,
        doc.pod_title,
        doc.pod_title,
        podDateLabel(doc),
        podTimeLabel(doc),
        // An attendee who paid nothing is still owed the news; the template
        // prints the rupee sign itself, so the figure carries no symbol.
        String(refundedByUser.get(attendee.user_id)?.total ?? 0),
        podLink,
        String(financeSettings.refund_processing_days),
      ],
      // The EMAIL renders the figure on its own, with no symbol printed around
      // it, so it needs one — and "nothing to refund" reads better than "0".
      vars: { refund_amount: refundLabel(refundedByUser.get(attendee.user_id)) },
    }))
  );
}

/** Tell the host their own cancellation went through, with what it cost the
 * people who had booked. Fires beside the attendee fan-out, not inside it — the
 * host is excluded from that audience. */
async function whatsappHostCancellationRequested(doc: any, hostUserId: string) {
  const host: any = await UserModel.findById(hostUserId)
    // `auth.email` alongside the phone fields: the notify funnel reads the
    // address off this document, and a narrower projection would send the
    // WhatsApp message and skip the email without saying so.
    .select('profile.first_name profile.last_name auth.email auth.phone communication.whatsapp')
    .lean();
  const venue: any = doc.venue_id
    ? await VenueModel.findById(doc.venue_id).select('venue_name').lean()
    : null;
  const hostName = `${host?.profile?.first_name ?? ''} ${host?.profile?.last_name ?? ''}`.trim() || 'there';
  await notifyEvent({
    event: 'HOST_POD_CANCELLATION_REQUESTED',
    entityId: String(doc._id),
    user: host,
    name: hostName,
    params: [
      hostName,
      doc.pod_title,
      doc.pod_title,
      podDateLabel(doc),
      podTimeLabel(doc),
      venue?.venue_name ?? '',
      String(podSeatsTaken(doc)),
    ],
  });
}

/**
 * Loads the venue the caller owns for this pod. The pod must actually sit at an
 * APPROVED venue booking, and that venue must belong to the caller.
 */
async function assertOwnedVenue(doc: any, userId: string) {
  const venue =
    doc.venue_id && doc.venue_approval_status === 'APPROVED'
      ? await VenueModel.findOne({
          _id: doc.venue_id,
          owner_user_id: new Types.ObjectId(userId),
        }).select('_id')
      : null;
  if (!venue) {
    throw new GraphQLError('This pod is not booked at a venue you own', {
      extensions: { code: 'FORBIDDEN' },
    });
  }
}

/** Best-effort in-app note to the venue owner: a host requested one of their
 * slots and it's waiting in the partner portal's Slot Requests inbox. */
async function notifyVenueSlotRequested(pod: any, slot: any) {
  try {
    const { notificationService } = await import(
      '@modules/engagement/notification/notification.service'
    );
    const when = new Date(slot.start_at).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
    await notificationService.create({
      title: 'New slot booking request',
      body: `"${pod.pod_title}" requested your venue slot on ${when}. Review it in the Partners portal.`,
      scope: 'USER',
      target_user_ids: [String(slot.owner_user_id)],
      silent: false,
    });
  } catch (err) {
    logs.server.error('pod', 'notifyVenueSlotRequested', {
      error: err,
      msg: 'slot request notification failed',
    });
  }
}

/** Best-effort email to the venue owner mirroring the in-app slot-request note,
 * so the venue is alerted off-platform too and can approve/decline it in the
 * Partners portal. Recipient is the venue's contact email (owner account email
 * as a fallback). */
async function emailVenueSlotRequested(pod: any, slot: any) {
  try {
    const venue = await VenueModel.findById(slot.venue_id).select(
      'venue_name owner_email owner_name owner_user_id'
    );
    if (!venue) return;
    // The phone fields ride along because the same owner is messaged on
    // WhatsApp below, and `destinationFor` reads them off this document.
    const owner = await UserModel.findById(venue.owner_user_id)
      .select('profile.first_name profile.last_name auth.email auth.phone communication.whatsapp')
      .lean();
    // No early return on a missing address: the send logs it as FAILED, and a
    // venue nobody can reach about a slot request is worth seeing in the log.
    const to = (venue.owner_email || (owner as any)?.auth?.email || '').trim();
    const ownerName =
      (venue.owner_name ?? '').trim() ||
      `${(owner as any)?.profile?.first_name ?? ''} ${(owner as any)?.profile?.last_name ?? ''}`.trim() ||
      'there';
    const host = await UserModel.findById((pod.pod_hosts_id ?? [])[0])
      .select('profile.first_name profile.last_name')
      .lean();
    const hostName =
      `${(host as any)?.profile?.first_name ?? ''} ${(host as any)?.profile?.last_name ?? ''}`.trim() ||
      'A host';
    const when = new Date(slot.start_at).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
    const { partnersUrl } = await getUrlConfigs();
    // The two CTAs open the same decision page with the intent pre-selected.
    // The page is auth-gated, so a mail scanner following the link cannot
    // decide anything — and the venue owner lands back on it after logging in.
    const decisionUrl = `${partnersUrl.replace(/\/+$/, '')}/venues/requests/${String(slot._id)}`;
    const reviewUrl = `${partnersUrl.replace(/\/+$/, '')}/venues/requests`;
    await sendVenueSlotRequestEmail({
      to,
      owner_name: ownerName,
      venue_name: venue.venue_name || 'your venue',
      pod_title: pod.pod_title,
      host_name: hostName,
      when,
      review_url: reviewUrl,
      approve_url: `${decisionUrl}?action=approve`,
      decline_url: `${decisionUrl}?action=decline`,
    });
    await whatsappService.send({
      event: 'VENUE_SLOT_REQUESTED',
      entityId: String(slot._id),
      user: owner,
      name: ownerName,
      params: [
        ownerName,
        pod.pod_title,
        new Date(slot.start_at).toLocaleString('en-IN', { dateStyle: 'medium' }),
        new Date(slot.start_at).toLocaleString('en-IN', { timeStyle: 'short' }),
        hostName,
        reviewUrl,
      ],
    });
  } catch (err) {
    logs.server.error('pod', 'emailVenueSlotRequested', {
      error: err,
      msg: 'slot request email failed',
    });
  }
}

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);

const requestMap = (items: any[] = []) => {
  const map = new Map<string, number>();
  for (const item of items) {
    const productId = String(item.product_id);
    map.set(productId, (map.get(productId) ?? 0) + (Number(item.quantity) || 0));
  }
  return map;
};

// Slot bookings go to any venue partner's availability calendar, so the
// club↔venue match only constrains the manual (no-slot) path. Venues now
// auto-match a club by location + category (single source of truth in
// venueService); a club with no location yet imposes no constraint.
async function assertVenueAllowedForClub(input: any, venue: any) {
  const club = !input.venue_slot_id && input.club_id ? await ClubModel.findById(input.club_id) : null;
  if (!club?.location_id) return;
  const matched = await venueService.findMatchingForClub({
    location_id: String(club.location_id),
    locality: club.locality ?? null,
    super_category_id: club.super_category_id ? String(club.super_category_id) : null,
    category_id: club.category_id ? String(club.category_id) : null,
  });
  if (!matched.some((v: { id: string }) => String(v.id) === String(venue._id))) {
    throw new GraphQLError('Selected venue is not available for this club', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
}

async function resolveVenueLocation(input: any) {
  const venueId = input.venue_id || null;
  let locationId = input.location_id || null;
  if (!venueId) {
    if (!locationId) {
      throw new GraphQLError('Select a venue', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    return { venue_id: null, location_id: locationId, zone_name: input.zone_name ?? null };
  }

  const venue = await VenueModel.findById(venueId);
  if (!venue) throw new GraphQLError('Venue not found', { extensions: { code: 'NOT_FOUND' } });
  await assertVenueAllowedForClub(input, venue);
  if (!locationId && (venue as any).location_id) {
    locationId = String((venue as any).location_id);
  }
  if (!locationId && venue.city) {
    const city = new RegExp(`^${escapeRegex(venue.city)}$`, 'i');
    const location = await LocationModel.findOne({ $or: [{ city }, { location_name: city }] });
    locationId = location ? String(location._id) : null;
  }
  return { venue_id: venueId, location_id: locationId, zone_name: null };
}

/** The `$or` branches that match a venue against one location (optionally
 * narrowed to a single zone: its locality or pincode). */
function locationVenueOr(location: any, zone?: string): any[] {
  const city = location.city || location.location_name;
  const locationFields: any = {};
  if (city) locationFields.city = new RegExp(`^${escapeRegex(city)}$`, 'i');
  if (location.state) locationFields.state = new RegExp(`^${escapeRegex(location.state)}$`, 'i');
  if (location.country_code) locationFields.country_code = location.country_code;
  const hasLocationFields = Object.keys(locationFields).length > 0;

  if (zone) {
    const matchingZone = (location.location_zones ?? []).find((item: any) => item.zone_name === zone);
    const locality = new RegExp(`^${escapeRegex(zone)}$`, 'i');
    const zoned: any[] = [{ location_id: location._id, locality }];
    if (matchingZone?.pincode) zoned.push({ location_id: location._id, postal_code: matchingZone.pincode });
    if (hasLocationFields) {
      zoned.push({ ...locationFields, locality });
      if (matchingZone?.pincode) zoned.push({ ...locationFields, postal_code: matchingZone.pincode });
    }
    return zoned;
  }

  const all: any[] = [{ location_id: location._id }];
  if (hasLocationFields) all.push(locationFields);
  return all;
}

async function venueIdsForLocationFilter(locationId?: string, zoneName?: string) {
  const or: any[] = [];
  const zone = zoneName?.trim();
  if (locationId) {
    const location = await LocationModel.findById(locationId).lean();
    if (!location) return [];
    or.push(...locationVenueOr(location, zone));
  } else if (zone) {
    or.push({ locality: new RegExp(`^${escapeRegex(zone)}$`, 'i') });
  }

  if (or.length === 0) return [];
  const venues = await VenueModel.find({ $or: or }).select('_id').lean();
  return venues.map((venue) => venue._id);
}

async function buildPodPlaceFilter(filter?: { location_id?: string; zone_name?: string }) {
  const locationId = filter?.location_id;
  const zoneName = filter?.zone_name?.trim();
  if (!locationId && !zoneName) return null;

  const or: any[] = [{ pod_mode: 'VIRTUAL' }];
  if (locationId && zoneName) or.push({ location_id: locationId, zone_name: zoneName });
  else if (locationId) or.push({ location_id: locationId });
  else if (zoneName) or.push({ zone_name: zoneName });

  const venueIds = await venueIdsForLocationFilter(locationId, zoneName);
  if (venueIds.length > 0) or.push({ venue_id: { $in: venueIds } });
  return or.length > 0 ? { $or: or } : null;
}

function buildPodDateRange(range?: { from?: string | null; to?: string | null }) {
  const dateRange: any = {};
  if (range?.from) {
    const from = new Date(range.from);
    if (Number.isNaN(from.getTime())) throw new GraphQLError('Invalid from date', { extensions: { code: 'BAD_USER_INPUT' } });
    dateRange.$gte = from;
  }
  if (range?.to) {
    const to = new Date(range.to);
    if (Number.isNaN(to.getTime())) throw new GraphQLError('Invalid to date', { extensions: { code: 'BAD_USER_INPUT' } });
    dateRange.$lte = to;
  }
  return Object.keys(dateRange).length > 0 ? dateRange : null;
}

type ClubCategory = {
  super_category_id: string | null;
  // A club stores its Sub-category in `category_id` (2-level Super + Sub model;
  // the middle Category level is not persisted on a club).
  sub_category_id: string | null;
};

/** The pod's category is its club's Super + Sub. Null when the club has no full
 * pair yet (legacy clubs) — which imposes no product constraint. */
async function resolveClubCategory(
  clubId: Types.ObjectId | string | null | undefined
): Promise<ClubCategory | null> {
  if (!clubId || !Types.ObjectId.isValid(String(clubId))) return null;
  const club = await ClubModel.findById(String(clubId))
    .select('super_category_id category_id')
    .lean();
  if (!club) return null;
  return {
    super_category_id: club.super_category_id ? String(club.super_category_id) : null,
    sub_category_id: club.category_id ? String(club.category_id) : null,
  };
}

/**
 * The pod's sub-category can set the fewest people the activity needs — a
 * doubles game needs 4, so a 2-spot pod under it is not a real game. Enforced
 * here, not just in the host's slider, so no client can size a pod below it.
 * `min_pax` 0 (the default for every existing sub-category) imposes nothing.
 */
async function assertMeetsMinPax(clubCategory: ClubCategory | null, noOfSpots: number) {
  const subCategoryId = clubCategory?.sub_category_id;
  if (!subCategoryId) return;
  const sub = await CategoryModel.findById(subCategoryId).select('min_pax').lean();
  const minPax = sub?.min_pax ?? 0;
  if (minPax > 0 && noOfSpots < minPax) {
    throw new GraphQLError(
      `This activity needs at least ${minPax} people — increase the number of spots`,
      { extensions: { code: 'BAD_USER_INPUT' } }
    );
  }
}

/** A product may attach to a pod only when one of its category rows (or its flat
 * legacy fields) matches the pod's club at the Super + Sub level.
 *
 * FAILS CLOSED. A pod whose club carries no category pair has nothing to match
 * against, so it accepts NO products. This used to return true, which meant any
 * caller pointing at a category-less club — or at a club_id that does not
 * resolve at all — could attach a product from any category through the API.
 * Mirrors `productMatchesClub` in @duncit/utils, which hides the same set in the
 * picker so the client never offers what this rejects. */
function productMatchesClubCategory(product: any, clubCategory: ClubCategory | null): boolean {
  if (!clubCategory?.super_category_id || !clubCategory?.sub_category_id) {
    return false;
  }
  const target = `${clubCategory.super_category_id}|${clubCategory.sub_category_id}`;
  const rows = Array.isArray(product.categories) && product.categories.length > 0
    ? product.categories
    : [{ super_category_id: product.super_category_id, sub_category_id: product.sub_category_id }];
  return rows.some(
    (row: any) =>
      row.super_category_id &&
      row.sub_category_id &&
      `${String(row.super_category_id)}|${String(row.sub_category_id)}` === target
  );
}

async function buildProductRequests(
  enabled: boolean,
  rawItems: any[] = [],
  clubCategory: ClubCategory | null = null,
  previousItems: any[] = []
) {
  if (!enabled) return [];
  // Sales already made against this pod survive an edit — carry sold_count over.
  const soldByProduct = new Map<string, number>(
    (previousItems ?? []).map((row: any) => [String(row.product_id), Number(row.sold_count ?? 0)])
  );
  const compact = Array.from(requestMap(rawItems).entries())
    .map(([productId, quantity]) => ({ productId, quantity }))
    .filter((item) => item.quantity > 0);
  // Nothing can be matched against a pod that has no category, so say THAT
  // rather than blaming each product for not belonging to a category the pod
  // never had. Reached when the club carries no Super+Sub pair, or when the
  // club_id does not resolve to a club at all.
  if (compact.length > 0 && (!clubCategory?.super_category_id || !clubCategory?.sub_category_id)) {
    throw new GraphQLError("This pod's club has no category, so no products can be attached to it", {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
  const next = [];
  for (const item of compact) {
    const product = await InventoryProductModel.findById(item.productId);
    if (!product?.is_active) {
      throw new GraphQLError('Selected product is not available', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    if (!productMatchesClubCategory(product, clubCategory)) {
      throw new GraphQLError(`${product.product_name} does not belong to this pod's category`, {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }
    next.push({
      product_id: product._id,
      product_name: product.product_name,
      image_url: product.image_url ?? '',
      images: Array.isArray(product.images) ? product.images : [],
      unit_cost: product.unit_cost,
      quantity: item.quantity,
      sold_count: soldByProduct.get(String(product._id)) ?? 0,
      total_cost: product.unit_cost * item.quantity,
    });
  }
  return next;
}

async function applyProductDeltas(oldItems: any[], nextItems: any[]) {
  const oldMap = requestMap(oldItems);
  const nextMap = requestMap(nextItems);
  const productIds = Array.from(new Set([...oldMap.keys(), ...nextMap.keys()]));
  for (const productId of productIds) {
    const delta = (nextMap.get(productId) ?? 0) - (oldMap.get(productId) ?? 0);
    if (!delta) continue;
    const product = await InventoryProductModel.findById(productId);
    if (!product) throw new GraphQLError('Product not found', { extensions: { code: 'NOT_FOUND' } });
    if (delta > 0 && product.inventory_count - product.requested_count < delta) {
      throw new GraphQLError(`Not enough inventory for ${product.product_name}`, {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }
    product.requested_count = Math.max(0, product.requested_count + delta);
    await product.save();
  }
}

/** Slot bookings may target ANY approved venue partner (the venue approves the
 * request before the pod goes live); the manual no-slot path is still restricted
 * to the host's own approved venues. */
async function assertPartnerVenue(input: any, userObjectId: Types.ObjectId) {
  const venueMatch = input.venue_slot_id
    ? { _id: input.venue_id, status: 'APPROVED', is_active: true }
    : { _id: input.venue_id, owner_user_id: userObjectId, status: 'APPROVED', is_active: true };
  const venue = input.venue_id
    ? await VenueModel.findOne(venueMatch).select('_id')
    : null;
  if (!venue) {
    throw new GraphQLError(
      input.venue_slot_id ? 'Select an approved venue' : 'Select one of your approved venues',
      { extensions: { code: 'BAD_USER_INPUT' } }
    );
  }
}

/** The new pod's slug: an explicit `pod_id` wins over the title, and it must be
 * unique inside its club. */
async function resolvePodSlugForCreate(input: any): Promise<string> {
  if (!input.club_id) {
    throw new GraphQLError('club_id is required', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
  const baseSlug = input.pod_id?.trim()
    ? slugify(input.pod_id.trim())
    : slugify(input.pod_title ?? '');
  if (!baseSlug) {
    throw new GraphQLError('Pod title is required', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
  const dupe = await PodModel.findOne({ club_id: input.club_id, pod_id: baseSlug });
  if (dupe) {
    throw new GraphQLError(
      'A pod with this title already exists in this club. Choose a different title.',
      { extensions: { code: 'CONFLICT' } }
    );
  }
  return baseSlug;
}

/** A picked slot is the source of truth for the pod's window — overwrite
 * the incoming date/time so a stale or hand-edited form value can't break
 * the booking contract. The slot itself is booked atomically *after* the
 * pod row is created (see `bookOrHoldSlotForPod`) so we never orphan a slot. */
async function resolveSlotForCreate(
  input: any,
  podMode: PodMode,
  autoPodId?: string | null
): Promise<{ slotDoc: any; needsVenueApproval: boolean }> {
  if (!(podMode === 'PHYSICAL' && input.venue_slot_id)) {
    return { slotDoc: null, needsVenueApproval: false };
  }
  // An Auto Pod's venue already accepted the offer and has been HOLDING this
  // slot (BOOKED under booked_by_auto_pod_id) ever since, so the AVAILABLE and
  // holiday checks below would reject the venue's own booking. That acceptance
  // IS the approval — there is nothing left for the venue to answer.
  if (autoPodId) {
    const held = await VenueSlotModel.findOne({
      _id: input.venue_slot_id,
      booked_by_auto_pod_id: new Types.ObjectId(autoPodId),
      status: 'BOOKED',
    });
    if (!held) {
      throw new GraphQLError('The venue slot for this Auto Pod is no longer held', {
        extensions: { code: 'CONFLICT' },
      });
    }
    input.venue_id = String(held.venue_id);
    input.pod_date_time = held.start_at.toISOString();
    input.pod_end_date_time = held.end_at.toISOString();
    return { slotDoc: held, needsVenueApproval: false };
  }
  const slotDoc = await VenueSlotModel.findById(input.venue_slot_id);
  if (!slotDoc) {
    throw new GraphQLError('Selected slot not found', { extensions: { code: 'NOT_FOUND' } });
  }
  if (slotDoc.status !== 'AVAILABLE') {
    throw new GraphQLError('Selected slot is no longer available', {
      extensions: { code: 'CONFLICT' },
    });
  }
  if (input.venue_id && String(slotDoc.venue_id) !== String(input.venue_id)) {
    throw new GraphQLError('Slot does not belong to the selected venue', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
  const slotVenue = await VenueModel.findById(slotDoc.venue_id).select('settings.holidays owner_user_id');
  const holidays = new Set(slotVenue?.settings?.holidays ?? []);
  const { venueLocalYmd } = await import('@modules/venues/autoExtend/slotGenerator');
  if (holidays.has(venueLocalYmd(slotDoc.start_at))) {
    throw new GraphQLError('The venue is on leave on this date. Pick another slot.', {
      extensions: { code: 'CONFLICT' },
    });
  }
  // Booking another partner's venue holds the slot until that venue
  // approves; booking your own venue confirms instantly.
  const needsVenueApproval = !(input.pod_hosts_id ?? [])
    .map(String)
    .includes(String(slotDoc.owner_user_id));
  input.venue_id = String(slotDoc.venue_id);
  input.pod_date_time = slotDoc.start_at.toISOString();
  input.pod_end_date_time = slotDoc.end_at.toISOString();
  return { slotDoc, needsVenueApproval };
}

/** An Auto Pod's venue approved when it accepted the offer; every other pod
 * either waits for its venue or needs no approval at all. */
function venueApprovalForCreate(
  autoPodSlot: { slotId: string; autoPodId: string } | null,
  needsVenueApproval: boolean
): 'NONE' | 'PENDING' | 'APPROVED' {
  if (autoPodSlot) return 'APPROVED';
  return needsVenueApproval ? 'PENDING' : 'NONE';
}

/** Meeting details are persisted for virtual pods only. */
function meetingFieldsForCreate(
  podMode: PodMode,
  input: any
): { platform: any; url: any; notes: any } {
  if (podMode !== 'VIRTUAL') return { platform: null, url: null, notes: null };
  return {
    platform: input.meeting_platform?.trim() || null,
    url: input.meeting_url?.trim() || null,
    notes: input.meeting_notes?.trim() || null,
  };
}

/**
 * Atomic book/hold — if a concurrent request snatched the slot between our
 * status check and now, this throws CONFLICT and we roll the pod back so
 * the caller can retry with a different slot.
 *
 * ONLY the slot claim decides whether the pod survives. Telling the venue about
 * it does not: the notification and the email used to sit inside this try, on
 * the request path, so publishing a pod waited on SMTP — and a slow or
 * unreachable mail host hung `publishPodDraft` until the client timed out. Worse,
 * a mail failure landed in the catch below and DELETED a pod that was already
 * created and whose slot was already held.
 *
 * They are now fired after the claim succeeds, and their failures are logged
 * rather than thrown. A venue that was not emailed still has the request in its
 * approval queue; a pod deleted because SMTP blipped is unrecoverable.
 */
async function bookOrHoldSlotForPod(
  doc: any,
  slotDoc: any,
  needsVenueApproval: boolean,
  autoPodSlot?: { slotId: string; autoPodId: string } | null
) {
  if (!slotDoc) return;
  // The Auto Pod already holds this slot: hand the booking over in ONE
  // conditional write rather than booking it again, so it is never AVAILABLE
  // in between for an ordinary pod to snatch.
  if (autoPodSlot) {
    try {
      await venueSlotService.transferAutoPodHold(
        autoPodSlot.slotId,
        autoPodSlot.autoPodId,
        String(doc._id)
      );
    } catch (e) {
      await doc.deleteOne();
      throw e;
    }
    return;
  }
  try {
    if (needsVenueApproval) {
      await venueSlotService.holdForPod(String(slotDoc._id), String(slotDoc.venue_id), String(doc._id));
    } else {
      await venueSlotService.bookForPod(String(slotDoc._id), String(slotDoc.venue_id), String(doc._id));
    }
  } catch (e) {
    await doc.deleteOne();
    throw e;
  }

  if (!needsVenueApproval) return;
  // Fire-and-forget: never block the publish response, never fail the pod.
  notifyVenueSlotRequested(doc, slotDoc).catch((error) =>
    logs.server.error('pods', 'notifyVenueSlotRequested', { error, pod_id: String(doc._id) })
  );
  emailVenueSlotRequested(doc, slotDoc).catch((error) =>
    logs.server.error('pods', 'emailVenueSlotRequested', { error, pod_id: String(doc._id) })
  );
}

/** An edit only re-checks the pod window when the incoming start/end actually
 * differ from what is stored, so re-saving an untouched date still works. */
function validatePodDatesForUpdate(input: any, doc: any) {
  if (input.pod_date_time === undefined && input.pod_end_date_time === undefined) return;
  const nextStart = input.pod_date_time ?? doc.pod_date_time;
  const nextEnd = input.pod_end_date_time === undefined ? doc.pod_end_date_time : input.pod_end_date_time;
  const startChanged = input.pod_date_time !== undefined
    && new Date(input.pod_date_time).getTime() !== doc.pod_date_time?.getTime();
  const nextEndTime = nextEnd ? new Date(nextEnd).getTime() : null;
  const docEndTime = doc.pod_end_date_time ? doc.pod_end_date_time.getTime() : null;
  const endChanged = input.pod_end_date_time !== undefined && nextEndTime !== docEndTime;
  if (startChanged || endChanged) validateFutureDates(nextStart, nextEnd);
}

/** A virtual pod carries no place; a physical one re-resolves its venue/location
 * whenever a place input (or the mode) moves, or it has no venue yet. */
async function applyPlaceForUpdate(doc: any, input: any, nextMode: PodMode) {
  if (nextMode === 'VIRTUAL') {
    doc.venue_id = null as any;
    doc.location_id = null as any;
    doc.zone_name = null;
    return;
  }
  if (
    input.venue_id !== undefined ||
    input.location_id !== undefined ||
    input.club_id !== undefined ||
    input.pod_mode !== undefined ||
    !doc.venue_id
  ) {
    const venueLocation = await resolveVenueLocation({
      venue_id: input.venue_id ?? (doc.venue_id ? String(doc.venue_id) : null),
      location_id: input.location_id ?? (doc.location_id ? String(doc.location_id) : null),
      club_id: input.club_id ?? String(doc.club_id),
      zone_name: input.zone_name ?? doc.zone_name,
      // Slot bookings may target ANY approved partner venue (same rule as
      // create) — forwarded so the club-match check is skipped for them.
      venue_slot_id: input.venue_slot_id,
    });
    doc.venue_id = venueLocation.venue_id;
    doc.location_id = venueLocation.location_id;
    doc.zone_name = venueLocation.zone_name;
  }
}

/** Re-prices the pod's product requests and moves the reserved inventory counts. */
async function applyProductsForUpdate(doc: any, input: any) {
  if (input.products_enabled === undefined && input.product_requests === undefined) return;
  const productsEnabled = input.products_enabled ?? doc.products_enabled;
  const clubCategory = await resolveClubCategory(input.club_id ?? doc.club_id);
  const nextRequests = await buildProductRequests(
    !!productsEnabled,
    input.product_requests ?? doc.product_requests ?? [],
    clubCategory,
    doc.product_requests ?? []
  );
  await applyProductDeltas(doc.product_requests ?? [], nextRequests);
  doc.products_enabled = !!productsEnabled;
  doc.product_requests = nextRequests as any;
  doc.product_cost_total = nextRequests.reduce((sum, item) => sum + item.total_cost, 0);
}

/** Meeting details are normalized on a virtual pod and cleared on a physical one. */
function applyMeetingFieldsForUpdate(doc: any, input: any, nextMode: PodMode) {
  if (nextMode === 'VIRTUAL') {
    if (input.meeting_platform !== undefined) doc.meeting_platform = input.meeting_platform?.trim() || null;
    if (input.meeting_url !== undefined) doc.meeting_url = input.meeting_url?.trim() || null;
    if (input.meeting_notes !== undefined) doc.meeting_notes = input.meeting_notes?.trim() || null;
  }
  if (nextMode === 'PHYSICAL') {
    doc.meeting_platform = null;
    doc.meeting_url = null;
    doc.meeting_notes = null;
  }
}

function applyDatesForUpdate(doc: any, input: any) {
  if (input.pod_date_time !== undefined) {
    doc.pod_date_time = new Date(input.pod_date_time);
  }
  if (input.pod_end_date_time !== undefined) {
    doc.pod_end_date_time = input.pod_end_date_time ? new Date(input.pod_end_date_time) : null;
  }
}

/** Shared full-edit core (admin/club-admin update + host resubmit): validates
 * and writes the incoming fields onto the loaded doc. The caller saves. */
async function applyPodEditCore(doc: any, input: any) {
  const nextMode = normalizePodMode(input.pod_mode ?? doc.pod_mode ?? 'PHYSICAL');
  // A supplied pod_type must follow the FREE/PAID rules; when untouched, a
  // stored FREE pod still cannot be flipped to physical without becoming PAID.
  if (input.pod_type === undefined) {
    if (nextMode === 'PHYSICAL' && doc.pod_type === 'FREE') {
      throw new GraphQLError('Physical pods must be paid — free pods are only available for virtual pods', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }
  } else {
    assertWritablePodType(input.pod_type, nextMode);
  }
  if (input.pod_type !== undefined || input.pod_amount !== undefined) {
    validateAmount(input.pod_type ?? doc.pod_type, input.pod_amount ?? doc.pod_amount);
  }
  validateMeetingDetails(nextMode, input, doc);
  validatePodDatesForUpdate(input, doc);
  if (input.reel_url !== undefined) input.reel_url = normalizeReelUrl(input.reel_url);

  await applyPlaceForUpdate(doc, input, nextMode);

  // Resizing a pod (or moving it to a club in another sub-category) must still
  // clear that activity's minimum — applyProductsForUpdate below returns early
  // when products are untouched, so the check cannot live in there.
  if (input.no_of_spots !== undefined || input.club_id !== undefined) {
    await assertMeetsMinPax(
      await resolveClubCategory(input.club_id ?? doc.club_id),
      input.no_of_spots ?? doc.no_of_spots ?? 0
    );
  }

  await applyProductsForUpdate(doc, input);

  const fields = [
    'pod_title',
    'pod_hosts_id',
    'club_id',
    'pod_mode',
    'meeting_platform',
    'meeting_url',
    'meeting_notes',
    'pod_hashtag',
    'pod_images_and_videos',
    'reel_url',
    'pod_attendees',
    'pod_description',
    'pod_type',
    'pod_amount',
    'pod_occurrence',
    'no_of_spots',
    'pod_info',
    'what_this_pod_offers',
    'available_perks',
    'payment_terms',
    'place_charges',
    'is_active',
  ];
  for (const f of fields) {
    if (input[f] !== undefined) doc[f] = input[f];
  }
  applyMeetingFieldsForUpdate(doc, input, nextMode);
  applyDatesForUpdate(doc, input);
}

/** Booking state, membership and club are server-managed on a host
 * resubmission — never taken from the form. */
const HOST_RESUBMIT_BLOCKED_FIELDS = ['pod_hosts_id', 'pod_attendees', 'club_id', 'is_active'] as const;

/** The pod's booking + window, restored verbatim if a re-route cannot claim
 * its target slot. */
function snapshotBooking(doc: any) {
  return {
    venue_slot_id: doc.venue_slot_id,
    venue_approval_status: doc.venue_approval_status,
    is_active: doc.is_active,
    venue_id: doc.venue_id,
    location_id: doc.location_id,
    zone_name: doc.zone_name,
    pod_date_time: doc.pod_date_time,
    pod_end_date_time: doc.pod_end_date_time,
  };
}

interface SlotReroute {
  slotDoc: any;
  needsVenueApproval: boolean;
  previousSlotId: string | null;
}

/**
 * Resolve the slot an Admin / Club Admin re-routed a pod onto — the lever that
 * rescues a venue-rejected pod from a portal without creating a new one.
 *
 * Runs BEFORE the content edit so the slot dictates the pod's window exactly
 * as it does on create and host resubmission: the resolved venue and date
 * range are written back onto `input`, so applyPodEditCore derives location,
 * zone and dates from them instead of leaving the pod advertising a time its
 * venue never booked. Returns null when no re-route was requested.
 */
async function prepareSlotReroute(doc: any, input: any): Promise<SlotReroute | null> {
  if (input.venue_slot_id === undefined) return null;
  // Venue inventory is only ever held by a pod that can still release it. A
  // cancelled or settled pod would strand the slot forever.
  if (doc.deleted_at) {
    throw new GraphQLError('Restore this pod before changing its venue slot', {
      extensions: { code: 'BAD_REQUEST' },
    });
  }
  if (doc.completed_at) {
    throw new GraphQLError('A completed pod cannot be moved to another venue slot', {
      extensions: { code: 'BAD_REQUEST' },
    });
  }
  const nextMode = normalizePodMode(input.pod_mode ?? doc.pod_mode ?? 'PHYSICAL');
  const slotInput: any = {
    venue_slot_id: nextMode === 'PHYSICAL' ? input.venue_slot_id : undefined,
    venue_id: input.venue_id ?? (doc.venue_id ? String(doc.venue_id) : undefined),
    pod_hosts_id: (doc.pod_hosts_id ?? []).map(String),
  };
  const { slotDoc, needsVenueApproval } = await resolveSlotForCreate(slotInput, nextMode);
  if (slotDoc) {
    input.venue_id = slotInput.venue_id;
    input.pod_date_time = slotInput.pod_date_time;
    input.pod_end_date_time = slotInput.pod_end_date_time;
  }
  return {
    slotDoc,
    needsVenueApproval,
    previousSlotId: doc.venue_slot_id ? String(doc.venue_slot_id) : null,
  };
}

/** Booking state implied by a resolved re-route, applied after the content edit. */
function applyRerouteState(doc: any, input: any, reroute: SlotReroute) {
  const pendingApproval = Boolean(reroute.slotDoc && reroute.needsVenueApproval);
  doc.venue_slot_id = reroute.slotDoc ? reroute.slotDoc._id : null;
  doc.venue_approval_status = pendingApproval ? 'PENDING' : 'NONE';
  // A pod waiting on the venue's answer is never live. Otherwise a settled
  // booking brings the pod back online — unless the portal said otherwise,
  // in which case its explicit Active choice wins.
  doc.is_active = pendingApproval ? false : input.is_active ?? true;
}

/**
 * Claim the new slot, and only once it is secured, free the old one — never
 * the reverse, or a lost race would leave the pod's seat sellable to someone
 * else while the pod still claimed it. A failed claim restores the previous
 * booking AND persists it, mirroring holdOrBookForResubmit.
 */
async function claimRerouteSlot(
  doc: any,
  reroute: SlotReroute,
  previous: ReturnType<typeof snapshotBooking>,
  actorSource: PodAuditSource,
) {
  const { slotDoc, needsVenueApproval, previousSlotId } = reroute;
  try {
    if (slotDoc && needsVenueApproval) {
      await venueSlotService.holdForPod(String(slotDoc._id), String(slotDoc.venue_id), String(doc._id));
      await notifyVenueSlotRequested(doc, slotDoc);
      await emailVenueSlotRequested(doc, slotDoc);
    } else if (slotDoc) {
      await venueSlotService.bookForPod(String(slotDoc._id), String(slotDoc.venue_id), String(doc._id));
    }
  } catch (e) {
    Object.assign(doc, previous);
    await doc.save();
    logs.server.warn('pod', 'slotReroute', {
      error: e,
      msg: `Slot re-route (${actorSource}) failed — pod kept its previous booking`,
    });
    throw e;
  }
  if (previousSlotId && previousSlotId !== String(slotDoc?._id ?? '')) {
    await venueSlotService.releaseSlotForPod(previousSlotId, String(doc._id));
  }
}

/** Re-enter the booking cycle for a resubmitted slot: a partner slot is held
 * (PENDING approval, venue notified again); the host's own slot books
 * instantly. A concurrent snatch reverts the pod to its rejected state —
 * still fully editable — instead of deleting it. */
async function holdOrBookForResubmit(doc: any, slotDoc: any, needsVenueApproval: boolean) {
  try {
    if (needsVenueApproval) {
      await venueSlotService.holdForPod(String(slotDoc._id), String(slotDoc.venue_id), String(doc._id));
      await notifyVenueSlotRequested(doc, slotDoc);
      await emailVenueSlotRequested(doc, slotDoc);
    } else {
      await venueSlotService.bookForPod(String(slotDoc._id), String(slotDoc.venue_id), String(doc._id));
    }
  } catch (e) {
    doc.venue_slot_id = null;
    doc.venue_approval_status = 'DECLINED';
    doc.is_active = false;
    await doc.save();
    throw e;
  }
}

/** Physical resubmission re-resolves the venue: a kept partner venue needs a
 * fresh slot, otherwise the host's own venue / a plain location applies.
 * assertPartnerVenue enforces that split and the resolved id is written back. */
async function applyResubmitPhysicalVenue(
  doc: any,
  input: any,
  slotDoc: any,
  nextMode: string,
  userId: string,
) {
  if (nextMode !== 'PHYSICAL') return;
  const declaredVenueId = doc.venue_id ? String(doc.venue_id) : null;
  const finalVenueId = input.venue_id === undefined ? declaredVenueId : input.venue_id;
  if (!finalVenueId) return;
  await assertPartnerVenue(
    { venue_id: finalVenueId, venue_slot_id: slotDoc ? String(slotDoc._id) : undefined },
    new Types.ObjectId(userId),
  );
  input.venue_id = finalVenueId;
}

export const podService = {
  async list(
    filter?: {
      club_id?: string;
      venue_id?: string;
      location_id?: string;
      zone_name?: string;
      search?: string;
      is_active?: boolean;
      host_user_id?: string;
      has_reel?: boolean;
    },
    opts?: { includePendingApproval?: boolean }
  ) {
    const q: any = {};
    if (filter?.club_id) q.club_id = filter.club_id;
    if (filter?.venue_id) q.venue_id = filter.venue_id;
    const placeFilter = await buildPodPlaceFilter(filter);
    if (placeFilter) Object.assign(q, placeFilter);
    if (filter?.is_active !== undefined) q.is_active = filter.is_active;
    // Explore reels: only pods that actually uploaded a reel video.
    if (filter?.has_reel) q.reel_url = { $nin: [null, ''] };
    // ESCAPED: the raw string used to be compiled as a pattern, so a search of
    // ".*" listed every pod and a crafted one could pin the event loop.
    if (filter?.search) q.pod_title = escapedSearchRegex(filter.search);
    if (filter?.host_user_id) q.pod_hosts_id = filter.host_user_id;
    // A pod awaiting the venue owner's slot approval is NOT live. Hide it from
    // every non-review caller so it can never surface in discovery (or via an
    // unfiltered public read) until the owner approves — a server guarantee, not
    // just a client `is_active` filter. Admin/onboarding reviewers opt in.
    if (!opts?.includePendingApproval) q.venue_approval_status = { $ne: 'PENDING' };
    // Bounded and lean. Unbounded, this hydrated every matching pod into a full
    // Mongoose document, so the discovery feed grew with the collection until it
    // outran the client's request timeout. The sort is date-DESCENDING, so the
    // cap sheds the OLDEST pods first — the ones every discovery surface already
    // filters out as past — and never the upcoming ones the feed is built from.
    const docs = await PodModel.find(q)
      .sort({ pod_date_time: -1 })
      .limit(POD_LIST_MAX)
      .lean();
    if (docs.length === POD_LIST_MAX) {
      // Silent truncation would read as "that is all the pods there are". Say so
      // instead: this is the signal that the cap needs raising or the feed needs
      // paginating, and it lands in the Tech portal's logs where it is visible.
      logs.server.warn('pod', 'list', {
        message: `Pod list hit its ${POD_LIST_MAX}-row cap; older pods were not returned.`,
        filter: JSON.stringify(filter ?? {}),
      });
    }
    const slugMap = await loadClubSlugMap(docs);
    return docs.map((d) => toPub(d, slugMap));
  },

  /** Server-side table page (search/filter/sort/paginate) for the podsTable
   * query — same rows as list(). The venue-approval guard lives in the
   * baseFilter, so a client filter can never surface a PENDING pod to a
   * non-review caller (runTableQuery $and-merges the two). Soft-deleted pods
   * stay excluded via the model's pre-find hook. */
  async table(
    input?: TableQueryInput | null,
    opts?: {
      includePendingApproval?: boolean;
      includeDeleted?: boolean;
      /** Narrows the page to one derived bucket (Admin > Pods > All Pods). */
      lifecycle?: PodLifecycle | null;
    }
  ) {
    // CANCELLED reads soft-deleted rows. The model's pre-find hook normally
    // re-pins `deleted_at: null` for callers without the includeDeleted opt-in
    // — but it stands down the moment a filter mentions `deleted_at`, which
    // this one does. So the guarantee is restored here rather than leaned on: a
    // caller who may not see cancelled pods sees none, not all of them.
    if (opts?.lifecycle === 'CANCELLED' && !opts.includeDeleted) {
      return { rows: [], total: 0, page: 1, page_size: 0 };
    }
    const baseFilter: Record<string, unknown> = opts?.includePendingApproval
      ? {}
      : { venue_approval_status: { $ne: 'PENDING' } };
    // Derived from dates rather than stored, so it cannot ride the engine's
    // field allowlist — it joins the approval guard in the baseFilter instead,
    // where a client filter can never widen it.
    if (opts?.lifecycle) {
      Object.assign(baseFilter, podLifecycleFilter(opts.lifecycle, new Date()));
    }
    const { docs, total, page, page_size } = await runTableQuery<any>(
      PodModel,
      baseFilter,
      coerceLegacyPodTypeFilters(input),
      POD_TABLE_CONFIG,
      { includeDeleted: opts?.includeDeleted }
    );
    const slugMap = await loadClubSlugMap(docs);
    return { rows: docs.map((d) => toPub(d, slugMap)), total, page, page_size };
  },

  /** Host-scoped table page for myHostPodsTable. The baseFilter pins
   * pod_hosts_id to the caller ($and-merged by runTableQuery), so client
   * filters can never widen the scope to another host's pods. Like
   * listMyHostPods, the host still sees their own PENDING-approval pods. */
  async tableMine(userId: string, input?: TableQueryInput | null) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new GraphQLError('Authentication required', { extensions: { code: 'UNAUTHENTICATED' } });
    }
    const { docs, total, page, page_size } = await runTableQuery<any>(
      PodModel,
      { pod_hosts_id: new Types.ObjectId(userId) },
      coerceLegacyPodTypeFilters(input),
      POD_TABLE_CONFIG
    );
    const slugMap = await loadClubSlugMap(docs);
    return { rows: docs.map((d) => toPub(d, slugMap)), total, page, page_size };
  },

  /**
   * Club-scoped table page for the Partners portal's Club Admin. The club ids
   * are pinned in the baseFilter ($and-merged by runTableQuery), so a client
   * filter can never widen it to another club's pods. Unlike the public table
   * this deliberately shows EVERY stage — pods still awaiting the venue
   * owner's approval and cancelled (soft-deleted) ones included — because a
   * club admin must be able to open and edit a pod wherever it sits in the
   * booking cycle.
   */
  async tableForClubAdmin(
    clubIds: string[],
    input?: TableQueryInput | null,
    status?: PodRowStatus | null
  ) {
    if (clubIds.length === 0) return { rows: [], total: 0, page: 1, page_size: 0 };
    const baseFilter: Record<string, unknown> = {
      club_id: { $in: clubIds.map((id) => new Types.ObjectId(id)) },
    };
    // Derived from four fields, so it cannot ride the engine's allowlist — it
    // joins the club scope in the baseFilter, which a client filter can never
    // widen (runTableQuery $and-merges the two).
    if (status) Object.assign(baseFilter, podRowStatusFilter(status));
    const { docs, total, page, page_size } = await runTableQuery<any>(
      PodModel,
      baseFilter,
      coerceLegacyPodTypeFilters(input),
      POD_TABLE_CONFIG,
      { includeDeleted: true }
    );
    const slugMap = await loadClubSlugMap(docs);
    return { rows: docs.map((d) => toPub(d, slugMap)), total, page, page_size };
  },

  async activeLocationIds(): Promise<string[]> {
    // Locations that currently host at least one live pod (active and not past).
    const ids = await PodModel.distinct('location_id', {
      is_active: true,
      location_id: { $ne: null },
      pod_date_time: { $gte: new Date() },
    });
    return ids.map(String);
  },

  async listMyHostPods(userId: string, range?: { from?: string | null; to?: string | null }) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new GraphQLError('Authentication required', { extensions: { code: 'UNAUTHENTICATED' } });
    }
    const q: any = { pod_hosts_id: new Types.ObjectId(userId) };
    const dateRange = buildPodDateRange(range);
    if (dateRange) q.pod_date_time = dateRange;
    const docs = await PodModel.find(q).sort({ pod_date_time: -1 }).limit(200);
    const slugMap = await loadClubSlugMap(docs);
    return docs.map((d) => toPub(d, slugMap));
  },

  async getById(id: string, opts?: { includeDeleted?: boolean }) {
    // Pod History resolves a booking's pod even after it was soft-deleted; every
    // other caller gets the default (deleted pods excluded by the schema hook).
    const query = PodModel.findById(id);
    if (opts?.includeDeleted) query.setOptions({ includeDeleted: true });
    const doc = await query;
    if (!doc) return null;
    const slugMap = await loadClubSlugMap([doc]);
    return toPub(doc, slugMap);
  },

  async getBySlugs(clubSlug: string, podSlug: string) {
    const club = await ClubModel.findOne({ club_id: clubSlug });
    if (!club) return null;
    const doc = await PodModel.findOne({ club_id: club._id, pod_id: podSlug });
    if (!doc) return null;
    const slugMap = new Map([[String(club._id), club.club_id]]);
    return toPub(doc, slugMap);
  },

  /**
   * The ONE funnel every pod is born through. `opts.autoPodSlot` is the Auto Pod
   * handover: the venue accepted the offer long before this pod existed and has
   * held its slot ever since, so the slot is adopted rather than claimed afresh
   * and the pod lands venue-APPROVED. Every other invariant still runs here with
   * real values — hosts, image, future date, economics, club category, slug.
   */
  async create(
    input: any,
    audit?: { actorUserId?: string | null; source: PodAuditSource; note?: string | null },
    opts?: { autoPodSlot?: { slotId: string; autoPodId: string } }
  ) {
    const autoPodSlot = opts?.autoPodSlot ?? null;
    const pod_id = await resolvePodSlugForCreate(input);
    if (!input.pod_hosts_id?.length) {
      throw new GraphQLError('At least one host is required', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }
    validateHasImage(input.pod_images_and_videos);
    // Content guard on the ONE creation funnel, so the rules hold for the Admin
    // portal, the Club Admin portal, the AI agent, an Auto Pod materialising and
    // the host's own form alike — there is no pod yet to hang a REJECTED audit
    // entry on, so this one only throws.
    moderationService.assertCleanOrThrow(podContentOf(input));
    const podMode = normalizePodMode(input.pod_mode);
    assertWritablePodType(input.pod_type, podMode);
    validateAmount(input.pod_type, input.pod_amount ?? 0);

    const { slotDoc, needsVenueApproval } = await resolveSlotForCreate(
      input,
      podMode,
      autoPodSlot?.autoPodId
    );

    validateFutureDates(input.pod_date_time, input.pod_end_date_time);
    validateMeetingDetails(podMode, input);
    const venueLocation = podMode === 'PHYSICAL'
      ? await resolveVenueLocation(input)
      : { venue_id: null, location_id: null, zone_name: null };
    // API-side mirror of the Step-4 UI rules: a paid pod must cover the venue's
    // slot price and leave the host a positive projected payout (finance owns
    // the math). Free pods are exempt; the slot price is the venue's money.
    await breakdownService.assertViablePodEconomics({
      hostUserId: String(input.pod_hosts_id[0]),
      podAmount: input.pod_amount ?? 0,
      noOfSpots: input.no_of_spots ?? 0,
      venueId: venueLocation.venue_id,
      venueAmount: slotDoc ? slotDoc.price : 0,
    });
    const clubCategory = await resolveClubCategory(input.club_id);
    await assertMeetsMinPax(clubCategory, input.no_of_spots ?? 0);
    const productRequests = await buildProductRequests(
      !!input.products_enabled,
      input.product_requests ?? [],
      clubCategory
    );
    await applyProductDeltas([], productRequests);

    // Hosts are attendees by default
    const attendees = Array.from(
      new Set([...(input.pod_attendees ?? []), ...input.pod_hosts_id])
    );
    const meeting = meetingFieldsForCreate(podMode, input);

    // Co-hosts are validated BEFORE the row is written, so a rejected invite
    // cannot leave a half-created pod behind. They land as PENDING: nobody
    // co-hosts without accepting.
    const invitedCoHosts: string[] = input.co_host_user_ids?.length
      ? await assertInvitable(
          { club_id: input.club_id, pod_hosts_id: input.pod_hosts_id, co_hosts: [] } as any,
          input.co_host_user_ids,
          0
        )
      : [];

    const doc = await PodModel.create({
      pod_id,
      pod_title: input.pod_title.trim(),
      pod_hosts_id: input.pod_hosts_id,
      co_hosts: invitedCoHosts.map((id) => ({
        user_id: new Types.ObjectId(id),
        status: 'PENDING',
        invited_at: new Date(),
        responded_at: null,
      })),
      location_id: venueLocation.location_id,
      venue_id: venueLocation.venue_id,
      venue_slot_id: slotDoc ? slotDoc._id : null,
      club_id: input.club_id,
      zone_name: venueLocation.zone_name,
      pod_mode: podMode,
      meeting_platform: meeting.platform,
      meeting_url: meeting.url,
      meeting_notes: meeting.notes,
      pod_hashtag: input.pod_hashtag ?? [],
      pod_images_and_videos: input.pod_images_and_videos ?? [],
      reel_url: normalizeReelUrl(input.reel_url),
      pod_hits: 0,
      pod_attendees: attendees,
      pod_description: input.pod_description,
      pod_date_time: new Date(input.pod_date_time),
      pod_end_date_time: input.pod_end_date_time ? new Date(input.pod_end_date_time) : null,
      pod_type: input.pod_type,
      pod_amount: input.pod_amount ?? 0,
      pod_occurrence: input.pod_occurrence ?? 'ONE_TIME',
      no_of_spots: input.no_of_spots ?? 0,
      pod_info: input.pod_info ?? '',
      what_this_pod_offers: input.what_this_pod_offers ?? [],
      available_perks: input.available_perks ?? [],
      payment_terms: input.payment_terms ?? null,
      place_charges: input.place_charges ?? [],
      products_enabled: !!input.products_enabled,
      product_requests: productRequests,
      product_cost_total: productRequests.reduce((sum, item) => sum + item.total_cost, 0),
      // A pod awaiting the venue's slot approval stays offline until approved.
      is_active: needsVenueApproval ? false : input.is_active ?? true,
      venue_approval_status: venueApprovalForCreate(autoPodSlot, needsVenueApproval),
      source_auto_pod_id: autoPodSlot ? new Types.ObjectId(autoPodSlot.autoPodId) : null,
    });

    await bookOrHoldSlotForPod(doc, slotDoc, needsVenueApproval, autoPodSlot);
    await podAuditService.record({
      pod: doc,
      action: 'CREATE',
      source: audit?.source ?? 'ADMIN',
      actorUserId: audit?.actorUserId,
      note: audit?.note,
    });

    const slugMap = await loadClubSlugMap([doc]);
    return toPub(doc, slugMap);
  },

  async createForPartner(userId: string, input: any) {
    const userObjectId = new Types.ObjectId(userId);
    await assertActiveHost(userId);
    const podMode = normalizePodMode(input.pod_mode);
    if (podMode === 'PHYSICAL') {
      await assertPartnerVenue(input, userObjectId);
    }
    return this.create(
      { ...input, pod_mode: podMode, pod_hosts_id: [userId], pod_attendees: [userId] },
      { actorUserId: userId, source: 'HOST' },
    );
  },

  /**
   * Portal edit (Admin / Club Admin) — allowed at EVERY stage of the booking
   * cycle: awaiting venue approval, live, venue-rejected, completed, and
   * cancelled (soft-deleted pods opt in via `includeDeleted`, so a cancelled
   * pod stays correctable instead of being frozen). Passing `venue_slot_id`
   * re-routes the booking, which is how a portal rescues a rejected pod.
   */
  async update(
    id: string,
    input: any,
    audit?: { actorUserId?: string | null; source: PodAuditSource; includeDeleted?: boolean }
  ) {
    const query = PodModel.findById(id);
    if (audit?.includeDeleted) query.setOptions({ includeDeleted: true });
    const doc = await query;
    if (!doc) notFound();

    const source = audit?.source ?? 'SYSTEM';
    // Editing at any stage is not editing under any rules: the title,
    // description, extra info, hashtags and media a portal writes face the same
    // guidelines a host's do, and a refusal is recorded before it is thrown.
    await assertEditContentClean(doc, podContentOf(input), {
      actorUserId: audit?.actorUserId,
      source,
    });
    // A cancelled pod stays correctable, but a content edit must never
    // contradict its cancellation by flipping it live again.
    if (doc.deleted_at) delete input.is_active;
    const reroute = await prepareSlotReroute(doc, input);
    const booking = reroute ? snapshotBooking(doc) : null;
    const before = snapshotPod(doc);
    await applyPodEditCore(doc, input);
    if (reroute) applyRerouteState(doc, input, reroute);
    await doc.save();
    if (reroute && booking) await claimRerouteSlot(doc, reroute, booking, source);
    await podAuditService.record({
      pod: doc,
      action: 'UPDATE',
      source,
      actorUserId: audit?.actorUserId,
      before,
    });
    const slugMap = await loadClubSlugMap([doc]);
    return toPub(doc, slugMap);
  },

  /**
   * Host fully edits a venue-DECLINED pod and resubmits the booking request —
   * the SAME pod row is reused, never a new one. Picking another partner's
   * slot re-enters PENDING approval (the venue is notified again); an own-venue
   * slot books instantly and a virtual / no-venue resubmission goes live
   * immediately. Only available while the pod is Venue Rejected.
   */
  async hostResubmit(id: string, userId: string, input: any) {
    const doc = await findHostedPod(id, userId);
    if (doc.venue_approval_status !== 'DECLINED') {
      throw new GraphQLError('Only a pod whose venue request was rejected can be edited and resubmitted', {
        extensions: { code: 'BAD_REQUEST' },
      });
    }
    // Same deterministic content guard as create — the resubmitted copy must
    // stay clean, judged on the values that will actually go back to the venue
    // (input merged over what is stored, since a partial edit keeps the rest).
    await assertEditContentClean(
      doc,
      podContentOf({
        pod_title: input.pod_title ?? doc.pod_title,
        pod_description: input.pod_description ?? doc.pod_description,
        pod_info: input.pod_info ?? doc.pod_info,
        pod_hashtag: input.pod_hashtag ?? doc.pod_hashtag,
        pod_images_and_videos: input.pod_images_and_videos ?? doc.pod_images_and_videos,
      }),
      { actorUserId: userId, source: 'HOST' }
    );
    for (const field of HOST_RESUBMIT_BLOCKED_FIELDS) delete input[field];

    const nextMode = normalizePodMode(input.pod_mode ?? doc.pod_mode ?? 'PHYSICAL');
    // Slot resolution mirrors create: the picked slot locks the pod window and
    // decides whether the venue must approve again.
    const slotInput: any = {
      venue_slot_id: nextMode === 'PHYSICAL' ? input.venue_slot_id : undefined,
      venue_id: input.venue_id,
      pod_hosts_id: (doc.pod_hosts_id ?? []).map(String),
    };
    const { slotDoc, needsVenueApproval } = await resolveSlotForCreate(slotInput, nextMode);
    if (slotDoc) {
      input.venue_id = slotInput.venue_id;
      input.pod_date_time = slotInput.pod_date_time;
      input.pod_end_date_time = slotInput.pod_end_date_time;
    }
    // Without a fresh slot a partner venue cannot be kept: the rejected
    // request must move to a new slot (or the host's own venue / a plain
    // location). assertPartnerVenue enforces exactly that split.
    await applyResubmitPhysicalVenue(doc, input, slotDoc, nextMode, userId);

    // Same Step-4 economics guard as create, on the MERGED (input over stored)
    // values — a resubmitted paid pod must still cover its venue price and
    // leave the host a positive projected payout.
    const docVenueId = doc.venue_id ? String(doc.venue_id) : null;
    const resubmitVenueId = nextMode === 'PHYSICAL' ? (input.venue_id ?? docVenueId) : null;
    await breakdownService.assertViablePodEconomics({
      hostUserId: userId,
      podAmount: input.pod_amount ?? doc.pod_amount ?? 0,
      noOfSpots: input.no_of_spots ?? doc.no_of_spots ?? 0,
      venueId: resubmitVenueId,
      venueAmount: slotDoc ? slotDoc.price : 0,
    });

    const before = snapshotPod(doc);
    await applyPodEditCore(doc, input);
    // Resubmission state: a partner slot re-enters the approval queue;
    // anything else goes live right away.
    doc.venue_slot_id = slotDoc ? slotDoc._id : null;
    doc.venue_approval_status = slotDoc && needsVenueApproval ? 'PENDING' : 'NONE';
    doc.is_active = !(slotDoc && needsVenueApproval);
    await doc.save();
    if (slotDoc) await holdOrBookForResubmit(doc, slotDoc, needsVenueApproval);
    await podAuditService.record({
      pod: doc,
      action: 'RESUBMIT',
      source: 'HOST',
      actorUserId: userId,
      before,
      note: 'Venue-rejected pod edited and booking request resubmitted',
    });

    const slugMap = await loadClubSlugMap([doc]);
    return toPub(doc, slugMap);
  },

  /** Host self-service edit — only title, description and media (2A). */
  async hostUpdate(id: string, userId: string, input: any) {
    const doc = await findHostedPod(id, userId);
    const before = snapshotPod(doc);
    const title = (input.pod_title ?? '').trim();
    if (title.length < 3) {
      throw new GraphQLError('Title is too short', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const description = (input.pod_description ?? '').trim();
    if (!description) {
      throw new GraphQLError('Description is required', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }
    validateHasImage(input.pod_images_and_videos);
    // The three fields a host may change are exactly the three the guidelines
    // cover, so every host edit is screened — not just the first publish.
    await assertEditContentClean(
      doc,
      podContentOf({ ...input, pod_title: title, pod_description: description }),
      { actorUserId: userId, source: 'HOST' }
    );
    doc.pod_title = title;
    doc.pod_description = description;
    doc.pod_images_and_videos = (input.pod_images_and_videos ?? []).map((m: any) => ({
      url: m.url,
      type: m.type === 'VIDEO' ? 'VIDEO' : 'IMAGE',
    }));
    if (input.reel_url !== undefined) doc.reel_url = normalizeReelUrl(input.reel_url);
    await doc.save();
    await podAuditService.record({ pod: doc, action: 'UPDATE', source: 'HOST', actorUserId: userId, before });

    // Best-effort: tell every attendee the pod changed.
    try {
      const audience = await podAudience(doc, userId);
      const when = podWhenLabel(doc);
      await Promise.allSettled(
        audience.map((user) =>
          sendPodUpdatedEmail({ to: user.email, name: user.name, pod_title: doc.pod_title, when })
        )
      );
    } catch (err) {
      logs.server.error('pod', 'update', {
        error: err,
        msg: 'update emails failed',
      });
    }

    const slugMap = await loadClubSlugMap([doc]);
    return toPub(doc, slugMap);
  },

  /** What deleting this pod means: other attendees + refundable paid amount (2B). */
  async hostDeleteImpact(id: string, userId: string) {
    const doc = await findHostedPod(id, userId);
    const hostIds = new Set((doc.pod_hosts_id ?? []).map(String));
    const others = (doc.pod_attendees ?? []).map(String).filter((uid: string) => !hostIds.has(uid));
    const payments = await PaymentModel.find({ pod_id: doc._id, status: 'SUCCESS' })
      .select('total currency_symbol')
      .lean();
    const settings = payments.length === 0 ? await getFinanceSettings() : null;
    return {
      // Seats, not buyers — this number is printed next to the refund total, and
      // one person cancelling a four-seat booking takes four people with them.
      other_attendee_count: others.length + (doc.extra_seats ?? 0),
      refundable_payment_count: payments.length,
      refund_total: payments.reduce((sum: number, p: any) => sum + (p.total ?? 0), 0),
      currency_symbol: payments[0]?.currency_symbol ?? settings?.currency_symbol ?? '₹',
    };
  },

  /**
   * Host self-service delete (2B): mandatory reason, refunds every SUCCESS
   * payment (visible in the Finance portal's payment logs), and emails the
   * audience — a cancellation note to each attendee and a refund note to payers.
   */
  async hostRemove(id: string, userId: string, reasonSubject: string, reasonNote?: string | null) {
    const doc = await findHostedPod(id, userId);
    const reason = buildDeleteReason(reasonSubject, reasonNote);
    const refunded = await refundAndNotifyCancellation(doc, userId, reason, 'HOST');
    // null means a concurrent cancel committed the delete first and has already
    // told everyone, the host included.
    if (refunded !== null) await whatsappHostCancellationRequested(doc, userId);
    return true;
  },

  /**
   * Venue owner cancels an UPCOMING pod booked at their venue: refunds every
   * SUCCESS payment, emails the audience and soft-deletes the pod (audit source
   * VENUE_OWNER, so Finance → Cancel & Refunds lists it as kind VENUE), then
   * deducts the Account Health penalty configured in Admin → Pods → Pod
   * Settings from that venue. Returns the penalty and the resulting score.
   */
  async venueCancelPod(podId: string, userId: string, reason: string) {
    if (!Types.ObjectId.isValid(podId)) {
      throw new GraphQLError('Invalid pod id', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const trimmed = String(reason ?? '').trim();
    if (trimmed.length < 5) {
      throw new GraphQLError('Please describe why you are cancelling this pod', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }
    const note = trimmed.slice(0, 500);
    // Deliberately NOT includeDeleted: an already-cancelled pod is a clean
    // NOT_FOUND before any refund or penalty runs.
    const doc = await PodModel.findById(podId);
    if (!doc) notFound();
    await assertOwnedVenue(doc, userId);
    if (bucketForPod(doc, Date.now()) !== 'upcoming') {
      throw new GraphQLError('Only an upcoming pod can be cancelled', {
        extensions: { code: 'BAD_REQUEST' },
      });
    }

    const podTitle = doc!.pod_title;
    const venueId = String(doc!.venue_id);
    const refunded_count = await refundAndNotifyCancellation(doc, userId, note, 'VENUE_OWNER');
    // A concurrent cancel committed the delete first and already took the
    // penalty. Report that cancellation's outcome — docking the venue a second
    // time for one cancellation is the bug this guard exists to stop.
    if (refunded_count === null) {
      const current = await accountHealthService.getVenueHealth(venueId);
      return {
        pod_id: podId,
        health_penalty: 0,
        venue_health_score: current.total_score,
        refunded_count: 0,
      };
    }

    const health_penalty = await settingsService.getVenueCancelHealthPenalty();
    const venue_health_score = await accountHealthService.applySystemPenalty({
      subject_type: 'VENUE',
      subject_id: venueId,
      points: health_penalty,
      remark: `Venue owner cancelled the pod "${podTitle}". Reason: ${note}`,
    });

    return { pod_id: podId, health_penalty, venue_health_score, refunded_count };
  },

  async addStatus(id: string, viewerId: string, media: any, isAdmin = false) {
    if (!Types.ObjectId.isValid(id)) {
      throw new GraphQLError('Invalid pod id', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const doc = await PodModel.findById(id);
    if (!doc) notFound();
    const isHost = (doc.pod_hosts_id ?? []).some((hostId: any) => String(hostId) === viewerId);
    if (!isAdmin && !isHost) {
      throw new GraphQLError('Only pod hosts can add status media', {
        extensions: { code: 'FORBIDDEN' },
      });
    }
    doc.pod_images_and_videos.push(normalizeStatusMedia(media) as any);
    await doc.save();
    const slugMap = await loadClubSlugMap([doc]);
    return toPub(doc, slugMap);
  },

  async remove(id: string, audit?: { actorUserId?: string | null; source: PodAuditSource; note?: string | null }) {
    // An admin or club-admin delete IS a cancellation, and this path used to run
    // it in silence: no refund of the SUCCESS payments and not a word to the
    // attendees, unlike the host and venue flows. It now goes through the same
    // money-and-mail path. A pod that is already cancelled has nothing left to
    // refund and falls through to the idempotent soft delete below.
    if (audit && isDuncitCancel(audit.source)) {
      const doc = await PodModel.findById(id);
      if (doc) {
        const reason = audit.note ?? DUNCIT_CANCEL_REASON;
        await refundAndNotifyCancellation(doc, String(audit.actorUserId ?? ''), reason, audit.source);
        return true;
      }
    }
    // Portals now list cancelled pods, so Delete can be pressed on one twice.
    // softDeletePod answers idempotently instead of a confusing 404 — the slot
    // and inventory releases already ran the first time — so this stays `true`
    // whether or not this particular call is the one that committed the delete.
    await softDeletePod(id, audit);
    return true;
  },

  /**
   * When a pod completes (settlement submitted / finance approved), hand the
   * UNSOLD stocked units back to the sellable pool: each row's reservation
   * drops by (quantity − sold_count). Sold units already left inventory (and
   * their reservation share) at order time. Callers must invoke this exactly
   * once, at the moment completed_at transitions from null.
   */
  async releaseCompletedPodStock(podId: unknown) {
    const pod = await PodModel.findById(podId).select('product_requests');
    for (const row of (pod as any)?.product_requests ?? []) {
      const unsold = Math.max(0, Number(row.quantity || 0) - Number(row.sold_count || 0));
      if (!unsold) continue;
      const product = await InventoryProductModel.findById(row.product_id);
      if (!product) continue;
      product.requested_count = Math.max(0, product.requested_count - unsold);
      await product.save();
    }
    return true;
  },

  async incrementHits(id: string) {
    const doc = await PodModel.findByIdAndUpdate(
      id,
      { $inc: { pod_hits: 1 } },
      { new: true }
    );
    if (!doc) return null;
    const slugMap = await loadClubSlugMap([doc]);
    return toPub(doc, slugMap);
  },

  async toggleLike(id: string, viewerId: string) {
    if (!Types.ObjectId.isValid(id))
      throw new GraphQLError('Invalid pod id', { extensions: { code: 'BAD_USER_INPUT' } });
    const doc = await PodModel.findById(id);
    if (!doc) notFound();
    const idx = (doc!.liked_user_ids || []).findIndex((x: any) => String(x) === viewerId);
    const nowLiked = idx < 0;
    if (idx >= 0) doc!.liked_user_ids.splice(idx, 1);
    else doc!.liked_user_ids.push(new Types.ObjectId(viewerId) as any);
    await doc!.save();
    const slugMap = await loadClubSlugMap([doc!]);
    // Ping the host only when transitioning to liked — an unlike is not news.
    if (nowLiked) {
      notifySocialActivity({
        ownerId: podOwnerId(doc),
        actorId: viewerId,
        subject: 'pod',
        action: 'liked',
        link: podNotificationLink(doc, slugMap),
      }).catch((err) =>
        logs.server.error('pod', 'toggleLike', {
          error: err,
          msg: 'notifySocialActivity (like) failed',
          podId: id,
        })
      );
    }
    return toPub(doc, slugMap);
  },

  async addComment(id: string, viewerId: string, text: string) {
    if (!Types.ObjectId.isValid(id))
      throw new GraphQLError('Invalid pod id', { extensions: { code: 'BAD_USER_INPUT' } });
    const trimmed = (text || '').trim();
    if (!trimmed)
      throw new GraphQLError('Comment cannot be empty', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    if (trimmed.length > 1000)
      throw new GraphQLError('Comment too long (max 1000 chars)', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    const doc = await PodModel.findById(id);
    if (!doc) notFound();
    const created_at = new Date();
    doc!.comments.push({
      author_id: new Types.ObjectId(viewerId) as any,
      text: trimmed,
      created_at,
    } as any);
    await doc!.save();
    const slugMap = await loadClubSlugMap([doc!]);
    notifySocialActivity({
      ownerId: podOwnerId(doc),
      actorId: viewerId,
      subject: 'pod',
      action: 'commented on',
      link: podNotificationLink(doc, slugMap),
    }).catch((err) =>
      logs.server.error('pod', 'addComment', {
        error: err,
        msg: 'notifySocialActivity (comment) failed',
        podId: id,
      })
    );
    const c = doc!.comments[doc!.comments.length - 1] as any;
    const u: any = await UserModel.findById(viewerId).select(
      'profile.first_name profile.last_name profile.profile_photo'
    );
    return {
      id: String(c._id),
      author_id: viewerId,
      author_name: u ? `${u.profile?.first_name ?? ''} ${u.profile?.last_name ?? ''}`.trim() : null,
      author_photo: u?.profile?.profile_photo ?? null,
      text: trimmed,
      likes: [],
      created_at: created_at.toISOString(),
    };
  },

  /** Like/unlike a single pod comment (explore item 4). Returns the comment in
   * the same shape as listComments so the client can refresh it in place. */
  async toggleCommentLike(id: string, commentId: string, viewerId: string) {
    if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(commentId))
      throw new GraphQLError('Invalid id', { extensions: { code: 'BAD_USER_INPUT' } });
    const doc = await PodModel.findById(id);
    if (!doc) notFound();
    const c: any = (doc!.comments as any).find((x: any) => String(x._id) === commentId);
    if (!c) throw new GraphQLError('Comment not found', { extensions: { code: 'NOT_FOUND' } });
    c.likes = c.likes ?? [];
    const idx = c.likes.findIndex((x: any) => String(x) === viewerId);
    const nowLiked = idx < 0;
    if (idx >= 0) c.likes.splice(idx, 1);
    else c.likes.push(new Types.ObjectId(viewerId));
    await doc!.save();
    // The comment's author is the one being liked here, not the pod's host.
    if (nowLiked) {
      const slugMap = await loadClubSlugMap([doc!]);
      notifySocialActivity({
        ownerId: String(c.author_id),
        actorId: viewerId,
        subject: 'pod comment',
        action: 'liked',
        link: podNotificationLink(doc, slugMap),
      }).catch((err) =>
        logs.server.error('pod', 'toggleCommentLike', {
          error: err,
          msg: 'notifySocialActivity (comment like) failed',
          podId: id,
          commentId,
        })
      );
    }
    const u: any = await UserModel.findById(c.author_id).select(
      'profile.first_name profile.last_name profile.profile_photo'
    );
    return {
      id: String(c._id),
      author_id: String(c.author_id),
      author_name: u ? `${u.profile?.first_name ?? ''} ${u.profile?.last_name ?? ''}`.trim() : null,
      author_photo: u?.profile?.profile_photo ?? null,
      text: c.text,
      likes: (c.likes ?? []).map(String),
      created_at: new Date(c.created_at).toISOString(),
    };
  },

  async deleteComment(id: string, commentId: string, viewerId: string, isAdmin: boolean) {
    if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(commentId))
      throw new GraphQLError('Invalid id', { extensions: { code: 'BAD_USER_INPUT' } });
    const doc = await PodModel.findById(id);
    if (!doc) notFound();
    const c: any = (doc!.comments as any).find((x: any) => String(x._id) === commentId);
    if (!c) throw new GraphQLError('Comment not found', { extensions: { code: 'NOT_FOUND' } });
    if (!isAdmin && String(c.author_id) !== viewerId)
      throw new GraphQLError('Not allowed', { extensions: { code: 'FORBIDDEN' } });
    doc!.comments = (doc!.comments as any).filter(
      (x: any) => String(x._id) !== commentId
    );
    await doc!.save();
    return true;
  },

  async listComments(id: string) {
    if (!Types.ObjectId.isValid(id))
      throw new GraphQLError('Invalid pod id', { extensions: { code: 'BAD_USER_INPUT' } });
    const doc = await PodModel.findById(id);
    if (!doc) notFound();
    const comments = (doc!.comments ?? []).slice().sort(
      (a: any, b: any) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    const ids = Array.from(new Set(comments.map((c: any) => String(c.author_id))));
    const users: any[] = await UserModel.find({ _id: { $in: ids } }).select(
      'profile.first_name profile.last_name profile.profile_photo'
    );
    const byId = new Map<string, any>();
    users.forEach((u) => byId.set(String(u._id), u));
    return comments.map((c: any) => {
      const u = byId.get(String(c.author_id));
      return {
        id: String(c._id),
        author_id: String(c.author_id),
        author_name: u ? `${u.profile?.first_name ?? ''} ${u.profile?.last_name ?? ''}`.trim() : null,
        author_photo: u?.profile?.profile_photo ?? null,
        text: c.text,
        likes: (c.likes ?? []).map(String),
        created_at: new Date(c.created_at).toISOString(),
      };
    });
  },

  /**
   * Auto-generates a meeting URL via the configured provider.
   * If OAuth env vars are missing for the requested platform, returns
   * `{ ok: false, requires_oauth: true }` so the UI can prompt the admin
   * to paste a link manually.
   *
   * Provider integration is intentionally a thin shell here — wire up the
   * real Zoom / Google Meet / Teams API calls when the OAuth credentials
   * are available in the deployment environment.
   */
  async generateMeetingLink(args: {
    platform: string;
    title: string;
    start: string;
    end?: string | null;
  }) {
    const env = process.env;
    const platform = (args.platform || '').toUpperCase();

    const zoomConfigured = !!(
      env.ZOOM_OAUTH_ACCOUNT_ID &&
      env.ZOOM_OAUTH_CLIENT_ID &&
      env.ZOOM_OAUTH_CLIENT_SECRET
    );
    const googleConfigured = !!(
      env.GOOGLE_OAUTH_CLIENT_ID &&
      env.GOOGLE_OAUTH_CLIENT_SECRET &&
      env.GOOGLE_OAUTH_REFRESH_TOKEN
    );
    const teamsConfigured = !!(
      env.MS_GRAPH_CLIENT_ID &&
      env.MS_GRAPH_CLIENT_SECRET &&
      env.MS_GRAPH_TENANT_ID
    );

    const requiresOauth = (): {
      ok: boolean;
      url: null;
      message: string;
      requires_oauth: boolean;
    } => ({
      ok: false,
      url: null,
      message: `${platform} is not configured on the server. Paste a link manually for now.`,
      requires_oauth: true,
    });

    if (platform === 'ZOOM') {
      if (!zoomConfigured) return requiresOauth();
      // Deferred: real Zoom API call using server-to-server OAuth +
      // meetings.create. Until then this is a placeholder link — but a guessable
      // meeting id is a way in, so even the stand-in is drawn from a CSPRNG (S2245).
      return {
        ok: true,
        url: `https://zoom.us/j/${randomInt(1e9, 1e10)}`,
        message: 'Generated (Zoom)',
        requires_oauth: false,
      };
    }
    if (platform === 'GOOGLE_MEET') {
      if (!googleConfigured) return requiresOauth();
      const meetCode = [0, 1, 2].map(() => randomAlpha(4)).join('-');
      return {
        ok: true,
        url: `https://meet.google.com/${meetCode}`,
        message: 'Generated (Google Meet)',
        requires_oauth: false,
      };
    }
    if (platform === 'TEAMS') {
      if (!teamsConfigured) return requiresOauth();
      return {
        ok: true,
        url: `https://teams.microsoft.com/l/meetup-join/${encodeURIComponent(args.title)}`,
        message: 'Generated (Teams)',
        requires_oauth: false,
      };
    }
    return {
      ok: false,
      url: null,
      message: `Unsupported platform '${platform}'. Paste a link manually.`,
      requires_oauth: false,
    };
  },
};
