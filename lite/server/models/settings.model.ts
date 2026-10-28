import { Schema, model, type InferSchemaType } from 'mongoose';

/** The picture picker's starting topics; the console edits the list (Settings → General). */
export const DEFAULT_PICTURE_TOPICS: readonly string[] = ['Diwali', 'Holi', 'Christmas', 'New Year', 'Food', 'Party', 'Music', 'Sports', 'Fitness', 'Tech', 'Business', 'Art', 'Wellness', 'Nature', 'Travel', 'Pets'];

/** The one settings row (key `global`), seeded on boot and edited from the console. */
const settingsSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, default: 'global' },
    site_name: { type: String, default: 'Duncit Lite' },
    support_email: { type: String, default: 'support@duncit.com' },
    default_timezone: { type: String, default: 'Asia/Kolkata' },
    date_format: { type: String, default: 'dd MMM yyyy' },
    time_format: { type: String, default: 'hh:mm a' },
    currency: { type: String, default: 'INR' },
    sign_in_with_duncit: { type: Boolean, default: true },
    duncit_graphql_url: { type: String, default: '' },
    duncit_app_url: { type: String, default: '' },
    reminders_enabled: { type: Boolean, default: true },
    reminder_hours_before: { type: [Number], default: [24, 1] },
    upi_help_text: {
      type: String,
      default:
        'Pay the host on any UPI app using the ID or QR below, then paste the transaction reference (UTR). The host confirms it and your spot is held.',
    },
    admin_emails: { type: [String], default: [] },
    max_ticket_price: { type: Number, default: 0, min: 0 },
    /** The most seats one event may offer; a host's capacity is checked against it. */
    max_event_capacity: { type: Number, default: 10_000, min: 1 },
    /** The most seats one guest may take in a single registration. */
    max_seats_per_registration: { type: Number, default: 10, min: 1 },
    /** Offer "Use phone number" on sign-in (it also needs an MSG91 entry under Environment). */
    sign_in_with_phone: { type: Boolean, default: true },
    /** Stock-photo topics listed beside the picture picker's results; each one is searched on Pexels. */
    picture_topics: { type: [String], default: () => [...DEFAULT_PICTURE_TOPICS] },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

export type LiteSettings = InferSchemaType<typeof settingsSchema>;
export const LiteSettingsModel = model('LiteSettings', settingsSchema, 'lite_settings');
