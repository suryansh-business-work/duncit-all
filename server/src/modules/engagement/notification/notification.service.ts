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

let vapidReady = false;

const toPub = (n: INotification) => ({
  id: String(n._id),
  title: n.title,
  body: n.body,
  image_url: n.image_url ?? null,
  link_url: n.link_url ?? null,
  scope: n.scope,
  silent: !!n.silent,
  location_id: n.location_id ? String(n.location_id) : null,
  zone_name: n.zone_name ?? null,
  target_user_ids: (n.target_user_ids ?? []).map(String),
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
       
      console.log('🔔 Generated new VAPID keys');
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

  async resolveTargetUsers(input: {
    scope: NotificationScope;
    location_id?: string | null;
    zone_name?: string | null;
    target_user_ids?: string[] | null;
  }): Promise<string[]> {
    if (input.scope === 'USER') {
      return (input.target_user_ids ?? []).filter(Boolean);
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
      const chunk = messages.slice(i, i + 100);
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
        // eslint-disable-next-line no-console
        console.error('[notification] expo push failed:', err);
      }
    }
    return { delivered, failed };
  },

  async create(input: any, sentBy?: string) {
    if (!input.title?.trim()) throw new GraphQLError('Title required', { extensions: { code: 'BAD_USER_INPUT' } });
    if (!input.body?.trim()) throw new GraphQLError('Body required', { extensions: { code: 'BAD_USER_INPUT' } });
    if (input.scope === 'LOCATION' && !input.location_id)
      throw new GraphQLError('location_id required for LOCATION scope', { extensions: { code: 'BAD_USER_INPUT' } });
    if (input.scope === 'ZONE' && (!input.location_id || !input.zone_name))
      throw new GraphQLError('location_id and zone_name required for ZONE scope', { extensions: { code: 'BAD_USER_INPUT' } });
    if (input.scope === 'USER' && (!input.target_user_ids || input.target_user_ids.length === 0))
      throw new GraphQLError('target_user_ids required for USER scope', { extensions: { code: 'BAD_USER_INPUT' } });

    const userIds = await this.resolveTargetUsers(input);

    const doc = await NotificationModel.create({
      title: input.title.trim(),
      body: input.body.trim(),
      image_url: input.image_url || null,
      link_url: input.link_url || null,
      scope: input.scope,
      silent: !!input.silent,
      location_id: input.scope === 'GLOBAL' || input.scope === 'USER' ? null : input.location_id,
      zone_name: input.scope === 'ZONE' ? input.zone_name : null,
      target_user_ids: input.scope === 'USER' ? input.target_user_ids : [],
      sent_by: sentBy || null,
    });

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
    return docs.map((d) => toUserNotifPub(d as any)).filter((d) => d.notification);
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
