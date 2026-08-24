import { Schema, model, type Document, Types } from 'mongoose';

export type NotificationScope = 'GLOBAL' | 'LOCATION' | 'ZONE' | 'USER' | 'AUDIENCE_LIST';

/** Notifications the recipient can ACT on from the inbox, rather than only read.
 * The client renders the matching buttons; the server owns what they do.
 *
 * NEW_FOLLOWER carries no document to answer — its whole action is Follow
 * Back. It exists because a PUBLIC profile never receives a follow request,
 * so "X started following you" is the only row it ever gets about a new
 * follower, and an inbox that cannot act on it cannot follow anybody back. */
export type NotificationAction = 'FOLLOW_REQUEST' | 'NEW_FOLLOWER';

export interface INotification extends Document {
  title: string;
  body: string;
  image_url?: string | null;
  link_url?: string | null;
  /** Set when this row carries inline actions (e.g. Accept / Reject, Follow Back). */
  action_type?: NotificationAction | null;
  /** Document the action operates on — a FollowRequest id for FOLLOW_REQUEST. */
  action_ref_id?: Types.ObjectId | null;
  /** The OTHER user this row is about — the requester behind a FOLLOW_REQUEST,
   * the new follower behind a NEW_FOLLOWER. It is what a Follow Back acts on,
   * so it is stored rather than re-derived: the row must still know its actor
   * after the document behind action_ref_id has been answered, and a
   * NEW_FOLLOWER row has no document to re-derive it from at all. */
  action_actor_id?: Types.ObjectId | null;
  scope: NotificationScope;
  silent: boolean;
  location_id?: Types.ObjectId | null;
  zone_name?: string | null;
  target_user_ids: Types.ObjectId[];
  audience_list_id?: Types.ObjectId | null;
  sent_by?: Types.ObjectId | null;
  delivered_count: number;
  failed_count: number;
  created_at: Date;
  updated_at: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true, trim: true },
    image_url: { type: String, default: null },
    link_url: { type: String, default: null },
    action_type: { type: String, enum: ['FOLLOW_REQUEST', 'NEW_FOLLOWER'], default: null },
    action_ref_id: { type: Schema.Types.ObjectId, default: null },
    action_actor_id: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    scope: {
      type: String,
      enum: ['GLOBAL', 'LOCATION', 'ZONE', 'USER', 'AUDIENCE_LIST'],
      required: true,
      default: 'GLOBAL',
    },
    /** AUDIENCE_LIST scope only: the saved marketing list to send to. Its
     * members are recomputed at send time, never frozen onto this row. */
    audience_list_id: { type: Schema.Types.ObjectId, ref: 'AudienceList', default: null },
    silent: { type: Boolean, default: false },
    location_id: { type: Schema.Types.ObjectId, ref: 'Location', default: null },
    zone_name: { type: String, default: null, trim: true },
    target_user_ids: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    sent_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    delivered_count: { type: Number, default: 0 },
    failed_count: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

notificationSchema.index({ created_at: -1 });

export const NotificationModel = model<INotification>('Notification', notificationSchema);

export interface IUserNotification extends Document {
  user_id: Types.ObjectId;
  notification_id: Types.ObjectId;
  read_at?: Date | null;
  created_at: Date;
}

const userNotificationSchema = new Schema<IUserNotification>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    notification_id: { type: Schema.Types.ObjectId, ref: 'Notification', required: true },
    read_at: { type: Date, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

userNotificationSchema.index({ user_id: 1, created_at: -1 });
userNotificationSchema.index({ user_id: 1, notification_id: 1 }, { unique: true });

export const UserNotificationModel = model<IUserNotification>('UserNotification', userNotificationSchema);

export interface IPushSubscription extends Document {
  user_id: Types.ObjectId;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent?: string | null;
  created_at: Date;
  updated_at: Date;
}

const pushSubscriptionSchema = new Schema<IPushSubscription>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    endpoint: { type: String, required: true, unique: true },
    p256dh: { type: String, required: true },
    auth: { type: String, required: true },
    user_agent: { type: String, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const PushSubscriptionModel = model<IPushSubscription>('PushSubscription', pushSubscriptionSchema);

/** Native (Expo) push token per device — used to deliver push to iOS/Android. */
export interface IExpoPushToken extends Document {
  user_id: Types.ObjectId;
  token: string;
  platform?: string | null;
  created_at: Date;
  updated_at: Date;
}

const expoPushTokenSchema = new Schema<IExpoPushToken>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    token: { type: String, required: true, unique: true },
    platform: { type: String, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const ExpoPushTokenModel = model<IExpoPushToken>('ExpoPushToken', expoPushTokenSchema);

export interface IPushKey extends Document {
  key: string;
  publicKey: string;
  privateKey: string;
  subject: string;
}

const pushKeySchema = new Schema<IPushKey>({
  key: { type: String, required: true, unique: true, default: 'default' },
  publicKey: { type: String, required: true },
  privateKey: { type: String, required: true },
  subject: { type: String, required: true, default: 'mailto:admin@duncit.app' },
});

export const PushKeyModel = model<IPushKey>('PushKey', pushKeySchema);
