/**
 * `podService` — creating and editing pods: create (admin and partner), admin
 * update, host resubmit and update, spot limits, status posts and meeting-link
 * generation. Composed into `podService` in pod.service.ts.
 */
import { randomInt } from 'node:crypto';
import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { assertSpotsWithinLimits, resolveSpotLimits, type PodSpotLimits } from './pod.capacity';
import { PodModel } from './pod.model';
import { breakdownService } from '@modules/finance/finance/breakdown.service';
import { sendPodUpdatedEmail } from '@services/email/email.service';
import { moderationService } from '@modules/moderation/moderation.service';
import { assertInvitable } from './coHost.service';
import { podAuditService, snapshotPod } from '@modules/pods/podAudit/podAudit.service';
import type { PodAuditSource } from '@modules/pods/podAudit/podAudit.model';
import { logs } from '@observability/log';
import { loadClubSlugMap, notFound, podAudience, podWhenLabel, toPub } from './pod.shared';
import {
  assertActiveHost,
  assertEditContentClean,
  assertWritablePodType,
  findHostedPod,
  normalizePodMode,
  normalizeReelUrl,
  normalizeStatusMedia,
  podContentOf,
  validateAmount,
  validateFutureDates,
  validateHasImage,
  validateMeetingDetails,
} from './pod.validation';
import {
  assertPartnerVenue,
  bookOrHoldSlotForPod,
  resolveSlotForCreate,
  resolveVenueLocation,
  venueApprovalForCreate,
} from './pod.venue';
import {
  applyProductDeltas,
  assertMeetsMinPax,
  buildProductRequests,
  resolveClubCategory,
} from './pod.products';
import { insertPodWithFreeSlug, resolvePodSlugForCreate } from './pod.slug';
import {
  assertRequestReadyForPod,
  markPartnerRequestPodCreated,
} from '@modules/venues/podPartnerRequest/podPartnerRequest.lifecycle';
import {
  applyPodEditCore,
  applyRerouteState,
  applyResubmitPhysicalVenue,
  applyTicketDiscountForUpdate,
  claimRerouteSlot,
  holdOrBookForResubmit,
  HOST_RESUBMIT_BLOCKED_FIELDS,
  meetingFieldsForCreate,
  prepareSlotReroute,
  snapshotBooking,
  ticketDiscountForCreate,
} from './pod.edit';

const MEET_ALPHABET = 'abcdefghijklmnopqrstuvwxyz';

/** `length` lowercase letters from a CSPRNG (used for placeholder meeting codes). */
function randomAlpha(length: number): string {
  let out = '';
  for (let i = 0; i < length; i += 1) out += MEET_ALPHABET[randomInt(MEET_ALPHABET.length)];
  return out;
}

export const podWriteMethods = {
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
    opts?: {
      autoPodSlot?: { slotId: string; autoPodId: string };
      autoPodId?: string;
      partnerRequestSlot?: { slotId: string; requestId: string };
    }
  ) {
    const autoPodSlot = opts?.autoPodSlot ?? null;
    // A host↔venue Pod Request's confirmed slot, adopted like an Auto Pod's.
    const partnerRequestSlot = opts?.partnerRequestSlot ?? null;
    delete input.partner_request_id;
    // A VIRTUAL Auto Pod hands over no slot, but the pod is still its child.
    const autoPodId = opts?.autoPodId ?? autoPodSlot?.autoPodId ?? null;
    const { slug: pod_id, base: slugBase } = await resolvePodSlugForCreate(input);
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
    const ticketDiscount = await ticketDiscountForCreate(input);

    const { slotDoc, needsVenueApproval } = await resolveSlotForCreate(
      input,
      podMode,
      autoPodSlot?.autoPodId,
      partnerRequestSlot?.requestId
    );

    validateFutureDates(input.pod_date_time, input.pod_end_date_time, podMode === 'VIRTUAL');
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

    const doc = await insertPodWithFreeSlug(
      {
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
        ...ticketDiscount,
        // A pod awaiting the venue's slot approval stays offline until approved.
        is_active: needsVenueApproval ? false : input.is_active ?? true,
        venue_approval_status: venueApprovalForCreate(autoPodSlot ?? partnerRequestSlot, needsVenueApproval),
        source_auto_pod_id: autoPodId ? new Types.ObjectId(autoPodId) : null,
      },
      input.club_id,
      slugBase
    );

    await bookOrHoldSlotForPod(doc, slotDoc, needsVenueApproval, autoPodSlot, partnerRequestSlot);
    if (partnerRequestSlot) {
      // The pod exists and holds the slot; closing the request is bookkeeping and
      // must never undo that, so a failure here is logged, not thrown.
      markPartnerRequestPodCreated(partnerRequestSlot.requestId, String(doc._id)).catch((error: unknown) =>
        logs.server.error('pods', 'markPartnerRequestPodCreated', { error, pod_id: String(doc._id) })
      );
    }
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
    // Arriving from a Pod Request: only its host, only on its confirmed slot.
    const partnerRequestSlot = input.partner_request_id
      ? await assertRequestReadyForPod(userId, String(input.partner_request_id), input.venue_slot_id)
      : null;
    return this.create(
      { ...input, pod_mode: podMode, pod_hosts_id: [userId], pod_attendees: [userId] },
      { actorUserId: userId, source: 'HOST' },
      partnerRequestSlot ? { partnerRequestSlot } : undefined,
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
    // A portal may shrink a pod as well as grow it, but never past the space it
    // booked or below the seats already sold — the same range the host's slider
    // is drawn from, so the two cannot disagree.
    //
    // Skipped while the booking is being RE-ROUTED: the ceiling then belongs to
    // the slot being moved to, and `doc` still holds the one being left. That
    // path is unguarded exactly as it was before this rule existed.
    if (input.no_of_spots !== undefined && !reroute) {
      await assertSpotsWithinLimits(doc, input.no_of_spots, { canDecrease: true });
    }
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

  /**
   * The range this pod's capacity may be resized within, for this viewer.
   *
   * The host's Edit Pod sheet, the Club Admin console and Admin > Pod
   * Management all draw their slider from this one answer, and the writes below
   * are guarded by the same function — so a client can never offer a seat the
   * server would refuse.
   */
  async spotLimits(
    id: string,
    actor: Readonly<{ id: string; roles: string[]; isAdmin: boolean }>
  ): Promise<PodSpotLimits> {
    if (!Types.ObjectId.isValid(id)) {
      throw new GraphQLError('Invalid pod id', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const doc = await PodModel.findById(id);
    if (!doc) notFound();
    const isHost = (doc!.pod_hosts_id ?? []).some((hostId: any) => String(hostId) === actor.id);
    // A host who also administers the club is treated as a HOST — the stricter
    // of the two, so the increase-only rule is not skipped by an accident of
    // club membership. Same precedence the attendance board uses.
    if (isHost) return resolveSpotLimits(doc, { canDecrease: false });
    if (actor.isAdmin) return resolveSpotLimits(doc, { canDecrease: true });
    const { clubAdminService } = await import('@modules/clubs/clubAdmin/clubAdmin.service');
    // Throws FORBIDDEN itself when they are neither — one definition of
    // "admin of this club", shared with the attendance board.
    await clubAdminService.assertClubAdminForPod(actor, id);
    return resolveSpotLimits(doc, { canDecrease: true });
  },

  /** Host self-service edit — title, description, media and a bigger pod (2A). */
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
    // Flexible pod count: a host may grow a live pod up to the capacity of the
    // space it booked, so a pod published smaller than the venue allows is not
    // stuck that way. Only upwards — people already bought into this size.
    if (input.no_of_spots !== undefined && input.no_of_spots !== null) {
      await assertSpotsWithinLimits(doc, input.no_of_spots, { canDecrease: false });
      doc.no_of_spots = Math.floor(Number(input.no_of_spots) || 0);
    }
    // The host may set or change the multi-ticket discount on a live pod; it is
    // judged on the spots just applied above.
    await applyTicketDiscountForUpdate(doc, input);
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
