import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import {
  BouncerSosAlertModel,
  BouncerCallbackRequestModel,
  BouncerFeedbackModel,
  type BouncerSosStatus,
  type BouncerCallbackStatus,
  type BouncerFeedbackCategory,
} from './bouncer.model';
import { UserModel } from '@modules/access/user/user.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { PodMemberModel } from '@modules/pods/podMember/podMember.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { ClubModel } from '@modules/pods/club/club.model';
import { settingsService } from '@modules/platform/settings/settings.service';
import { notificationService } from '@modules/engagement/notification/notification.service';
import { getIo } from '@realtime/io';
import { ticketNo } from '@modules/support/supportChat/unifiedTickets.service';

const ADMIN_ROOM = 'admin:bouncers';

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
    'pod_title venue_id club_id pod_date_time'
  );
  if (!pod) return null;
  const [venue, club] = await Promise.all([
    pod.venue_id ? VenueModel.findById(pod.venue_id).select('venue_name') : null,
    pod.club_id ? ClubModel.findById(pod.club_id).select('club_name') : null,
  ]);
  return {
    id: String(pod._id),
    title: pod.pod_title,
    venue_id: pod.venue_id ? String(pod.venue_id) : null,
    venue_name: (venue as any)?.venue_name ?? null,
    club_id: pod.club_id ? String(pod.club_id) : null,
    club_name: (club as any)?.club_name ?? null,
    starts_at: pod.pod_date_time?.toISOString() ?? null,
  };
}

async function toSosPub(doc: any) {
  return {
    id: String(doc._id),
    ticket_no: doc.ticket_no || ticketNo('SOS', doc._id),
    user: (await buildActor(doc.user_id)) ?? { id: String(doc.user_id), name: 'User', phone: doc.contact_phone, avatar_url: null },
    host: await buildActor(doc.host_id),
    pod: (await buildPodInfo(doc.pod_id)) ?? { id: String(doc.pod_id), title: '(pod removed)', venue_id: null, venue_name: null, club_id: null, club_name: null, starts_at: null },
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
    pod: (await buildPodInfo(doc.pod_id)) ?? { id: String(doc.pod_id), title: '(pod removed)', venue_id: null, venue_name: null, club_id: null, club_name: null, starts_at: null },
    rating: doc.rating,
    category: doc.category,
    message: doc.message ?? '',
    created_at: doc.created_at?.toISOString?.() ?? '',
  };
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
    await notificationService.create(
      {
        title: opts.title,
        body: opts.body,
        scope: 'USER',
        target_user_ids: [opts.hostId],
        link_url: opts.link,
      },
      undefined
    );
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
    void notifyHost({
      hostId: hostId ? String(hostId) : null,
      title: `🚨 SOS ${pub.ticket_no} from ${pub.user.name}`,
      body: `At "${pub.pod.title}". ${pub.message || 'Tap to respond.'}`,
      link: `/bouncers?sos=${pub.id}`,
    });

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

  async listSos(status?: BouncerSosStatus, limit = 100) {
    const q: any = {};
    if (status) q.status = status;
    const docs = await BouncerSosAlertModel.find(q).sort({ created_at: -1 }).limit(limit);
    return Promise.all(docs.map(toSosPub));
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
    applyCallbackOutcome(doc!, outcome);
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
    applyCallbackOutcome(doc!, outcome);
    await doc!.save();
    const pub = await toCallbackPub(doc);
    emit('bouncer:callback_update', pub);
    return pub;
  },

  async listCallbacks(status?: BouncerCallbackStatus, limit = 100) {
    const q: any = {};
    if (status) q.status = status;
    const docs = await BouncerCallbackRequestModel.find(q).sort({ created_at: -1 }).limit(limit);
    return Promise.all(docs.map(toCallbackPub));
  },

  async listMyCallbacks(userId: string, limit = 100) {
    const docs = await BouncerCallbackRequestModel.find({ user_id: new Types.ObjectId(userId) })
      .sort({ created_at: -1 })
      .limit(Math.min(200, Math.max(1, limit)));
    return Promise.all(docs.map(toCallbackPub));
  },

  async submitFeedback(
    userId: string,
    input: { pod_id: string; rating: number; category: BouncerFeedbackCategory; message?: string }
  ) {
    if (input.rating < 1 || input.rating > 5) fail('BAD_USER_INPUT', 'Rating must be 1-5');
    const pod = await loadPodOrFail(input.pod_id);
    const hostId = (pod.pod_hosts_id?.[0] as any) ?? null;

    const doc = await BouncerFeedbackModel.create({
      user_id: new Types.ObjectId(userId),
      pod_id: pod._id,
      host_id: hostId,
      rating: input.rating,
      category: input.category,
      message: (input.message ?? '').trim(),
    });

    const pub = await toFeedbackPub(doc);
    emit('bouncer:feedback_new', pub, hostId ? String(hostId) : null);

    void notifyHost({
      hostId: hostId ? String(hostId) : null,
      title: `New ${input.rating}★ feedback on "${pub.pod.title}"`,
      body: pub.message
        ? `${input.category}: ${pub.message.slice(0, 120)}`
        : `Category: ${input.category}`,
      link: `/bouncers?feedback=${pub.id}`,
    });

    return pub;
  },

  async listFeedback(limit = 100) {
    const docs = await BouncerFeedbackModel.find().sort({ created_at: -1 }).limit(limit);
    return Promise.all(docs.map(toFeedbackPub));
  },

  /**
   * The most recently-attended pod the user has NOT yet rated — drives the
   * "how was the pod?" feedback pop-up shown on next login (Bug 6). A pod is
   * "attended" once it has been JOINED and its start time is in the past.
   */
  async getPendingPodFeedback(userId: string) {
    const uid = new Types.ObjectId(userId);
    const memberships = await PodMemberModel.find({ user_id: uid, status: 'JOINED' })
      .select('pod_id')
      .lean();
    if (memberships.length === 0) return null;
    const podIds = memberships.map((m) => m.pod_id);
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
