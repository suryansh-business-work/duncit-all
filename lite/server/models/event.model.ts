import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

export const EVENT_STATUSES = ['DRAFT', 'PUBLISHED', 'CANCELLED'] as const;
export const VISIBILITIES = ['PUBLIC', 'UNLISTED', 'PRIVATE'] as const;
export const LOCATION_TYPES = ['IN_PERSON', 'VIRTUAL'] as const;
export const QUESTION_TYPES = ['TEXT', 'LONG_TEXT', 'CHECKBOX', 'SELECT'] as const;
export const HOST_ROLES = ['HOST', 'CO_HOST'] as const;
/** How the event page dresses itself; the colours behind each key live in the web app's tokens. */
export const EVENT_THEMES = ['MINIMAL', 'GRADIENT', 'AMBIENT', 'PATTERN', 'CONFETTI'] as const;
export const THEME_ACCENTS = ['DEFAULT', 'RED', 'ORANGE', 'AMBER', 'GREEN', 'TEAL', 'BLUE', 'PURPLE', 'PINK'] as const;
export type EventTheme = (typeof EVENT_THEMES)[number];
export type ThemeAccent = (typeof THEME_ACCENTS)[number];

const themeSchema = new Schema(
  {
    key: { type: String, enum: EVENT_THEMES, default: 'MINIMAL' },
    accent: { type: String, enum: THEME_ACCENTS, default: 'DEFAULT' },
  },
  { _id: false },
);

const ticketSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    price: { type: Number, default: 0, min: 0 },
    quantity: { type: Number, default: null, min: 1 },
    sold: { type: Number, default: 0, min: 0 },
    is_active: { type: Boolean, default: true },
  },
  { _id: true },
);

const questionSchema = new Schema(
  {
    label: { type: String, required: true, trim: true },
    type: { type: String, enum: QUESTION_TYPES, default: 'TEXT' },
    required: { type: Boolean, default: false },
    options: { type: [String], default: [] },
  },
  { _id: true },
);

const hostSchema = new Schema(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'LiteUser', required: true },
    role: { type: String, enum: HOST_ROLES, default: 'HOST' },
  },
  { _id: false },
);

/**
 * An event page. Tickets and questions are embedded — they have no life apart
 * from the event — while registrations are their own collection because a
 * guest list is read and written far more often than the page is.
 */
const eventSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    cover_url: { type: String, default: '' },
    start_at: { type: Date, required: true, index: true },
    end_at: { type: Date, required: true, index: true },
    timezone: { type: String, default: 'Asia/Kolkata' },
    location_type: { type: String, enum: LOCATION_TYPES, default: 'IN_PERSON' },
    address: { type: String, default: '' },
    venue_name: { type: String, default: '' },
    map_url: { type: String, default: '' },
    /** The place picked from Google's search, so the page can draw its map; null when typed by hand. */
    place_id: { type: String, default: '' },
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
    city_slug: { type: String, default: '', index: true },
    virtual_link: { type: String, default: '' },
    category_id: { type: Schema.Types.ObjectId, ref: 'LiteCategory', default: null, index: true },
    calendar_id: { type: Schema.Types.ObjectId, ref: 'LiteCalendar', default: null, index: true },
    hosts: { type: [hostSchema], default: [] },
    visibility: { type: String, enum: VISIBILITIES, default: 'PUBLIC', index: true },
    status: { type: String, enum: EVENT_STATUSES, default: 'DRAFT', index: true },
    capacity: { type: Number, default: null, min: 1 },
    require_approval: { type: Boolean, default: false },
    /** A host can close registration without cancelling: the page stays up, the button goes. */
    registration_open: { type: Boolean, default: true },
    theme: { type: themeSchema, default: () => ({}) },
    tickets: { type: [ticketSchema], default: [] },
    questions: { type: [questionSchema], default: [] },
    upi_id: { type: String, default: '' },
    upi_name: { type: String, default: '' },
    featured: { type: Boolean, default: false, index: true },
    hidden: { type: Boolean, default: false, index: true },
    going_count: { type: Number, default: 0 },
    published_at: { type: Date, default: null },
    cancelled_at: { type: Date, default: null },
    cancel_reason: { type: String, default: '' },
    /** Reminder hours already sent, so the scheduler never repeats one. */
    reminders_sent: { type: [Number], default: [] },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

eventSchema.index({ 'hosts.user_id': 1, start_at: -1 });
eventSchema.index({ status: 1, visibility: 1, hidden: 1, start_at: 1 });
eventSchema.index({ title: 'text', description: 'text', venue_name: 'text' });

export type LiteEvent = InferSchemaType<typeof eventSchema>;
export type LiteEventDoc = HydratedDocument<LiteEvent>;
export const LiteEventModel = model('LiteEvent', eventSchema, 'lite_events');
