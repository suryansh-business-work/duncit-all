import { Schema, model, type Document, Types } from 'mongoose';

export type NotificationScope = 'GLOBAL' | 'LOCATION' | 'ZONE' | 'USER';

export interface INotification extends Document {
  title: string;
  body: string;
  image_url?: string | null;
  link_url?: string | null;
  scope: NotificationScope;
  location_id?: Types.ObjectId | null;
  zone_name?: string | null;
  target_user_ids: Types.ObjectId[];
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
    scope: { type: String, enum: ['GLOBAL', 'LOCATION', 'ZONE', 'USER'], required: true, default: 'GLOBAL' },
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
