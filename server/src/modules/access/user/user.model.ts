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
    email_change_otp_hash: { type: String, select: false },
    email_change_otp_expires_at: { type: Date, select: false },
    /**
     * The address the live change code was sent to.
     *
     * Pinned alongside the hash so the code can only move the account to the
     * address it actually reached. Without it a code could be typed in beside
     * a different address and land the account somewhere nothing was sent.
     */
    email_change_pending: { type: String, select: false, lowercase: true, trim: true },
    password_reset_otp_hash: { type: String, select: false },
    password_reset_otp_expires_at: { type: Date, select: false },
    password_change_otp_hash: { type: String, select: false },
    password_change_otp_expires_at: { type: Date, select: false },
    account_deletion_otp_hash: { type: String, select: false },
    account_deletion_otp_expires_at: { type: Date, select: false },
    portal_login_otp_hash: { type: String, select: false },
    portal_login_otp_expires_at: { type: Date, select: false },
    /**
     * The console the code was issued for.
     *
     * Stored because the check that matters happens at REQUEST time — the
     * account must already hold a role for that portal before an email goes
     * out. Without it, a code minted for the portal somebody can reach would
     * open the one they cannot.
     */
    portal_login_otp_portal: { type: String, select: false },
    password: { type: String, select: false },
    google_id: { type: String },
    /**
     * The Gmail address of the linked Google account, and when it was linked.
     *
     * Kept alongside `google_id` rather than inferred from `auth.email`: an
     * email/password account can link a Google account whose address differs
     * from the one it signed up with, and Connected Accounts has to name the
     * address the user will actually be prompted with. Google-signup accounts
     * predate this field, so readers fall back to `auth.email` for them.
     */
    google_email: { type: String },
    google_linked_at: { type: Date, default: null },
    last_login_provider: { type: String, enum: ['EMAIL', 'GOOGLE', null], default: null },
    last_login_at: { type: Date, default: null },
    // Optional: phone is no longer collected at signup. When present, the
    // phoneSchema still requires number+extension. Absent docs are excluded
    // from the unique phone index via its partialFilterExpression.
    phone: { type: phoneSchema, required: false },
  },
  { _id: false }
);

// Structured postal address — the user's saved "main address". Distinct from
// the flat geo fields (city/state/zone drive which city's pods they browse);
// this is the mailing/billing address that prefills checkout. All optional so
// existing users have an empty address until they fill it.
const addressSchema = new Schema(
  {
    line1: { type: String, default: '', trim: true, maxlength: 200 },
    line2: { type: String, default: '', trim: true, maxlength: 200 },
    landmark: { type: String, default: '', trim: true, maxlength: 160 },
    city: { type: String, default: '', trim: true, maxlength: 120 },
    state: { type: String, default: '', trim: true, maxlength: 120 },
    pincode: { type: String, default: '', trim: true, maxlength: 12 },
    country: { type: String, default: 'India', trim: true, maxlength: 80 },
  },
  { _id: false }
);

const profileSchema = new Schema(
  {
    first_name: { type: String, required: true, trim: true },
    /**
     * The globally unique @handle this account is shared as.
     *
     * Minted from the name at signup and editable from Profile Settings. It is
     * what `/u/<username>` carries, so it is the one profile field a stranger
     * sees in a URL — see ./username.ts for the shape and the reserved list.
     *
     * Optional in the schema, not in practice: accounts created before the
     * field existed have none until `migrate:usernames` runs, and the readers
     * fall back to the user id for those. A required field here would refuse
     * to save every one of those documents on their next unrelated edit.
     */
    username: { type: String, required: false, trim: true, lowercase: true },
    // Optional: simplified signup collects a single "Name"; surname may be empty.
    last_name: { type: String, required: false, trim: true },
    // The saved main postal address (prefills checkout; billing may differ).
    address: { type: addressSchema, default: () => ({}) },
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

/**
 * Which channels this account will accept a one-time code on.
 *
 * Three booleans rather than three rows in the marketing preference
 * collections, because this is a different axis: MailPreference and
 * WaPreference answer "do you want to hear from us", keyed on an address or a
 * number that need not belong to an account at all. This answers "how do you
 * prove it is you", which only an account can have and which the send paths
 * must be able to read without a second lookup.
 *
 * All true by default, and `commPreference.service` refuses the write that
 * would leave none of them on — a person with no channel for a code cannot
 * sign in, and a setting that locks you out is a bug wearing a switch.
 */
const otpChannelSchema = new Schema(
  {
    email: { type: Boolean, default: true },
    whatsapp: { type: Boolean, default: true },
    sms: { type: Boolean, default: true },
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
    otp_channels: { type: otpChannelSchema, default: () => ({}) },
    // Stamped only when a switch actually moves, so the screen can say when
    // — a schema timestamp would move on every unrelated profile save.
    otp_channels_updated_at: { type: Date, default: null },
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

/**
 * A device this account has been signed in from, by hashed DUID.
 *
 * Hashed rather than stored raw so a leaked user document does not hand
 * somebody a working device identity, and capped at ten by the `$slice` on the
 * write that adds one — an uncapped list on a shared computer would grow with
 * every cleared cookie jar.
 */
const knownDeviceSchema = new Schema(
  {
    id: { type: String, required: true },
    last_seen_at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const securitySchema = new Schema(
  {
    two_factor_enabled: { type: Boolean, default: false },
    failed_login_attempts: { type: Number, default: 0, min: 0 },
    locked_until: { type: Date, default: null },
    password_changed_at: { type: Date, default: null },
    /**
     * Every token issued before this instant is refused (`session-seal`).
     *
     * Separate from `password_changed_at`, which is a record of WHEN and is
     * already set on documents whose owners are signed in perfectly legitimately
     * — seeding the seal from it would sign those people out on deploy. Only the
     * password-recovery door writes this one.
     */
    sessions_invalidated_at: { type: Date, default: null },
    // What `recent-account-login` decides on: a sign-in from a device that is
    // not in here is the one worth telling somebody about.
    known_devices: { type: [knownDeviceSchema], default: [] },
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
userSchema.index(
  { 'profile.username': 1 },
  {
    unique: true,
    partialFilterExpression: { 'profile.username': { $type: 'string' } },
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
  username: 'profile.username',
  bio: 'profile.bio',
  city: 'profile.city',
  zone: 'profile.zone',
  assigned_city: 'profile.assigned_city',
  email: 'auth.email',
  is_email_verified: 'auth.is_email_verified',
  password: 'auth.password',
  google_id: 'auth.google_id',
  google_email: 'auth.google_email',
  google_linked_at: 'auth.google_linked_at',
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

function setNestedPath(target: any, nested: string, value: unknown) {
  const parts = nested.split('.');
  let cursor: any = target;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const key = parts[i];
    cursor[key] ??= {};
    cursor = cursor[key];
  }
  const leaf = parts.at(-1);
  if (leaf !== undefined) {
    cursor[leaf] = value;
  }
}

for (const [legacy, nested] of Object.entries(legacyVirtuals)) {
  userSchema
    .virtual(legacy)
    .get(function (this: any) {
      return nested.split('.').reduce((acc, key) => (acc ? acc[key] : undefined), this);
    })
    .set(function (this: any, value: unknown) {
      setNestedPath(this, nested, value);
    });
}

export type UserDocSchema = InferSchemaType<typeof userSchema>;
export type UserDoc = HydratedDocument<UserDocSchema> & { _id: any };
export const UserModel = model('User', userSchema);
