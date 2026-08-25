import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { logs } from '@observability/log';
import {
  BouncerSosAlertModel,
  BouncerCallbackRequestModel,
  BouncerFeedbackModel,
  type BouncerSosStatus,
  type BouncerCallbackStatus,
  type BouncerFeedbackCategory,
  type IBouncerSosAlert,
  type IBouncerCallbackRequest,
} from './bouncer.model';
import {
  aspectsForPod,
  deriveCategory,
  normalizeRatings,
  summarizeForPod,
} from './bouncer.feedback';
import { UserModel } from '@modules/access/user/user.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { hasMarkedAttendance, markedPodIdsFor } from '@modules/pods/ticket/attendance.service';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { ClubModel } from '@modules/clubs/club/club.model';
import { settingsService } from '@modules/platform/settings/settings.service';
import { coinService } from '@modules/finance/coin/coin.service';
import { notificationService } from '@modules/engagement/notification/notification.service';
import { getIo } from '@realtime/io';
import { ticketNo } from '@modules/support/supportChat/unifiedTickets.service';
import {
  paginateDocs,
  supportSearchRegex,
  type SupportPageOpts,
} from '@modules/support/support.pagination';

const ADMIN_ROOM = 'admin:bouncers';

const BOUNCER_SORTABLE = new Set(['created_at', 'status', 'ticket_no', 'contact_phone']);

function fail(code: string, msg: string): never {
  throw new GraphQLError(msg, { extensions: { code } });
}

/** Record the agent's call outcome (duration + conclusion) when provided. */
function applyCallbackOutcome(
  doc: { duration_seconds: number | null; conclusion: string },
  outcome?: { duration_seconds?: number | null; conclusion?: string | null }
) {
  if (!outcome) return;
  if (typeof outcome.duration_seconds === 'number' && outcome.duration_seconds >= 0) {
    doc.duration_seconds = Math.round(outcome.duration_seconds);
  }
  if (typeof outcome.conclusion === 'string') {
    doc.conclusion = outcome.conclusion.trim();
  }
}

/**
 * Stamp a freshly-created doc with its human-readable reference. The number is
 * derived from the (unique) document id, so it is collision-free without a
 * shared counter — concurrency-safe by construction. Persisted on the doc and
 * returned so the create-time publish carries it.
 */
async function stampTicketNo(
  doc: { _id: unknown; ticket_no: string; save: () => Promise<unknown> },
  prefix: string
): Promise<string> {
  const no = ticketNo(prefix, doc._id as Types.ObjectId);
  doc.ticket_no = no;
  await doc.save();
  return no;
}

function emit(event: string, payload: any, hostId?: string | null) {
  try {
    const io = getIo();
    io.to(ADMIN_ROOM).emit(event, payload);
    if (hostId) io.to(`host:${hostId}`).emit(event, payload);
  } catch {
    // socket server not yet initialised — first request during bootstrap. Safe to skip.
  }
}

async function buildActor(userId: Types.ObjectId | null | undefined) {
  if (!userId) return null;
  const u = await UserModel.findById(userId).select(
    'profile.first_name profile.last_name profile.profile_photo auth.phone.number auth.phone.extension'
  );
  if (!u) return null;
  const num = u.auth?.phone?.number || '';
  const ext = u.auth?.phone?.extension
    ? `+${String(u.auth.phone.extension).replace(/^\+/, '')}`
    : '';
  return {
    id: String(u._id),
    name: `${u.profile?.first_name ?? ''} ${u.profile?.last_name ?? ''}`.trim() || 'User',
    phone: num ? `${ext}${num}` : null,
    avatar_url: u.profile?.profile_photo ?? null,
  };
}

async function buildPodInfo(podId: Types.ObjectId | null | undefined) {
  if (!podId) return null;
  const pod = await PodModel.findById(podId).select(
    'pod_title venue_id club_id pod_date_time pod_mode pod_hosts_id'
  );
  if (!pod) return null;
  const [venue, club, feedbackAspects] = await Promise.all([
    pod.venue_id ? VenueModel.findById(pod.venue_id).select('venue_name') : null,
    pod.club_id ? ClubModel.findById(pod.club_id).select('club_name') : null,
    aspectsForPod(pod as any),
  ]);
  return {
    id: String(pod._id),
    title: pod.pod_title,
    venue_id: pod.venue_id ? String(pod.venue_id) : null,
    venue_name: (venue as any)?.venue_name ?? null,
    club_id: pod.club_id ? String(pod.club_id) : null,
    club_name: (club as any)?.club_name ?? null,
    starts_at: pod.pod_date_time?.toISOString() ?? null,
    // What this pod can be rated on — the client asks exactly these, so the
    // rule lives on the server and neither app carries its own copy.
    feedback_aspects: feedbackAspects,
  };
}

/** A pod that has since been deleted, so an alert or a rating still renders. */
const missingPod = (podId: unknown) => ({
  id: String(podId),
  title: '(pod removed)',
  venue_id: null,
  venue_name: null,
  club_id: null,
  club_name: null,
  starts_at: null,
  feedback_aspects: [],
});

async function toSosPub(doc: any) {
  return {
    id: String(doc._id),
    ticket_no: doc.ticket_no || ticketNo('SOS', doc._id),
    user: (await buildActor(doc.user_id)) ?? { id: String(doc.user_id), name: 'User', phone: doc.contact_phone, avatar_url: null },
    host: await buildActor(doc.host_id),
    pod: (await buildPodInfo(doc.pod_id)) ?? missingPod(doc.pod_id),
    location: doc.location ?? null,
    message: doc.message ?? '',
    contact_phone: doc.contact_phone ?? '',
    status: doc.status,
    acknowledged_by_id: doc.acknowledged_by ? String(doc.acknowledged_by) : null,
    acknowledged_at: doc.acknowledged_at?.toISOString?.() ?? null,
    resolved_at: doc.resolved_at?.toISOString?.() ?? null,
    created_at: doc.created_at?.toISOString?.() ?? '',
  };
}

async function toCallbackPub(doc: any) {
  return {
    id: String(doc._id),
    ticket_no: doc.ticket_no || ticketNo('CB', doc._id),
    user: (await buildActor(doc.user_id)) ?? { id: String(doc.user_id), name: 'User', phone: doc.contact_phone, avatar_url: null },
    pod: await buildPodInfo(doc.pod_id),
    contact_phone: doc.contact_phone ?? '',
    reason: doc.reason ?? '',
    status: doc.status,
    contacted_at: doc.contacted_at?.toISOString?.() ?? null,
    duration_seconds: doc.duration_seconds ?? null,
    conclusion: doc.conclusion ?? '',
    created_at: doc.created_at?.toISOString?.() ?? '',
  };
}

async function toFeedbackPub(doc: any) {
  return {
    id: String(doc._id),
    user: (await buildActor(doc.user_id)) ?? { id: String(doc.user_id), name: 'User', phone: null, avatar_url: null },
    host: await buildActor(doc.host_id),
    pod: (await buildPodInfo(doc.pod_id)) ?? missingPod(doc.pod_id),
    rating: doc.rating,
    ratings: (doc.ratings ?? []).map((r: any) => ({ aspect: r.aspect, rating: r.rating })),
    category: doc.category,
    message: doc.message ?? '',
    created_at: doc.created_at?.toISOString?.() ?? '',
  };
}

/**
 * The one door onto a pod's rating: the host marked this person present.
 *
 * Both the form and the submit ask it, because the link outlives the evening
 * and gets forwarded — a read that allowed what the write refuses would only
 * be a form that throws when someone finally uses it.
 */
async function assertAttended(userId: string, podId: string) {
  if (await hasMarkedAttendance(podId, userId)) return;
  fail('FORBIDDEN', 'Only an attendee the host has marked present can rate this pod');
}

async function loadPodOrFail(podId: string) {
  if (!Types.ObjectId.isValid(podId)) fail('BAD_USER_INPUT', 'Invalid pod_id');
  const pod = await PodModel.findById(podId);
  if (!pod) fail('NOT_FOUND', 'Pod not found');
  return pod!;
}

async function notifyHost(opts: { hostId: string | null; title: string; body: string; link: string }) {
  if (!opts.hostId) return;
  try {
    await notificationService.create({
      title: opts.title,
      body: opts.body,
      scope: 'USER',
      target_user_ids: [opts.hostId],
      link_url: opts.link,
    });
  } catch {
    // Notification failure must not block the SOS / feedback write.
  }
}

export const bouncerService = {
  async getSupportTarget() {
    const branding = await settingsService.getBranding();
    const phone = (branding as any)?.support_phone || '';
    return { phone, available: !!phone };
  },

  async raiseSos(userId: string, input: { pod_id: string; message?: string; location?: { lat: number; lng: number; accuracy?: number | null } | null }) {
    const pod = await loadPodOrFail(input.pod_id);
    const user = await UserModel.findById(userId).select(
      'profile.first_name auth.phone.number auth.phone.extension'
    );
    if (!user) fail('UNAUTHENTICATED', 'User not found');
    const num = user!.auth?.phone?.number || '';
    const ext = user!.auth?.phone?.extension
      ? `+${String(user!.auth.phone.extension).replace(/^\+/, '')}`
      : '';
    const phone = num ? `${ext}${num}` : '';

    const hostId = (pod.pod_hosts_id?.[0] as any) ?? null;

    const doc = await BouncerSosAlertModel.create({
      user_id: new Types.ObjectId(userId),
      pod_id: pod._id,
      host_id: hostId,
      venue_id: pod.venue_id ?? null,
      club_id: pod.club_id ?? null,
      location: input.location ?? null,
      message: (input.message ?? '').trim(),
      contact_phone: phone,
      status: 'ACTIVE',
    });
    await stampTicketNo(doc, 'SOS');

    const pub = await toSosPub(doc);
    emit('bouncer:sos_new', pub, hostId ? String(hostId) : null);

    // Fire-and-forget: the user needs an immediate ACK on their SOS button,
    // and push fan-out can take seconds. Failures are already swallowed inside.
    notifyHost({
      hostId: hostId ? String(hostId) : null,
      title: `🚨 SOS ${pub.ticket_no} from ${pub.user.name}`,
      body: `At "${pub.pod.title}". ${pub.message || 'Tap to respond.'}`,
      link: `/bouncers?sos=${pub.id}`,
    }).catch((e) =>
      logs.server.error('bouncer', 'raiseSos', {
        error: e,
        msg: 'SOS notify failed',
        sosId: pub.id,
        ticketNo: pub.ticket_no,
      })
    );

    return pub;
  },

  async acknowledgeSos(adminId: string, id: string) {
    if (!Types.ObjectId.isValid(id)) fail('BAD_USER_INPUT', 'Invalid id');
    const doc = await BouncerSosAlertModel.findById(id);
    if (!doc) fail('NOT_FOUND', 'SOS not found');
    if (doc!.status === 'RESOLVED') fail('BAD_REQUEST', 'Already resolved');
    doc!.status = 'ACKNOWLEDGED';
    doc!.acknowledged_by = new Types.ObjectId(adminId);
    doc!.acknowledged_at = new Date();
    await doc!.save();
    const pub = await toSosPub(doc);
    emit('bouncer:sos_update', pub, doc!.host_id ? String(doc!.host_id) : null);
    return pub;
  },

  async resolveSos(adminId: string, id: string) {
    if (!Types.ObjectId.isValid(id)) fail('BAD_USER_INPUT', 'Invalid id');
    const doc = await BouncerSosAlertModel.findById(id);
    if (!doc) fail('NOT_FOUND', 'SOS not found');
    doc!.status = 'RESOLVED';
    doc!.resolved_by = new Types.ObjectId(adminId);
    doc!.resolved_at = new Date();
    if (!doc!.acknowledged_at) {
      doc!.acknowledged_by = new Types.ObjectId(adminId);
      doc!.acknowledged_at = new Date();
    }
    await doc!.save();
    const pub = await toSosPub(doc);
    emit('bouncer:sos_update', pub, doc!.host_id ? String(doc!.host_id) : null);
    return pub;
  },

  async listSos(opts: { status?: BouncerSosStatus } & SupportPageOpts = {}) {
    const q: any = {};
    if (opts.status) q.status = opts.status;
    if (opts.search) {
      const rx = supportSearchRegex(opts.search);
      q.$or = [{ message: rx }, { contact_phone: rx }];
    }
    const { docs, total, page, page_size } = await paginateDocs<IBouncerSosAlert>(
      BouncerSosAlertModel,
      q,
      opts,
      BOUNCER_SORTABLE,
      { created_at: -1 }
    );
    const items = await Promise.all(docs.map(toSosPub));
    return { items, total, page, page_size };
  },

  async getSos(id: string) {
    if (!Types.ObjectId.isValid(id)) return null;
    const doc = await BouncerSosAlertModel.findById(id);
    return doc ? toSosPub(doc) : null;
  },

  async getMyActiveSos(userId: string, podId: string) {
    if (!Types.ObjectId.isValid(podId)) return null;
    const doc = await BouncerSosAlertModel.findOne({
      user_id: new Types.ObjectId(userId),
      pod_id: new Types.ObjectId(podId),
      status: { $in: ['ACTIVE', 'ACKNOWLEDGED'] },
    }).sort({ created_at: -1 });
    return doc ? toSosPub(doc) : null;
  },

  async requestCallback(userId: string, input: { pod_id?: string | null; reason?: string }) {
    const user = await UserModel.findById(userId).select(
      'profile.first_name auth.phone.number auth.phone.extension'
    );
    if (!user) fail('UNAUTHENTICATED', 'User not found');
    const num = user!.auth?.phone?.number || '';
    const ext = user!.auth?.phone?.extension
      ? `+${String(user!.auth.phone.extension).replace(/^\+/, '')}`
      : '';
    const phone = num ? `${ext}${num}` : '';
    if (!phone) fail('BAD_USER_INPUT', 'No phone number on profile');

    let podId: Types.ObjectId | null = null;
    let hostId: Types.ObjectId | null = null;
    if (input.pod_id && Types.ObjectId.isValid(input.pod_id)) {
      const pod = await PodModel.findById(input.pod_id).select('pod_hosts_id');
      if (pod) {
        podId = pod._id as any;
        hostId = (pod.pod_hosts_id?.[0] as any) ?? null;
      }
    }

    const doc = await BouncerCallbackRequestModel.create({
      user_id: new Types.ObjectId(userId),
      pod_id: podId,
      host_id: hostId,
      contact_phone: phone,
      reason: (input.reason ?? '').trim(),
      status: 'PENDING',
    });
    await stampTicketNo(doc, 'CB');

    const pub = await toCallbackPub(doc);
    emit('bouncer:callback_new', pub);
    return pub;
  },

  async markCallbackContacted(
    adminId: string,
    id: string,
    outcome?: { duration_seconds?: number | null; conclusion?: string | null }
  ) {
    if (!Types.ObjectId.isValid(id)) fail('BAD_USER_INPUT', 'Invalid id');
    const doc = await BouncerCallbackRequestModel.findById(id);
    if (!doc) fail('NOT_FOUND', 'Callback not found');
    doc!.status = 'CONTACTED';
    doc!.contacted_by = new Types.ObjectId(adminId);
    doc!.contacted_at = new Date();
    applyCallbackOutcome(doc, outcome);
    await doc!.save();
    const pub = await toCallbackPub(doc);
    emit('bouncer:callback_update', pub);
    return pub;
  },

  async closeCallback(
    adminId: string,
    id: string,
    outcome?: { duration_seconds?: number | null; conclusion?: string | null }
  ) {
    if (!Types.ObjectId.isValid(id)) fail('BAD_USER_INPUT', 'Invalid id');
    const doc = await BouncerCallbackRequestModel.findById(id);
    if (!doc) fail('NOT_FOUND', 'Callback not found');
    doc!.status = 'CLOSED';
    if (!doc!.contacted_at) {
      doc!.contacted_by = new Types.ObjectId(adminId);
      doc!.contacted_at = new Date();
    }
    applyCallbackOutcome(doc, outcome);
    await doc!.save();
    const pub = await toCallbackPub(doc);
    emit('bouncer:callback_update', pub);
    return pub;
  },

  async listCallbacks(opts: { status?: BouncerCallbackStatus } & SupportPageOpts = {}) {
    const q: any = {};
    if (opts.status) q.status = opts.status;
    if (opts.search) {
      const rx = supportSearchRegex(opts.search);
      q.$or = [{ reason: rx }, { contact_phone: rx }];
    }
    const { docs, total, page, page_size } = await paginateDocs<IBouncerCallbackRequest>(
      BouncerCallbackRequestModel,
      q,
      opts,
      BOUNCER_SORTABLE,
      { created_at: -1 }
    );
    const items = await Promise.all(docs.map(toCallbackPub));
    return { items, total, page, page_size };
  },

  async getCallback(id: string) {
    if (!Types.ObjectId.isValid(id)) return null;
    const doc = await BouncerCallbackRequestModel.findById(id);
    return doc ? toCallbackPub(doc) : null;
  },

  async listMyCallbacks(userId: string, limit = 100) {
    const docs = await BouncerCallbackRequestModel.find({ user_id: new Types.ObjectId(userId) })
      .sort({ created_at: -1 })
      .limit(Math.min(200, Math.max(1, limit)));
    return Promise.all(docs.map(toCallbackPub));
  },

  async submitFeedback(
    userId: string,
    input: {
      pod_id: string;
      rating: number;
      category?: BouncerFeedbackCategory | null;
      message?: string;
      ratings?: Array<{ aspect: string; rating: number }> | null;
    }
  ) {
    if (input.rating < 1 || input.rating > 5) fail('BAD_USER_INPUT', 'Rating must be 1-5');
    const pod = await loadPodOrFail(input.pod_id);
    await assertAttended(userId, String(pod._id));
    const hostId = (pod.pod_hosts_id?.[0] as any) ?? null;

    // Only the parts this pod actually has are kept — a rating for a venue a
    // virtual pod never had would be a number nobody could act on.
    const ratings = normalizeRatings(input.ratings, await aspectsForPod(pod as any));
    const where = { user_id: new Types.ObjectId(userId), pod_id: pod._id };
    const already = await BouncerFeedbackModel.exists(where);

    // A guest has one opinion of a pod, not a new one per visit to the form —
    // so re-rating rewrites what they said. That is what lets the shared
    // feedback link open filled in and still be changeable.
    const doc = await BouncerFeedbackModel.findOneAndUpdate(
      where,
      {
        $set: {
          host_id: hostId,
          rating: input.rating,
          ratings,
          // Asking "what is this about?" separately is asking the guest to do
          // the triage: the weakest score already says it.
          category: input.category ?? deriveCategory(ratings),
          message: (input.message ?? '').trim(),
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    // Rating a pod you turned up to earns Duncit Coins, at whatever rate
    // Finance has set. Keyed on the RATING rather than on this request, so
    // editing an answer later never pays for it twice — which is why it is not
    // hidden behind the `already` check the host notification uses: two taps
    // racing each other both read `already` as false, and only the index knows
    // better. A failure here must not lose the rating that has already been
    // written, so it is logged rather than thrown.
    await coinService
      .creditForPodFeedback({
        userId,
        feedbackId: String(doc._id),
        reason: `Feedback on "${pod.pod_title}"`,
      })
      .catch((e) =>
        logs.server.error('bouncer', 'submitFeedback', {
          error: e,
          msg: 'Pod feedback coin reward failed',
          feedbackId: String(doc._id),
        })
      );

    const pub = await toFeedbackPub(doc);
    emit('bouncer:feedback_new', pub, hostId ? String(hostId) : null);

    // Only the first rating pings the host. Someone tidying up their stars
    // half an hour later is not news, and would read as a second review.
    if (!already) {
      notifyHost({
        hostId: hostId ? String(hostId) : null,
        title: `New ${input.rating}★ feedback on "${pub.pod.title}"`,
        // The stored category, not the sent one — it is usually derived.
        body: pub.message
          ? `${pub.category}: ${pub.message.slice(0, 120)}`
          : `Category: ${pub.category}`,
        link: `/bouncers?feedback=${pub.id}`,
      }).catch((e) =>
        logs.server.error('bouncer', 'submitFeedback', {
          error: e,
          msg: 'Feedback notify failed',
          feedbackId: pub.id,
        })
      );
    }

    return pub;
  },

  /**
   * Everything the standalone feedback page needs for one pod: the parts it
   * can be rated on, and whatever this guest already said about it.
   *
   * The second half is the point — a host shares one link, and a guest who
   * follows it twice sees their own stars rather than an empty form that would
   * quietly replace them.
   */
  async getPodFeedbackForm(userId: string, podId: string) {
    if (!Types.ObjectId.isValid(podId)) fail('BAD_USER_INPUT', 'Invalid pod_id');
    const pod = await buildPodInfo(new Types.ObjectId(podId));
    if (!pod) fail('NOT_FOUND', 'Pod not found');

    // The link is pasted into a group chat, so the page itself has to say who
    // may answer it. Anyone else is told why, rather than shown a form the
    // submit is going to refuse.
    const can_rate = await hasMarkedAttendance(podId, userId);
    const mine = can_rate
      ? await BouncerFeedbackModel.findOne({
          user_id: new Types.ObjectId(userId),
          pod_id: new Types.ObjectId(podId),
        }).lean()
      : null;

    return {
      pod: pod,
      can_rate,
      mine: mine
        ? {
            rating: mine.rating,
            ratings: mine.ratings.map((r) => ({ aspect: r.aspect, rating: r.rating })),
            message: mine.message,
            created_at: mine.created_at.toISOString(),
            updated_at: mine.updated_at.toISOString(),
          }
        : null,
    };
  },

  async listFeedback(limit = 100) {
    const docs = await BouncerFeedbackModel.find().sort({ created_at: -1 }).limit(limit);
    return Promise.all(docs.map(toFeedbackPub));
  },

  /**
   * Everything guests said about ONE pod — the averages per part plus the most
   * recent ratings themselves, which is what the admin pod page shows.
   */
  async podFeedback(podId: string, limit = 20) {
    if (!Types.ObjectId.isValid(podId)) fail('BAD_USER_INPUT', 'Invalid pod_id');
    const [summary, docs] = await Promise.all([
      summarizeForPod(podId),
      BouncerFeedbackModel.find({ pod_id: new Types.ObjectId(podId) })
        .sort({ created_at: -1 })
        .limit(Math.min(100, Math.max(1, limit))),
    ]);
    return {
      pod_id: podId,
      total: summary.total,
      overall_average: summary.overall_average,
      aspects: summary.aspects,
      recent: await Promise.all(docs.map(toFeedbackPub)),
    };
  },

  /**
   * The most recently-attended pod the user has NOT yet rated — drives the
   * "how was the pod?" feedback pop-up shown on next login (Bug 6). "Attended"
   * is the host's mark and not a booking, the same rule the shared link runs
   * on: prompting someone who cannot submit would open a form that throws.
   */
  async getPendingPodFeedback(userId: string) {
    const uid = new Types.ObjectId(userId);
    const podIds = await markedPodIdsFor(userId);
    if (podIds.length === 0) return null;
    const fed = await BouncerFeedbackModel.find({ user_id: uid, pod_id: { $in: podIds } })
      .select('pod_id')
      .lean();
    const rated = new Set(fed.map((f) => String(f.pod_id)));
    const pending = podIds.filter((p) => !rated.has(String(p)));
    if (pending.length === 0) return null;
    const pod = await PodModel.findOne({
      _id: { $in: pending },
      pod_date_time: { $lt: new Date() },
    })
      .sort({ pod_date_time: -1 })
      .select('_id');
    return pod ? buildPodInfo(pod._id as Types.ObjectId) : null;
  },
};
