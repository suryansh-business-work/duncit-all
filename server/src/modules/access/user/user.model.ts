import { Schema, model, InferSchemaType, type HydratedDocument } from 'mongoose';
import { STATUSES } from './user.constants';

// Nested storage. Keep one-to-one + bounded data embedded (auth, profile,
// pet_profile, metadata, counters, security, communication). Unbounded
// relations live in their own collections — see ./relations/*.model.ts.
//
// Counters in users.counters are the source of truth for hot reads. They are
// updated atomically ($inc) in the same write as the relation insert/delete.

const petProfileSchema = new Schema(
  {
    name: { type: String, trim: true },
    species: { type: String, trim: true },
    breed: { type: String, trim: true },
    age: { type: Number, min: 0 },
    photo_url: { type: String, trim: true },
    bio: { type: String, trim: true, maxlength: 500 },
  },
  { _id: false }
);

const profileLinkSchema = new Schema(
  {
    label: { type: String, required: true, trim: true, maxlength: 40 },
    url: { type: String, required: true, trim: true, maxlength: 2048 },
  },
  { _id: false }
);

const phoneSchema = new Schema(
  {
    number: { type: String, required: true, trim: true },
    extension: { type: String, required: true, trim: true },
    is_verified: { type: Boolean, default: false },
  },
  { _id: false }
);

const authSchema = new Schema(
  {
    email: { type: String, lowercase: true, trim: true },
    is_email_verified: { type: Boolean, default: false },
    email_verification_otp_hash: { type: String, select: false },
    email_verification_otp_expires_at: { type: Date, select: false },
    password_reset_otp_hash: { type: String, select: false },
    password_reset_otp_expires_at: { type: Date, select: false },
    password_change_otp_hash: { type: String, select: false },
    password_change_otp_expires_at: { type: Date, select: false },
    account_deletion_otp_hash: { type: String, select: false },
    account_deletion_otp_expires_at: { type: Date, select: false },
    password: { type: String, select: false },
    google_id: { type: String },
    last_login_provider: { type: String, enum: ['EMAIL', 'GOOGLE', null], default: null },
    last_login_at: { type: Date, default: null },
    // Optional: phone is no longer collected at signup. When present, the
    // phoneSchema still requires number+extension. Absent docs are excluded
    // from the unique phone index via its partialFilterExpression.
    phone: { type: phoneSchema, required: false },
  },
  { _id: false }
);

const profileSchema = new Schema(
  {
    first_name: { type: String, required: true, trim: true },
    // Optional: simplified signup collects a single "Name"; surname may be empty.
    last_name: { type: String, required: false, trim: true },
    // Optional: token-only Google signup creates the account before dob is known.
    dob: { type: Date, required: false },
    country: { type: String, default: 'India' },
    profile_photo: { type: String },
    bio: { type: String, maxlength: 500 },
    locale: { type: String, default: 'en-IN' },
    timezone: { type: String, default: 'Asia/Kolkata' },
    city: { type: String },
    state: { type: String },
    pincode: { type: String },
    zone: { type: String },
    assigned_city: { type: String },
    // The location the user last picked in the header (persists their choice
    // across sessions/devices). References platform locations; null = unset.
    selected_location_id: { type: Schema.Types.ObjectId, ref: 'Location', default: null },
  },
  { _id: false }
);

const communicationSchema = new Schema(
  {
    whatsapp: new Schema(
      {
        extension: { type: String, default: '' },
        number: { type: String, default: '' },
        verified_at: { type: Date, default: null },
      },
      { _id: false }
    ),
  },
  { _id: false }
);

const metadataSchema = new Schema(
  {
    status: { type: String, enum: STATUSES, default: 'ACTIVE' },
    onboarding_survey_completed: { type: Boolean, default: false },
    is_first_time_user: { type: Boolean, default: true },
    deleted_at: { type: Date, default: null },
    // role_keys is a denormalized cache of role names from user_roles, kept in
    // sync on every role mutation. Authoritative source is user_roles. The
    // cache exists so JWTs and hot reads do not have to join.
    role_keys: { type: [String], default: ['USER'] },
    assigned_zones: { type: [String], default: [] },
    // Profile privacy (Instagram-style). PRIVATE hides posts/stories/details
    // from non-followers; name + avatar always remain visible.
    profile_visibility: { type: String, enum: ['PUBLIC', 'PRIVATE'], default: 'PUBLIC' },
  },
  { _id: false }
);

const countersSchema = new Schema(
  {
    followers_count: { type: Number, default: 0, min: 0 },
    following_count: { type: Number, default: 0, min: 0 },
    saved_pods_count: { type: Number, default: 0, min: 0 },
    following_pods_count: { type: Number, default: 0, min: 0 },
    following_clubs_count: { type: Number, default: 0, min: 0 },
    interests_count: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const securitySchema = new Schema(
  {
    two_factor_enabled: { type: Boolean, default: false },
    failed_login_attempts: { type: Number, default: 0, min: 0 },
    locked_until: { type: Date, default: null },
    password_changed_at: { type: Date, default: null },
  },
  { _id: false }
);

// Partner payout settings (host overrides for "Default Deductions"). Two %s:
// host_share_pct = this host's slice of the pod net (after venue bill + GST);
// host_commission_pct = the commission Duncit takes from that slice. Set per
// host from Admin → user details; 0 on either falls back to the global
// default_host_share_pct / default_host_commission_pct at settlement time.
const userFinanceSchema = new Schema(
  {
    host_share_pct: { type: Number, default: 0, min: 0, max: 100 },
    host_commission_pct: { type: Number, default: 0, min: 0, max: 100 },
  },
  { _id: false }
);

const userSchema = new Schema(
  {
    auth: { type: authSchema, required: true },
    profile: { type: profileSchema, required: true },
    communication: { type: communicationSchema, default: () => ({ whatsapp: {} }) },
    profile_links: { type: [profileLinkSchema], default: [] },
    pet_profile: { type: petProfileSchema, default: null },
    metadata: { type: metadataSchema, default: () => ({}) },
    counters: { type: countersSchema, default: () => ({}) },
    security: { type: securitySchema, default: () => ({}) },
    finance: { type: userFinanceSchema, default: () => ({}) },
  },
  {
    timestamps: { createdAt: 'metadata.created_at', updatedAt: 'metadata.updated_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes. partialFilterExpression beats sparse here — sparse treats null as
// a present value and triggers spurious E11000 on docs missing optional
// fields (email, google_id, phone).
userSchema.index(
  { 'auth.email': 1 },
  {
    unique: true,
    partialFilterExpression: { 'auth.email': { $type: 'string' } },
  }
);
userSchema.index(
  { 'auth.phone.number': 1, 'auth.phone.extension': 1 },
  {
    unique: true,
    partialFilterExpression: {
      'auth.phone.number': { $type: 'string' },
      'auth.phone.extension': { $type: 'string' },
    },
  }
);
userSchema.index(
  { 'auth.google_id': 1 },
  {
    unique: true,
    partialFilterExpression: { 'auth.google_id': { $type: 'string' } },
  }
);
userSchema.index({ 'metadata.status': 1 });
userSchema.index({ 'metadata.deleted_at': 1 });
userSchema.index({ 'metadata.role_keys': 1 });

// Legacy flat-field virtuals. Server code reads/writes these names in dozens
// of places. Routing them through the nested storage keeps existing call
// sites working unchanged while the storage shape matches the spec.
const legacyVirtuals: Record<string, string> = {
  first_name: 'profile.first_name',
  last_name: 'profile.last_name',
  dob: 'profile.dob',
  country: 'profile.country',
  profile_photo: 'profile.profile_photo',
  bio: 'profile.bio',
  city: 'profile.city',
  zone: 'profile.zone',
  assigned_city: 'profile.assigned_city',
  email: 'auth.email',
  is_email_verified: 'auth.is_email_verified',
  password: 'auth.password',
  google_id: 'auth.google_id',
  last_login_provider: 'auth.last_login_provider',
  last_login_at: 'auth.last_login_at',
  email_verification_otp_hash: 'auth.email_verification_otp_hash',
  email_verification_otp_expires_at: 'auth.email_verification_otp_expires_at',
  phone_number: 'auth.phone.number',
  phone_extension: 'auth.phone.extension',
  is_phone_verified: 'auth.phone.is_verified',
  whatsapp_number: 'communication.whatsapp.number',
  whatsapp_extension: 'communication.whatsapp.extension',
  whatsapp_verified_at: 'communication.whatsapp.verified_at',
  status: 'metadata.status',
  onboarding_survey_completed: 'metadata.onboarding_survey_completed',
  is_first_time_user: 'metadata.is_first_time_user',
  roles: 'metadata.role_keys',
  assigned_zones: 'metadata.assigned_zones',
  created_at: 'metadata.created_at',
  updated_at: 'metadata.updated_at',
};

for (const [legacy, nested] of Object.entries(legacyVirtuals)) {
  userSchema
    .virtual(legacy)
    .get(function (this: any) {
      return nested.split('.').reduce((acc, key) => (acc ? acc[key] : undefined), this);
    })
    .set(function (this: any, value: unknown) {
      const parts = nested.split('.');
      let cursor: any = this;
      for (let i = 0; i < parts.length - 1; i += 1) {
        const key = parts[i];
        if (cursor[key] == null) cursor[key] = {};
        cursor = cursor[key];
      }
      cursor[parts[parts.length - 1]] = value;
    });
}

export type UserDocSchema = InferSchemaType<typeof userSchema>;
export type UserDoc = HydratedDocument<UserDocSchema> & { _id: any };
export const UserModel = model('User', userSchema);
