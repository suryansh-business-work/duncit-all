import { Schema, model, type InferSchemaType } from 'mongoose';

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
    max_ticket_price: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

export type LiteSettings = InferSchemaType<typeof settingsSchema>;
export const LiteSettingsModel = model('LiteSettings', settingsSchema, 'lite_settings');
