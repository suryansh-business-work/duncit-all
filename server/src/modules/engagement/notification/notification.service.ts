import { GraphQLError } from 'graphql';
import webpush from 'web-push';
import { Types } from 'mongoose';
import {
  NotificationModel,
  type INotification,
  type NotificationScope,
  UserNotificationModel,
  type IUserNotification,
  PushSubscriptionModel,
  ExpoPushTokenModel,
  PushKeyModel,
} from './notification.model';
import { UserModel } from '@modules/access/user/user.model';
import { emitNotifyForUsers } from './notification.events';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import { logs } from '@observability/log';

let vapidReady = false;

const toPub = (n: INotification) => ({
  id: String(n._id),
  title: n.title,
  body: n.body,
  image_url: n.image_url ?? null,
  link_url: n.link_url ?? null,
  // The inline-action pair. Stored by create() and exposed by the schema, but
  // absent here until now — so every read returned action_type: null, the
  // Accept/Reject buttons gated themselves off, and a follow request rendered
  // as an ordinary "open me" row. `action_status` resolves off action_type, so
  // it was collateral: it returned null too.
  action_type: n.action_type ?? null,
  action_ref_id: n.action_ref_id ? String(n.action_ref_id) : null,
  action_actor_id: n.action_actor_id ? String(n.action_actor_id) : null,
  scope: n.scope,
  silent: !!n.silent,
  location_id: n.location_id ? String(n.location_id) : null,
  zone_name: n.zone_name ?? null,
  target_user_ids: (n.target_user_ids ?? []).map(String),
  audience_list_id: n.audience_list_id ? String(n.audience_list_id) : null,
  sent_by: n.sent_by ? String(n.sent_by) : null,
  delivered_count: n.delivered_count ?? 0,
  failed_count: n.failed_count ?? 0,
  created_at: n.created_at.toISOString(),
  updated_at: n.updated_at.toISOString(),
});

const toUserNotifPub = (un: IUserNotification & { notification_id: any }) => ({
  id: String(un._id),
  notification: un.notification_id && typeof un.notification_id === 'object' && '_id' in un.notification_id
    ? toPub(un.notification_id as INotification)
    : null,
  read_at: un.read_at ? un.read_at.toISOString() : null,
  created_at: un.created_at.toISOString(),
});

/** Allowlists for the shared table engine (notificationsTable — DUNCIT TABLE CONTRACT v1). */
const NOTIFICATION_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['title', 'body'],
  sortFields: {
    title: 'title',
    body: 'body',
    scope: 'scope',
    location_id: 'location_id',
    zone_name: 'zone_name',
    silent: 'silent',
    delivered_count: 'delivered_count',
    failed_count: 'failed_count',
    created_at: 'created_at',
  },
  filterFields: {
    scope: { type: 'enum' },
    silent: { type: 'boolean' },
    location_id: { type: 'string' },
    zone_name: { type: 'string' },
    delivered_count: { type: 'number' },
    failed_count: { type: 'number' },
    created_at: { type: 'date' },
  },
  defaultSort: { created_at: -1 },
};

interface ExpoMessage {
  to: string;
  sound: string;
  title: string;
  body: string;
  data: { id: string; link: string };
}

/** POST one chunk (≤100) of Expo messages and tally its receipts. */
async function sendExpoChunk(chunk: ExpoMessage[]): Promise<{ delivered: number; failed: number }> {
  let delivered = 0;
  let failed = 0;
  try {
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(chunk),
    });
    const json: any = await res.json().catch(() => ({}));
    const receipts: any[] = Array.isArray(json?.data) ? json.data : [];
    for (const [idx, receipt] of receipts.entries()) {
      if (receipt?.status === 'ok') {
        delivered++;
      } else {
        failed++;
        // Drop tokens Expo reports as no longer registered.
        if (receipt?.details?.error === 'DeviceNotRegistered' && chunk[idx]?.to) {
          ExpoPushTokenModel.deleteOne({ token: chunk[idx].to }).catch(() => undefined);
        }
      }
    }
  } catch (err) {
    failed += chunk.length;
    logs.server.error('notification', 'sendExpoChunk', {
      error: err,
      msg: 'expo push failed',
      chunk_size: chunk.length,
    });
  }
  return { delivered, failed };
}

/** Rejects a create() payload that is missing what its scope needs (BAD_USER_INPUT). */
function assertCreateInput(input: any) {
  if (!input.title?.trim()) throw new GraphQLError('Title required', { extensions: { code: 'BAD_USER_INPUT' } });
  if (!input.body?.trim()) throw new GraphQLError('Body required', { extensions: { code: 'BAD_USER_INPUT' } });
  if (input.scope === 'LOCATION' && !input.location_id)
    throw new GraphQLError('location_id required for LOCATION scope', { extensions: { code: 'BAD_USER_INPUT' } });
  if (input.scope === 'ZONE' && (!input.location_id || !input.zone_name))
    throw new GraphQLError('location_id and zone_name required for ZONE scope', { extensions: { code: 'BAD_USER_INPUT' } });
  if (input.scope === 'USER' && (!input.target_user_ids || input.target_user_ids.length === 0))
    throw new GraphQLError('target_user_ids required for USER scope', { extensions: { code: 'BAD_USER_INPUT' } });
  if (input.scope === 'AUDIENCE_LIST' && !input.audience_list_id)
    throw new GraphQLError('audience_list_id required for AUDIENCE_LIST scope', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
}

/** Shapes the Notification document for create(); targeting fields are nulled outside their scope. */
function toNotificationCreateDoc(input: any, sentBy?: string) {
  return {
    title: input.title.trim(),
    body: input.body.trim(),
    image_url: input.image_url || null,
    link_url: input.link_url || null,
    // Server-raised only: CreateNotificationInput does not expose these, so an
    // admin broadcast can never mint Accept/Reject buttons over a document.
    action_type: input.action_type || null,
    action_ref_id: input.action_ref_id || null,
    action_actor_id: input.action_actor_id || null,
    scope: input.scope,
    silent: !!input.silent,
    location_id: input.scope === 'LOCATION' || input.scope === 'ZONE' ? input.location_id : null,
    zone_name: input.scope === 'ZONE' ? input.zone_name : null,
    target_user_ids: input.scope === 'USER' ? input.target_user_ids : [],
    audience_list_id: input.scope === 'AUDIENCE_LIST' ? input.audience_list_id : null,
    sent_by: sentBy || null,
  };
}

export const notificationService = {
  async ensureVapid() {
    if (vapidReady) return;
    let key = await PushKeyModel.findOne({ key: 'default' });
    if (!key) {
      const { publicKey, privateKey } = webpush.generateVAPIDKeys();
      key = await PushKeyModel.create({
        key: 'default',
        publicKey,
        privateKey,
        subject: process.env.VAPID_SUBJECT || 'mailto:admin@duncit.app',
      });
      logs.server.info('notification', 'ensureVapid', {
        msg: 'Generated new VAPID keys',
      });
    }
    webpush.setVapidDetails(key.subject, key.publicKey, key.privateKey);
    vapidReady = true;
  },

  async getPublicKey() {
    await this.ensureVapid();
    const key = await PushKeyModel.findOne({ key: 'default' });
    return key?.publicKey ?? '';
  },

  async list(limit = 100) {
    const docs = await NotificationModel.find().sort({ created_at: -1 }).limit(limit);
    return docs.map(toPub);
  },

  /** Server-side table page (search/filter/sort/paginate) for notificationsTable. */
  async table(input?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery<INotification>(
      NotificationModel,
      {},
      input,
      NOTIFICATION_TABLE_CONFIG
    );
    return { rows: docs.map(toPub), total, page, page_size };
  },

  async resolveTargetUsers(input: {
    scope: NotificationScope;
    location_id?: string | null;
    zone_name?: string | null;
    target_user_ids?: string[] | null;
    audience_list_id?: string | null;
  }): Promise<string[]> {
    if (input.scope === 'USER') {
      return (input.target_user_ids ?? []).filter(Boolean);
    }
    if (input.scope === 'AUDIENCE_LIST') {
      // Resolved from the list's criteria at send time — a list built last
      // month reaches this month's matches.
      const { audienceListService } = await import('@modules/crm/marketing/audienceList.service');
      const ids = await audienceListService.memberIds(input.audience_list_id ?? '');
      return ids.map(String);
    }
    const q: any = { 'metadata.status': 'ACTIVE' };
    if (input.scope === 'LOCATION' && input.location_id) {
      q['profile.assigned_city'] = input.location_id;
    }
    if (input.scope === 'ZONE' && input.zone_name) {
      q['metadata.assigned_zones'] = input.zone_name;
    }
    const users = await UserModel.find(q).select('_id');
    return users.map((u) => String(u._id));
  },

  async fanOutPush(notif: INotification, userIds: string[]) {
    await this.ensureVapid();
    let delivered = 0;
    let failed = 0;
    if (userIds.length === 0) return { delivered, failed };

    const subs = await PushSubscriptionModel.find({
      user_id: { $in: userIds.map((id) => new Types.ObjectId(id)) },
    });

    const payload = JSON.stringify({
      id: String(notif._id),
      title: notif.title,
      body: notif.body,
      image: notif.image_url ?? undefined,
      link: notif.link_url ?? '/',
    });

    await Promise.all(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload
          );
          delivered++;
        } catch (e: any) {
          failed++;
          if (e?.statusCode === 404 || e?.statusCode === 410) {
            await PushSubscriptionModel.deleteOne({ _id: sub._id });
          }
        }
      })
    );

    const expo = await this.fanOutExpoPush(notif, userIds);
    return { delivered: delivered + expo.delivered, failed: failed + expo.failed };
  },

  /** Deliver to native devices via Expo's push service (chunks of 100). */
  async fanOutExpoPush(notif: INotification, userIds: string[]) {
    let delivered = 0;
    let failed = 0;
    if (userIds.length === 0) return { delivered, failed };
    const tokens = await ExpoPushTokenModel.find({
      user_id: { $in: userIds.map((id) => new Types.ObjectId(id)) },
    }).lean();
    if (tokens.length === 0) return { delivered, failed };

    const messages = tokens.map((t: any) => ({
      to: t.token as string,
      sound: 'default',
      title: notif.title,
      body: notif.body,
      data: { id: String(notif._id), link: notif.link_url ?? '/' },
    }));

    for (let i = 0; i < messages.length; i += 100) {
      const res = await sendExpoChunk(messages.slice(i, i + 100));
      delivered += res.delivered;
      failed += res.failed;
    }
    return { delivered, failed };
  },

  async create(input: any, sentBy?: string) {
    assertCreateInput(input);

    const userIds = await this.resolveTargetUsers(input);

    const doc = await NotificationModel.create(toNotificationCreateDoc(input, sentBy));

    // Determine in-app recipient list
    let inboxUserIds: string[] = userIds;
    if (input.scope === 'GLOBAL') {
      const all = await UserModel.find({ 'metadata.status': 'ACTIVE' }).select('_id');
      inboxUserIds = all.map((u) => String(u._id));
    }

    if (inboxUserIds.length > 0) {
      const ops = inboxUserIds.map((uid) => ({
        updateOne: {
          filter: { user_id: new Types.ObjectId(uid), notification_id: doc._id },
          update: { $setOnInsert: { user_id: new Types.ObjectId(uid), notification_id: doc._id, read_at: null } },
          upsert: true,
        },
      }));
      await UserNotificationModel.bulkWrite(ops);
      // Real-time SSE fan-out (no client polling required)
      emitNotifyForUsers(inboxUserIds, {
        kind: 'new',
        notification_id: String(doc._id),
        unread_count: -1,
      });
    }

    // Push fan-out (background but we await to record counts).
    // Silent notifications skip web-push entirely — they appear in the
    // in-app inbox only, with no system alert.
    const pushTargets = input.scope === 'GLOBAL' ? inboxUserIds : userIds;
    const { delivered, failed } = doc.silent
      ? { delivered: 0, failed: 0 }
      : await this.fanOutPush(doc, pushTargets);
    doc.delivered_count = delivered;
    doc.failed_count = failed;
    await doc.save();

    return toPub(doc);
  },

  async remove(id: string) {
    await UserNotificationModel.deleteMany({ notification_id: id });
    const res = await NotificationModel.findByIdAndDelete(id);
    return !!res;
  },

  /**
   * Drop every follow row `targetUserId` holds about `actorId`, inbox links
   * included. Called right before a new follow row about the same person is
   * written, so a relationship is ever ONE row in the inbox: a re-request
   * after a denial replaces "Denied", a re-follow after an unfollow replaces
   * the older "started following you". Two rows for one pair is how the inbox
   * ends up showing a stale outcome above a live request.
   */
  async removeFollowRowsAbout(targetUserId: string, actorId: string) {
    if (!Types.ObjectId.isValid(targetUserId) || !Types.ObjectId.isValid(actorId)) return;
    await this.removeRows({
      action_type: { $in: ['FOLLOW_REQUEST', 'NEW_FOLLOWER'] },
      action_actor_id: new Types.ObjectId(actorId),
      scope: 'USER',
      target_user_ids: new Types.ObjectId(targetUserId),
    });
  },

  /** Drop the rows raised over one actionable document — what a withdrawn
   * follow request does to the ask it had put in the owner's inbox. */
  async removeByActionRef(refId: string) {
    if (!Types.ObjectId.isValid(refId)) return;
    await this.removeRows({ action_ref_id: new Types.ObjectId(refId) });
  },

  async removeRows(filter: Record<string, unknown>) {
    const rows = await NotificationModel.find(filter).select('_id target_user_ids').lean();
    if (rows.length === 0) return;
    const ids = rows.map((r: any) => r._id);
    await Promise.all([
      UserNotificationModel.deleteMany({ notification_id: { $in: ids } }),
      NotificationModel.deleteMany({ _id: { $in: ids } }),
    ]);
    const affected = new Set<string>();
    for (const r of rows as any[]) {
      for (const uid of r.target_user_ids ?? []) affected.add(String(uid));
    }
    emitNotifyForUsers([...affected], { kind: 'update', unread_count: -1 });
  },

  async savePushSubscription(userId: string, input: { endpoint: string; p256dh: string; auth: string; user_agent?: string | null }) {
    await PushSubscriptionModel.updateOne(
      { endpoint: input.endpoint },
      {
        $set: {
          user_id: new Types.ObjectId(userId),
          endpoint: input.endpoint,
          p256dh: input.p256dh,
          auth: input.auth,
          user_agent: input.user_agent ?? null,
        },
      },
      { upsert: true }
    );
    return true;
  },

  async deletePushSubscription(endpoint: string) {
    await PushSubscriptionModel.deleteOne({ endpoint });
    return true;
  },

  /** Register/rebind a native Expo push token to the signed-in user. */
  async saveExpoPushToken(userId: string, token: string, platform?: string | null) {
    const clean = (token || '').trim();
    if (!clean) throw new GraphQLError('Push token is required', { extensions: { code: 'BAD_USER_INPUT' } });
    await ExpoPushTokenModel.updateOne(
      { token: clean },
      { $set: { user_id: new Types.ObjectId(userId), token: clean, platform: platform ?? null } },
      { upsert: true }
    );
    return true;
  },

  async deleteExpoPushToken(token: string) {
    await ExpoPushTokenModel.deleteOne({ token: (token || '').trim() });
    return true;
  },

  async listForUser(userId: string, limit = 50, unreadOnly = false) {
    const q: any = { user_id: new Types.ObjectId(userId) };
    if (unreadOnly) q.read_at = null;
    const docs = await UserNotificationModel.find(q)
      .sort({ created_at: -1 })
      .limit(limit)
      .populate('notification_id');
    // Drop rows whose notification was deleted (null) or is content-less — a
    // notification with a blank title and body renders as an empty card client-side.
    return docs
      .map((d) => toUserNotifPub(d))
      .filter((d) => d.notification && (d.notification.title.trim() !== '' || d.notification.body.trim() !== ''));
  },

  async unreadCountForUser(userId: string) {
    return UserNotificationModel.countDocuments({
      user_id: new Types.ObjectId(userId),
      read_at: null,
    });
  },

  async markRead(userId: string, userNotificationId: string) {
    await UserNotificationModel.updateOne(
      { _id: userNotificationId, user_id: new Types.ObjectId(userId) },
      { $set: { read_at: new Date() } }
    );
    emitNotifyForUsers([userId], { kind: 'read', unread_count: -1 });
    return true;
  },

  async markAllRead(userId: string) {
    await UserNotificationModel.updateMany(
      { user_id: new Types.ObjectId(userId), read_at: null },
      { $set: { read_at: new Date() } }
    );
    emitNotifyForUsers([userId], { kind: 'read_all', unread_count: 0 });
    return true;
  },
};
