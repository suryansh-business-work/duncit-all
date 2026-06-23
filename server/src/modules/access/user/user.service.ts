import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { UserModel } from './user.model';
import {
  UserRoleModel,
  UserRelationshipModel,
  PodFollowerModel,
  ClubFollowerModel,
  UserSavedPodModel,
  UserInterestModel,
} from './relations';
import type {
  LoginDTO,
  RegisterDTO,
  GoogleSignupDTO,
  CreateUserDTO,
  UpdateUserDTO,
  UpdateMyProfileDTO,
  PetProfileDTO,
  StartRecordedUserCallDTO,
  RequestPasswordResetDTO,
  ResetPasswordDTO,
} from './user.validator';
import { verifyGoogleIdToken } from './user.google';
import {
  sendWelcomeEmail,
  sendAdminCredentialsEmail,
  sendEmailVerificationOtpEmail,
  sendPasswordResetOtpEmail,
  sendAdminAccessGrantedEmail,
  sendAdminAccessRevokedEmail,
} from '@services/email/email.service';
import type { AuthUser } from '@context';
import { CategoryModel } from '@modules/pods/category/category.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { ClubModel } from '@modules/pods/club/club.model';
import { LocationModel } from '@modules/platform/location/location.model';
import { UserContactActionModel } from './userContactAction.model';
import { getRuntimeEnvValue } from '@config/runtimeEnv';
import { USER_SCHEMA_FLAGS } from './user.featureFlags';

const idStrings = (values: unknown[] | undefined | null) =>
  (values ?? []).map((x: any) => String(x));
const EMAIL_OTP_MINUTES = 10;
const isDev = (process.env.NODE_ENV || 'development') !== 'production';
// Privileged role keys that require phone-verified + 2FA for elevated session.
const PRIVILEGED_ROLE_KEYS = [
  'SUPER_ADMIN',
  'CITY_ADMIN',
  'ZONAL_ADMIN',
  'ECOMM_MANAGER',
  'FINANCE_USER',
  'ADS_MANAGER',
  'CRM_MANAGER',
  'FINANCE_MANAGER',
  'TECH_MANAGER',
] as const;
// Spec: reject placeholder/dummy phone numbers in non-seeded paths.
const isPlaceholderPhone = (n: string) => /^0+$/.test(String(n || '').trim());

const hashOtp = (otp: string) =>
  crypto.createHash('sha256').update(`${otp}:${process.env.JWT_SECRET || 'dev-secret'}`).digest('hex');

const cleanProfileLinks = (links: UpdateMyProfileDTO['profile_links'] = []) =>
  (links ?? [])
    .map((link) => ({ label: link.label.trim(), url: link.url.trim() }))
    .filter((link) => link.label && link.url)
    .slice(0, 5);

// Resolve relation IDs for a single user. Hot read path: each list is bounded
// by index lookup. Used to materialize the flat GraphQL shape during the
// backward-compat window.
async function loadRelationIds(userId: string) {
  const oid = new Types.ObjectId(userId);
  const [savedPods, followingPods, followingClubs, followingUsers, interests, roles] =
    await Promise.all([
      UserSavedPodModel.find({ user_id: oid }).select('pod_id').lean(),
      PodFollowerModel.find({ user_id: oid }).select('pod_id').lean(),
      ClubFollowerModel.find({ user_id: oid }).select('club_id').lean(),
      UserRelationshipModel.find({ follower_id: oid }).select('following_id').lean(),
      UserInterestModel.find({ user_id: oid }).select('interest_category_id').lean(),
      UserRoleModel.find({ user_id: oid }).select('role scope').lean(),
    ]);
  return {
    saved_pod_ids: savedPods.map((d: any) => String(d.pod_id)),
    following_pod_ids: followingPods.map((d: any) => String(d.pod_id)),
    following_club_ids: followingClubs.map((d: any) => String(d.club_id)),
    following_user_ids: followingUsers.map((d: any) => String(d.following_id)),
    interest_category_ids: interests.map((d: any) => String(d.interest_category_id)),
    role_keys: Array.from(new Set(roles.map((d: any) => d.role))),
  };
}

const podToPublic = (d: any, clubSlug = '') => ({
  id: String(d._id),
  pod_id: d.pod_id,
  pod_title: d.pod_title,
  pod_hosts_id: idStrings(d.pod_hosts_id),
  location_id: d.location_id ? String(d.location_id) : null,
  venue_id: d.venue_id ? String(d.venue_id) : null,
  club_id: d.club_id ? String(d.club_id) : null,
  club_slug: clubSlug,
  zone_name: d.zone_name ?? null,
  pod_hashtag: d.pod_hashtag ?? [],
  pod_images_and_videos: (d.pod_images_and_videos ?? []).map((m: any) => ({
    url: m.url,
    type: m.type ?? 'IMAGE',
  })),
  pod_hits: d.pod_hits ?? 0,
  pod_attendees: idStrings(d.pod_attendees),
  pod_description: d.pod_description ?? '',
  pod_date_time: d.pod_date_time?.toISOString?.() ?? null,
  pod_end_date_time: d.pod_end_date_time?.toISOString?.() ?? null,
  pod_type: d.pod_type,
  pod_amount: d.pod_amount ?? 0,
  pod_occurrence: d.pod_occurrence ?? 'ONE_TIME',
  no_of_spots: d.no_of_spots ?? 0,
  pod_info: d.pod_info ?? '',
  what_this_pod_offers: d.what_this_pod_offers ?? [],
  available_perks: d.available_perks ?? [],
  payment_terms: d.payment_terms ?? null,
  place_charges: (d.place_charges ?? []).map((c: any) => ({
    label: c.label,
    amount: c.amount ?? 0,
    note: c.note ?? null,
  })),
  products_enabled: !!d.products_enabled,
  product_requests: (d.product_requests ?? []).map((item: any) => ({
    product_id: String(item.product_id),
    product_name: item.product_name,
    unit_cost: item.unit_cost ?? 0,
    quantity: item.quantity ?? 0,
    total_cost: item.total_cost ?? 0,
  })),
  product_cost_total: d.product_cost_total ?? 0,
  like_count: (d.liked_user_ids ?? []).length,
  comment_count: (d.comments ?? []).length,
  liked_user_ids: idStrings(d.liked_user_ids),
  is_active: !!d.is_active,
  created_at: d.created_at?.toISOString?.() ?? '',
  updated_at: d.updated_at?.toISOString?.() ?? '',
});

const contactActionToPublic = (doc: any) => ({
  id: String(doc._id),
  user_id: String(doc.user_id),
  created_by: doc.created_by ? String(doc.created_by) : null,
  type: doc.type,
  target: doc.target ?? '',
  subject: doc.subject ?? '',
  notes: doc.notes ?? '',
  status: doc.status ?? 'LOGGED',
  duration_seconds: doc.duration_seconds ?? 0,
  twilio_call_sid: doc.twilio_call_sid ?? '',
  recording_sid: doc.recording_sid ?? '',
  recording_url: doc.recording_url ?? '',
  created_at: doc.created_at?.toISOString?.() ?? '',
  updated_at: doc.updated_at?.toISOString?.() ?? '',
});

const escapeTwiml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

async function startTwilioRecordedBridge(actionId: string, target: string) {
  const [accountSid, authToken, fromNumber, agentNumber, webhookBaseUrl, recordingEnabled] =
    await Promise.all([
      getRuntimeEnvValue('TWILIO_ACCOUNT_SID'),
      getRuntimeEnvValue('TWILIO_AUTH_TOKEN'),
      getRuntimeEnvValue('TWILIO_PHONE_NUMBER'),
      getRuntimeEnvValue('TWILIO_AGENT_PHONE_NUMBER'),
      getRuntimeEnvValue('TWILIO_WEBHOOK_BASE_URL'),
      getRuntimeEnvValue('TWILIO_CALL_RECORDING_ENABLED'),
    ]);

  if (!accountSid || !authToken || !fromNumber || !agentNumber || !webhookBaseUrl) {
    throw new GraphQLError('Twilio recorded calls are not configured', {
      extensions: { code: 'CONFIG_ERROR' },
    });
  }
  if (['0', 'false', 'no'].includes(recordingEnabled.toLowerCase())) {
    throw new GraphQLError('Twilio call recording is disabled', {
      extensions: { code: 'CONFIG_ERROR' },
    });
  }

  const callbackUrl = `${webhookBaseUrl.replace(/\/$/, '')}/twilio/recordings?contactActionId=${encodeURIComponent(actionId)}`;
  const twiml = [
    '<Response>',
    '<Say>This Duncit admin call may be recorded for service quality.</Say>',
    `<Dial record="record-from-answer-dual" recordingStatusCallback="${escapeTwiml(callbackUrl)}" recordingStatusCallbackMethod="POST">`,
    `<Number>${escapeTwiml(target)}</Number>`,
    '</Dial>',
    '</Response>',
  ].join('');

  const body = new URLSearchParams({
    To: agentNumber,
    From: fromNumber,
    Twiml: twiml,
  });
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  const payload: any = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new GraphQLError(payload?.message || 'Twilio call failed', {
      extensions: { code: 'TWILIO_ERROR' },
    });
  }
  return String(payload.sid || '');
}

async function signToken(payload: AuthUser): Promise<string> {
  const secret = process.env.JWT_SECRET || 'dev-secret';
  // Intentionally NO `expiresIn`: Duncit sessions do not expire on their own.
  // The same fallback secret is used by every `jwt.verify` site (context.ts,
  // realtime/io.ts, index.ts) so a token signed here always verifies there.
  return jwt.sign(payload, secret);
}

// Replace the entire role set for a user. Authoritative writes go to
// user_roles; the role_keys + assigned_zones cache on the user doc is updated
// in the same transaction so JWT issuance and hot reads stay correct.
async function replaceUserRoles(
  userId: string,
  roleKeys: string[],
  opts?: { assignedZones?: string[]; assignedCity?: string | null; assignedBy?: string | null }
) {
  const normalized = Array.from(
    new Set(roleKeys.map((k) => String(k || '').toUpperCase()).filter(Boolean))
  );
  const assignedZones = opts?.assignedZones ?? [];
  const assignedCity = opts?.assignedCity ?? null;
  const oid = new Types.ObjectId(userId);
  const assignedBy = opts?.assignedBy ? new Types.ObjectId(opts.assignedBy) : null;

  const session = await UserModel.db.startSession();
  try {
    await session.withTransaction(async () => {
      await UserRoleModel.deleteMany({ user_id: oid }, { session });
      const rows: any[] = [];
      for (const role of normalized) {
        if (role === 'ZONAL_ADMIN' && assignedZones.length) {
          for (const zone of assignedZones) {
            rows.push({
              user_id: oid,
              role,
              scope: { zone, city: null },
              assigned_by: assignedBy,
            });
          }
        } else if (role === 'CITY_ADMIN' && assignedCity) {
          rows.push({
            user_id: oid,
            role,
            scope: { zone: null, city: assignedCity },
            assigned_by: assignedBy,
          });
        } else {
          rows.push({
            user_id: oid,
            role,
            scope: { zone: null, city: null },
            assigned_by: assignedBy,
          });
        }
      }
      if (rows.length) await UserRoleModel.insertMany(rows, { session });
      await UserModel.updateOne(
        { _id: oid },
        {
          $set: {
            'metadata.role_keys': normalized,
            'metadata.assigned_zones': assignedZones,
            'profile.assigned_city': assignedCity,
          },
        },
        { session }
      );
    });
  } finally {
    await session.endSession();
  }
}

// Build the public GraphQL User shape. Storage is nested; consumers and the
// frontends still expect the flat shape, so this adapter projects nested →
// flat. Counts come from users.counters (denormalized), IDs from the relation
// collections (materialized for backward compatibility).
async function toPublic(u: any) {
  if (!u) return null;
  const userId = String(u._id);
  const relations = await loadRelationIds(userId);
  // Backward-compat read path. While dualWrite is on, the legacy flat fields
  // are still present on rows that have not been migrated yet. Falling back
  // to them lets the API keep serving traffic mid-cutover. After
  // verification the flag flips off and the only valid source is the nested
  // storage.
  const legacy = USER_SCHEMA_FLAGS.dualWrite ? u : {};
  const auth = u.auth ?? {};
  const profile = u.profile ?? {};
  const meta = u.metadata ?? {};
  const counters = u.counters ?? {};
  const wa = (u.communication?.whatsapp) ?? {};
  const phone = auth.phone ?? {};
  const roleKeys = relations.role_keys.length
    ? relations.role_keys
    : (meta.role_keys ?? legacy.roles ?? []);

  const authProviders = [
    auth.password ? 'EMAIL' : null,
    auth.google_id ? 'GOOGLE' : null,
  ].filter(Boolean) as Array<'EMAIL' | 'GOOGLE'>;

  const firstName = profile.first_name ?? legacy.first_name ?? '';
  const lastName = profile.last_name ?? legacy.last_name ?? '';
  return {
    user_id: userId,
    first_name: firstName,
    last_name: lastName,
    full_name: `${firstName} ${lastName}`.trim(),
    email: auth.email ?? legacy.email ?? null,
    is_email_verified: !!(auth.is_email_verified ?? legacy.is_email_verified),
    phone_number: phone.number ?? legacy.phone_number ?? '',
    phone_extension: phone.extension ?? legacy.phone_extension ?? '',
    is_phone_verified: !!(phone.is_verified ?? legacy.is_phone_verified),
    auth_providers: authProviders.length ? authProviders : ['EMAIL'],
    last_login_provider: auth.last_login_provider ?? legacy.last_login_provider ?? null,
    last_login_at:
      (auth.last_login_at ?? legacy.last_login_at)?.toISOString?.() ?? null,
    dob:
      profile.dob
        ? new Date(profile.dob).toISOString()
        : legacy.dob
        ? new Date(legacy.dob).toISOString()
        : '',
    country: profile.country ?? legacy.country ?? 'India',
    city: profile.city ?? legacy.city ?? null,
    zone: profile.zone ?? legacy.zone ?? null,
    selected_location_id: profile.selected_location_id
      ? String(profile.selected_location_id)
      : null,
    roles: roleKeys,
    assigned_city: profile.assigned_city ?? legacy.assigned_city ?? null,
    assigned_zones: meta.assigned_zones ?? legacy.assigned_zones ?? [],
    profile_photo: profile.profile_photo ?? legacy.profile_photo ?? null,
    bio: profile.bio ?? legacy.bio ?? null,
    profile_links: (u.profile_links ?? []).map((link: any) => ({
      label: link.label ?? '',
      url: link.url ?? '',
    })),
    pet_profile: u.pet_profile
      ? {
          name: u.pet_profile.name ?? null,
          species: u.pet_profile.species ?? null,
          breed: u.pet_profile.breed ?? null,
          age: u.pet_profile.age ?? null,
          photo_url: u.pet_profile.photo_url ?? null,
          bio: u.pet_profile.bio ?? null,
        }
      : null,
    saved_pod_ids: relations.saved_pod_ids,
    following_pod_ids: relations.following_pod_ids,
    following_club_ids: relations.following_club_ids,
    following_user_ids: relations.following_user_ids,
    followers_count: counters.followers_count ?? 0,
    following_count: counters.following_count ?? 0,
    interest_category_ids: relations.interest_category_ids,
    onboarding_survey_completed: !!(meta.onboarding_survey_completed ?? legacy.onboarding_survey_completed),
    whatsapp_extension: wa.extension ?? legacy.whatsapp_extension ?? '',
    whatsapp_number: wa.number ?? legacy.whatsapp_number ?? '',
    whatsapp_verified_at:
      (wa.verified_at ?? legacy.whatsapp_verified_at)?.toISOString?.() ?? null,
    is_first_time_user: !!(meta.is_first_time_user ?? legacy.is_first_time_user),
    status: meta.status ?? legacy.status ?? 'ACTIVE',
    profile_visibility: meta.profile_visibility ?? 'PUBLIC',
    host_share_pct: u.finance?.host_share_pct ?? 0,
    host_commission_pct: u.finance?.host_commission_pct ?? 0,
    created_at:
      (meta.created_at ?? legacy.created_at)?.toISOString?.() ?? '',
    updated_at:
      (meta.updated_at ?? legacy.updated_at)?.toISOString?.() ?? '',
  };
}

async function authPayload(u: any) {
  const pub = (await toPublic(u))!;
  const token = await signToken({
    id: pub.user_id,
    email: pub.email ?? null,
    roles: pub.roles,
    assigned_city: pub.assigned_city,
    assigned_zones: pub.assigned_zones,
  });
  return { token, user: pub };
}

// Shape a CreateUserDTO / RegisterDTO into the nested storage layout.
function shapeUserDoc(input: any, opts?: { passwordHash?: string; googleId?: string; emailVerified?: boolean }) {
  const phoneNumber = String(input.phone_number || '').trim();
  if (phoneNumber && isPlaceholderPhone(phoneNumber)) {
    throw new GraphQLError('Invalid phone number', { extensions: { code: 'BAD_USER_INPUT' } });
  }
  return {
    auth: {
      email: input.email ? String(input.email).toLowerCase() : undefined,
      is_email_verified: !!opts?.emailVerified,
      password: opts?.passwordHash,
      google_id: opts?.googleId,
      // Only attach the phone subdocument when a number is supplied — the
      // schema requires number+extension when present, and omitting it keeps
      // the doc out of the unique phone index (partial on $type: string).
      ...(phoneNumber
        ? {
            phone: {
              number: phoneNumber,
              extension: input.phone_extension,
              is_verified: false,
            },
          }
        : {}),
    },
    profile: {
      first_name: input.first_name,
      last_name: input.last_name,
      dob: input.dob ? new Date(input.dob) : undefined,
      country: input.country ?? 'India',
      city: input.city ?? undefined,
      zone: input.zone ?? undefined,
      assigned_city: input.assigned_city ?? undefined,
      profile_photo: input.profile_photo ?? undefined,
    },
    metadata: {
      role_keys: Array.isArray(input.roles) && input.roles.length ? input.roles : ['USER'],
      assigned_zones: input.assigned_zones ?? [],
    },
  };
}

export const userService = {
  // Backward-compat helper used by other modules. Returns the materialized
  // flat shape (toPublic) for a given doc.
  toPublic,

  async register(input: RegisterDTO) {
    if (input.phone_number && isPlaceholderPhone(input.phone_number)) {
      throw new GraphQLError('Invalid phone number', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const existing = await UserModel.findOne({ 'auth.email': input.email });
    if (existing) {
      throw new GraphQLError('Email already in use', { extensions: { code: 'CONFLICT' } });
    }
    // Only enforce phone uniqueness when a phone was supplied — otherwise the
    // query would match the many users that have no phone at all.
    if (input.phone_number) {
      const phoneExists = await UserModel.findOne({
        'auth.phone.number': input.phone_number,
        'auth.phone.extension': input.phone_extension,
      });
      if (phoneExists) {
        throw new GraphQLError(
          'This phone number is already registered. Please use a different number or login.',
          { extensions: { code: 'CONFLICT' } }
        );
      }
    }
    const hashed = await bcrypt.hash(input.password, 10);
    let created: any;
    try {
      const doc = shapeUserDoc(input, { passwordHash: hashed });
      created = await UserModel.create(doc);
      await UserRoleModel.create({
        user_id: created._id,
        role: 'USER',
        scope: { city: null, zone: null },
      });
    } catch (e: any) {
      if (e?.code === 11000) {
        const key = Object.keys(e?.keyPattern ?? {})[0] ?? '';
        if (key.includes('phone')) {
          throw new GraphQLError(
            'This phone number is already registered. Please use a different number or login.',
            { extensions: { code: 'CONFLICT' } }
          );
        }
        if (key.includes('email')) {
          throw new GraphQLError('Email already in use', { extensions: { code: 'CONFLICT' } });
        }
        throw new GraphQLError('Account already exists', { extensions: { code: 'CONFLICT' } });
      }
      throw e;
    }

    if (created.auth?.email) {
      sendWelcomeEmail(created.auth.email, created.profile?.first_name).catch((e) =>
        // eslint-disable-next-line no-console
        console.error('Email send failed', e)
      );
    }
    return authPayload(created);
  },

  async login(input: LoginDTO) {
    const user = await UserModel.findOne({ 'auth.email': input.email }).select('+auth.password');
    if (!user) {
      throw new GraphQLError('Invalid credentials', { extensions: { code: 'UNAUTHENTICATED' } });
    }
    const stored = (user as any).auth?.password as string | undefined;
    if (!stored) {
      throw new GraphQLError('This account uses Google sign-in. Continue with Google.', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }
    const ok = await bcrypt.compare(input.password, stored);
    if (!ok) {
      throw new GraphQLError('Invalid credentials', { extensions: { code: 'UNAUTHENTICATED' } });
    }
    if ((user as any).metadata?.status !== 'ACTIVE') {
      throw new GraphQLError('Account is not active', { extensions: { code: 'FORBIDDEN' } });
    }
    await UserModel.updateOne(
      { _id: user._id },
      {
        $set: {
          'auth.last_login_provider': 'EMAIL',
          'auth.last_login_at': new Date(),
        },
      }
    );
    const fresh = await UserModel.findById(user._id).select('+auth.password');
    return authPayload(fresh);
  },

  async loginWithGoogle(idToken: string) {
    const info = await verifyGoogleIdToken(idToken);
    const email = info.email.toLowerCase();
    const user = await UserModel.findOne({ 'auth.google_id': info.sub });
    if (!user) {
      const emailUser = await UserModel.findOne({ 'auth.email': email }).select('+auth.password');
      if (emailUser && (emailUser as any).auth?.password) {
        throw new GraphQLError('Please login with email. You registered using email and password.', {
          extensions: { code: 'EMAIL_LOGIN_REQUIRED' },
        });
      }
      throw new GraphQLError('User is not in our system. Please sign up first.', {
        extensions: { code: 'GOOGLE_ACCOUNT_NOT_FOUND' },
      });
    }
    if ((user as any).metadata?.status !== 'ACTIVE') {
      throw new GraphQLError('Account is not active', { extensions: { code: 'FORBIDDEN' } });
    }
    const set: Record<string, any> = {
      'auth.last_login_provider': 'GOOGLE',
      'auth.last_login_at': new Date(),
    };
    if (!user.auth?.is_email_verified) set['auth.is_email_verified'] = true;
    if (!user.profile?.profile_photo && info.picture) set['profile.profile_photo'] = info.picture;
    await UserModel.updateOne({ _id: user._id }, { $set: set });
    const fresh = await UserModel.findById(user._id);
    return authPayload(fresh);
  },

  async signupWithGoogle(input: GoogleSignupDTO) {
    const info = await verifyGoogleIdToken(input.id_token);
    const email = info.email.toLowerCase();
    if (input.phone_number && isPlaceholderPhone(input.phone_number)) {
      throw new GraphQLError('Invalid phone number', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    let created: any = null;
    const session = await UserModel.db.startSession();
    try {
      await session.withTransaction(async () => {
        const existing = await UserModel.findOne({
          $or: [{ 'auth.google_id': info.sub }, { 'auth.email': email }],
        })
          .select('+auth.password')
          .session(session);
        if (existing) {
          const message = (existing as any).auth?.password
            ? 'Please login with email. You registered using email and password.'
            : 'Google account already exists. Please login with Google.';
          throw new GraphQLError(message, { extensions: { code: 'CONFLICT' } });
        }
        if (input.phone_number) {
          const phoneExists = await UserModel.findOne({
            'auth.phone.number': input.phone_number,
            'auth.phone.extension': input.phone_extension,
          }).session(session);
          if (phoneExists) {
            throw new GraphQLError(
              'This phone number is already registered. Please use a different number or login.',
              { extensions: { code: 'CONFLICT' } }
            );
          }
        }
        const docs = await UserModel.create(
          [
            shapeUserDoc(
              {
                first_name: info.given_name || info.name?.split(' ')[0] || 'Google',
                last_name: info.family_name || info.name?.split(' ').slice(1).join(' ') || 'User',
                email,
                phone_number: input.phone_number,
                phone_extension: input.phone_extension,
                dob: input.dob,
                city: input.city ?? null,
                zone: input.zone ?? null,
                profile_photo: info.picture || undefined,
              },
              { googleId: info.sub, emailVerified: true }
            ),
          ],
          { session }
        );
        created = docs[0];
        await UserRoleModel.create(
          [
            {
              user_id: created._id,
              role: 'USER',
              scope: { city: null, zone: null },
            },
          ],
          { session }
        );
      });
    } catch (e: any) {
      if (e instanceof GraphQLError) throw e;
      if (e?.code === 11000) {
        const key = Object.keys(e?.keyPattern ?? {})[0] ?? '';
        if (key.includes('phone')) {
          throw new GraphQLError(
            'This phone number is already registered. Please use a different number or login.',
            { extensions: { code: 'CONFLICT' } }
          );
        }
        if (key.includes('email') || key.includes('google')) {
          throw new GraphQLError('Account already exists. Please login instead.', {
            extensions: { code: 'CONFLICT' },
          });
        }
        throw new GraphQLError('Account already exists', { extensions: { code: 'CONFLICT' } });
      }
      throw e;
    } finally {
      await session.endSession();
    }
    if (!created) {
      throw new GraphQLError('Could not create Google account', {
        extensions: { code: 'INTERNAL_SERVER_ERROR' },
      });
    }
    if (created.auth?.email) {
      sendWelcomeEmail(created.auth.email, created.profile?.first_name).catch((e) =>
        // eslint-disable-next-line no-console
        console.error('Email send failed', e)
      );
    }
    await UserModel.updateOne(
      { _id: created._id },
      {
        $set: {
          'auth.last_login_provider': 'GOOGLE',
          'auth.last_login_at': new Date(),
        },
      }
    );
    const fresh = await UserModel.findById(created._id);
    return authPayload(fresh);
  },

  async updateMyProfile(user_id: string, input: UpdateMyProfileDTO) {
    const set: Record<string, any> = {};
    const profileMap: Record<string, string> = {
      first_name: 'profile.first_name',
      last_name: 'profile.last_name',
      bio: 'profile.bio',
      profile_photo: 'profile.profile_photo',
      city: 'profile.city',
      zone: 'profile.zone',
      country: 'profile.country',
    };
    const phoneMap: Record<string, string> = {
      phone_number: 'auth.phone.number',
      phone_extension: 'auth.phone.extension',
    };
    const waMap: Record<string, string> = {
      whatsapp_number: 'communication.whatsapp.number',
      whatsapp_extension: 'communication.whatsapp.extension',
    };
    for (const [field, path] of Object.entries(profileMap)) {
      if ((input as any)[field] !== undefined) set[path] = (input as any)[field] || null;
    }
    for (const [field, path] of Object.entries(phoneMap)) {
      if ((input as any)[field] !== undefined) {
        const v = (input as any)[field];
        if (field === 'phone_number' && v && isPlaceholderPhone(v)) {
          throw new GraphQLError('Invalid phone number', { extensions: { code: 'BAD_USER_INPUT' } });
        }
        set[path] = v || null;
      }
    }
    for (const [field, path] of Object.entries(waMap)) {
      if ((input as any)[field] !== undefined) set[path] = (input as any)[field] || null;
    }
    if (input.profile_links !== undefined) set.profile_links = cleanProfileLinks(input.profile_links);
    if ((input as any).dob !== undefined) {
      const raw = (input as any).dob;
      const d = raw ? new Date(raw) : null;
      if (raw && (!d || Number.isNaN(d.getTime()))) {
        throw new GraphQLError('Invalid date of birth', { extensions: { code: 'BAD_USER_INPUT' } });
      }
      set['profile.dob'] = d;
    }
    const updated = await UserModel.findByIdAndUpdate(user_id, { $set: set }, { new: true });
    if (!updated) throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
    return toPublic(updated);
  },

  async requestEmailVerificationOtp(user_id: string) {
    const user = await UserModel.findById(user_id).select(
      '+auth.email_verification_otp_hash +auth.email_verification_otp_expires_at'
    );
    if (!user) throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
    if (!user.auth?.email) {
      throw new GraphQLError('Add an email address before requesting OTP', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }
    if (user.auth?.is_email_verified) return { ok: true, dev_otp: null };
    const otp = String(crypto.randomInt(100000, 1000000));
    await UserModel.updateOne(
      { _id: user._id },
      {
        $set: {
          'auth.email_verification_otp_hash': hashOtp(otp),
          'auth.email_verification_otp_expires_at': new Date(Date.now() + EMAIL_OTP_MINUTES * 60_000),
        },
      }
    );
    await sendEmailVerificationOtpEmail({
      to: user.auth.email,
      name: user.profile?.first_name,
      otp,
      expiresMinutes: String(EMAIL_OTP_MINUTES),
    });
    return { ok: true, dev_otp: isDev ? otp : null };
  },

  async verifyEmailVerificationOtp(user_id: string, otp: string) {
    const code = String(otp || '').trim();
    if (!/^\d{6}$/.test(code)) {
      throw new GraphQLError('Enter the 6 digit OTP', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const user = await UserModel.findById(user_id).select(
      '+auth.email_verification_otp_hash +auth.email_verification_otp_expires_at'
    );
    if (!user) throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
    if (user.auth?.is_email_verified) return toPublic(user);
    const expiresAt = (user as any).auth?.email_verification_otp_expires_at as Date | undefined;
    const storedHash = (user as any).auth?.email_verification_otp_hash as string | undefined;
    if (!storedHash || !expiresAt || expiresAt.getTime() < Date.now()) {
      throw new GraphQLError('OTP expired. Request a new OTP.', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    if (hashOtp(code) !== storedHash) {
      throw new GraphQLError('Invalid OTP', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    await UserModel.updateOne(
      { _id: user._id },
      {
        $set: { 'auth.is_email_verified': true },
        $unset: {
          'auth.email_verification_otp_hash': '',
          'auth.email_verification_otp_expires_at': '',
        },
      }
    );
    const fresh = await UserModel.findById(user_id);
    return toPublic(fresh);
  },

  // Public: email a password-reset OTP. Always returns ok to avoid leaking which
  // emails are registered; the OTP is only generated/sent for a real account
  // that has a password (Google-only accounts have none).
  async requestPasswordResetOtp(input: RequestPasswordResetDTO) {
    const email = String(input.email || '').trim().toLowerCase();
    const user = await UserModel.findOne({ 'auth.email': email }).select('+auth.password');
    if (!user?.auth?.password) return { ok: true, dev_otp: null };
    const otp = String(crypto.randomInt(100000, 1000000));
    await UserModel.updateOne(
      { _id: user._id },
      {
        $set: {
          'auth.password_reset_otp_hash': hashOtp(otp),
          'auth.password_reset_otp_expires_at': new Date(Date.now() + EMAIL_OTP_MINUTES * 60_000),
        },
      }
    );
    await sendPasswordResetOtpEmail({
      to: email,
      name: user.profile?.first_name || 'there',
      otp,
      expiresMinutes: String(EMAIL_OTP_MINUTES),
    });
    return { ok: true, dev_otp: isDev ? otp : null };
  },

  // Public: verify the OTP and set a new password. Generic errors prevent email
  // enumeration. On success the reset OTP is cleared and password_changed_at set.
  async resetPasswordWithOtp(input: ResetPasswordDTO) {
    const email = String(input.email || '').trim().toLowerCase();
    const code = String(input.otp || '').trim();
    const user = await UserModel.findOne({ 'auth.email': email }).select(
      '+auth.password_reset_otp_hash +auth.password_reset_otp_expires_at'
    );
    if (!user) {
      throw new GraphQLError('Invalid OTP', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const expiresAt = (user as any).auth?.password_reset_otp_expires_at as Date | undefined;
    const storedHash = (user as any).auth?.password_reset_otp_hash as string | undefined;
    if (!storedHash || !expiresAt || expiresAt.getTime() < Date.now()) {
      throw new GraphQLError('OTP expired. Request a new OTP.', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }
    if (hashOtp(code) !== storedHash) {
      throw new GraphQLError('Invalid OTP', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const hashed = await bcrypt.hash(input.new_password, 10);
    await UserModel.updateOne(
      { _id: user._id },
      {
        $set: { 'auth.password': hashed, 'auth.password_changed_at': new Date() },
        $unset: {
          'auth.password_reset_otp_hash': '',
          'auth.password_reset_otp_expires_at': '',
        },
      }
    );
    return true;
  },

  async updateMyInterests(user_id: string, categoryIds: string[]) {
    const uniqueIds = Array.from(new Set(categoryIds.filter(Boolean)));
    if (!uniqueIds.every((id) => Types.ObjectId.isValid(id))) {
      throw new GraphQLError('Invalid category selection', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }
    const count = await CategoryModel.countDocuments({ _id: { $in: uniqueIds }, is_active: true });
    if (count !== uniqueIds.length) {
      throw new GraphQLError('One or more selected categories are unavailable', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }
    const oid = new Types.ObjectId(user_id);
    const session = await UserModel.db.startSession();
    try {
      await session.withTransaction(async () => {
        await UserInterestModel.deleteMany({ user_id: oid }, { session });
        if (uniqueIds.length) {
          await UserInterestModel.insertMany(
            uniqueIds.map((id) => ({ user_id: oid, interest_category_id: new Types.ObjectId(id) })),
            { session }
          );
        }
        await UserModel.updateOne(
          { _id: oid },
          {
            $set: {
              'metadata.onboarding_survey_completed': true,
              'counters.interests_count': uniqueIds.length,
            },
          },
          { session }
        );
      });
    } finally {
      await session.endSession();
    }
    const fresh = await UserModel.findById(user_id);
    if (!fresh) throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
    return toPublic(fresh);
  },

  async getInterestCategories(categoryIds: string[]) {
    const validIds = categoryIds.filter((id) => Types.ObjectId.isValid(id));
    if (!validIds.length) return [];
    const docs = await CategoryModel.find({ _id: { $in: validIds } });
    const byId = new Map(docs.map((doc: any) => [String(doc._id), doc]));
    return validIds
      .map((id) => byId.get(id))
      .filter(Boolean)
      .map((doc: any) => ({
        id: String(doc._id),
        name: doc.name,
        slug: doc.slug,
        icon: doc.icon ?? '',
        description: doc.description ?? '',
        media: (doc.media ?? []).map((m: any) => ({ url: m.url, type: m.type ?? 'IMAGE' })),
        level: doc.level,
        parent_id: doc.parent_id ? String(doc.parent_id) : null,
        is_active: !!doc.is_active,
        is_system: !!doc.is_system,
        sort_order: doc.sort_order ?? 0,
        created_at: doc.created_at?.toISOString?.() ?? '',
        updated_at: doc.updated_at?.toISOString?.() ?? '',
      }));
  },

  async toggleSavedPod(user_id: string, podId: string) {
    if (!Types.ObjectId.isValid(podId)) {
      throw new GraphQLError('Invalid pod', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const pod = await PodModel.findById(podId).select('_id');
    if (!pod) throw new GraphQLError('Pod not found', { extensions: { code: 'NOT_FOUND' } });

    const oid = new Types.ObjectId(user_id);
    const podOid = new Types.ObjectId(podId);

    const existing = await UserSavedPodModel.findOne({ user_id: oid, pod_id: podOid });
    let saved: boolean;
    if (existing) {
      await UserSavedPodModel.deleteOne({ _id: existing._id });
      await UserModel.updateOne({ _id: oid }, { $inc: { 'counters.saved_pods_count': -1 } });
      saved = false;
    } else {
      try {
        await UserSavedPodModel.create({ user_id: oid, pod_id: podOid });
        await UserModel.updateOne({ _id: oid }, { $inc: { 'counters.saved_pods_count': 1 } });
      } catch (e: any) {
        // Race: a concurrent toggle already inserted. Treat as already saved.
        if (e?.code !== 11000) throw e;
      }
      saved = true;
    }
    const ids = await UserSavedPodModel.find({ user_id: oid }).select('pod_id').lean();
    return { pod_id: podId, saved, saved_pod_ids: ids.map((d: any) => String(d.pod_id)) };
  },

  async listSavedPods(user_id: string) {
    const oid = new Types.ObjectId(user_id);
    const savedDocs = await UserSavedPodModel.find({ user_id: oid })
      .sort({ created_at: -1 })
      .select('pod_id')
      .lean();
    const ids = savedDocs.map((d: any) => String(d.pod_id));
    if (!ids.length) return [];
    const docs = await PodModel.find({ _id: { $in: ids }, is_active: true });
    const clubIds = Array.from(
      new Set(docs.map((d: any) => d.club_id && String(d.club_id)).filter(Boolean))
    );
    const clubs = clubIds.length
      ? await ClubModel.find({ _id: { $in: clubIds } }, { club_id: 1 })
      : [];
    const clubSlugById = new Map((clubs as any[]).map((c) => [String(c._id), c.club_id ?? '']));
    const byId = new Map(docs.map((doc: any) => [String(doc._id), doc]));
    return ids
      .map((id) => byId.get(id))
      .filter(Boolean)
      .map((doc: any) => podToPublic(doc, clubSlugById.get(String(doc.club_id)) ?? ''));
  },

  async followClub(user_id: string, clubId: string) {
    if (!Types.ObjectId.isValid(clubId)) {
      throw new GraphQLError('Invalid club', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const club = await ClubModel.findById(clubId).select('_id is_active');
    if (!club || !club.is_active) {
      throw new GraphQLError('Club not found', { extensions: { code: 'NOT_FOUND' } });
    }
    const oid = new Types.ObjectId(user_id);
    try {
      await ClubFollowerModel.create({ user_id: oid, club_id: club._id });
      await UserModel.updateOne({ _id: oid }, { $inc: { 'counters.following_clubs_count': 1 } });
    } catch (e: any) {
      if (e?.code !== 11000) throw e;
    }
    const updated = await UserModel.findById(user_id);
    if (!updated) throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
    return toPublic(updated);
  },

  async unfollowClub(user_id: string, clubId: string) {
    if (!Types.ObjectId.isValid(clubId)) {
      throw new GraphQLError('Invalid club', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const oid = new Types.ObjectId(user_id);
    const res = await ClubFollowerModel.deleteOne({ user_id: oid, club_id: new Types.ObjectId(clubId) });
    if (res.deletedCount) {
      await UserModel.updateOne({ _id: oid }, { $inc: { 'counters.following_clubs_count': -1 } });
    }
    const updated = await UserModel.findById(user_id);
    if (!updated) throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
    return toPublic(updated);
  },

  async followPod(user_id: string, podId: string) {
    if (!Types.ObjectId.isValid(podId)) {
      throw new GraphQLError('Invalid pod', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const pod = await PodModel.findById(podId).select('_id is_active');
    if (!pod || !pod.is_active) {
      throw new GraphQLError('Pod not found', { extensions: { code: 'NOT_FOUND' } });
    }
    const oid = new Types.ObjectId(user_id);
    try {
      await PodFollowerModel.create({ user_id: oid, pod_id: pod._id });
      await UserModel.updateOne({ _id: oid }, { $inc: { 'counters.following_pods_count': 1 } });
    } catch (e: any) {
      if (e?.code !== 11000) throw e;
    }
    const updated = await UserModel.findById(user_id);
    if (!updated) throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
    return toPublic(updated);
  },

  async unfollowPod(user_id: string, podId: string) {
    if (!Types.ObjectId.isValid(podId)) {
      throw new GraphQLError('Invalid pod', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const oid = new Types.ObjectId(user_id);
    const res = await PodFollowerModel.deleteOne({ user_id: oid, pod_id: new Types.ObjectId(podId) });
    if (res.deletedCount) {
      await UserModel.updateOne({ _id: oid }, { $inc: { 'counters.following_pods_count': -1 } });
    }
    const updated = await UserModel.findById(user_id);
    if (!updated) throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
    return toPublic(updated);
  },

  async followUser(user_id: string, targetUserId: string) {
    if (user_id === targetUserId) {
      throw new GraphQLError('You cannot follow yourself', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }
    if (!Types.ObjectId.isValid(targetUserId)) {
      throw new GraphQLError('Invalid user', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const target = await UserModel.findById(targetUserId).select('_id metadata.status');
    if (!target || (target as any).metadata?.status !== 'ACTIVE') {
      throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
    }
    const followerOid = new Types.ObjectId(user_id);
    const followingOid = new Types.ObjectId(targetUserId);
    let created = false;
    try {
      await UserRelationshipModel.create({
        follower_id: followerOid,
        following_id: followingOid,
      });
      created = true;
      await Promise.all([
        UserModel.updateOne({ _id: followerOid }, { $inc: { 'counters.following_count': 1 } }),
        UserModel.updateOne({ _id: followingOid }, { $inc: { 'counters.followers_count': 1 } }),
      ]);
    } catch (e: any) {
      if (e?.code !== 11000) throw e;
    }
    const updated = await UserModel.findById(user_id);
    const follower = await toPublic(updated);
    if (created) await this.notifyNewFollower(targetUserId, follower);
    return follower;
  },

  // Best-effort "started following you" notification to the followed user.
  // A failure here must never break the follow itself.
  async notifyNewFollower(targetUserId: string, follower: Awaited<ReturnType<typeof toPublic>>) {
    try {
      const { notificationService } = await import(
        '@modules/engagement/notification/notification.service'
      );
      const name = follower?.full_name?.trim() || 'Someone';
      await notificationService.create({
        title: 'New follower',
        body: `${name} started following you`,
        image_url: follower?.profile_photo ?? null,
        link_url: follower?.user_id ? `/u/${follower.user_id}` : null,
        scope: 'USER',
        target_user_ids: [targetUserId],
      });
    } catch (err) {

      console.error('notifyNewFollower failed', err);
    }
  },

  async unfollowUser(user_id: string, targetUserId: string) {
    if (!Types.ObjectId.isValid(targetUserId)) {
      throw new GraphQLError('Invalid user', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const followerOid = new Types.ObjectId(user_id);
    const followingOid = new Types.ObjectId(targetUserId);
    const res = await UserRelationshipModel.deleteOne({
      follower_id: followerOid,
      following_id: followingOid,
    });
    if (res.deletedCount) {
      await Promise.all([
        UserModel.updateOne({ _id: followerOid }, { $inc: { 'counters.following_count': -1 } }),
        UserModel.updateOne({ _id: followingOid }, { $inc: { 'counters.followers_count': -1 } }),
      ]);
    }
    const updated = await UserModel.findById(user_id);
    return toPublic(updated);
  },

  async updateMyProfileVisibility(user_id: string, visibility: 'PUBLIC' | 'PRIVATE') {
    if (visibility !== 'PUBLIC' && visibility !== 'PRIVATE') {
      throw new GraphQLError('Invalid visibility', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const updated = await UserModel.findByIdAndUpdate(
      user_id,
      { $set: { 'metadata.profile_visibility': visibility } },
      { new: true }
    );
    if (!updated) throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
    return toPublic(updated);
  },

  // Persist the user's selected header location. A null/empty id clears it.
  // A non-empty id must reference an existing location, so a stale/invalid id
  // can never be stored.
  async setMySelectedLocation(user_id: string, location_id: string | null) {
    let value: Types.ObjectId | null = null;
    if (location_id) {
      if (!Types.ObjectId.isValid(location_id)) {
        throw new GraphQLError('Invalid location', { extensions: { code: 'BAD_USER_INPUT' } });
      }
      const exists = await LocationModel.exists({ _id: new Types.ObjectId(location_id) });
      if (!exists) {
        throw new GraphQLError('Location not found', { extensions: { code: 'NOT_FOUND' } });
      }
      value = new Types.ObjectId(location_id);
    }
    const updated = await UserModel.findByIdAndUpdate(
      user_id,
      { $set: { 'profile.selected_location_id': value } },
      { new: true }
    );
    if (!updated) throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
    return toPublic(updated);
  },

  // True when `viewerId` already follows `targetId`.
  async isFollowing(viewerId: string, targetId: string) {
    if (!Types.ObjectId.isValid(viewerId) || !Types.ObjectId.isValid(targetId)) return false;
    const edge = await UserRelationshipModel.exists({
      follower_id: new Types.ObjectId(viewerId),
      following_id: new Types.ObjectId(targetId),
    });
    return !!edge;
  },

  // The ids of users `viewerId` follows (lean, for batch follow checks).
  async listFollowingUserIds(viewerId: string) {
    if (!Types.ObjectId.isValid(viewerId)) return [];
    const edges = await UserRelationshipModel.find({ follower_id: new Types.ObjectId(viewerId) })
      .select('following_id')
      .lean();
    return edges.map((e: any) => String(e.following_id));
  },

  // The ids of users who follow `targetId` (powers the Followers list, bug 9).
  async listFollowerUserIds(targetId: string) {
    if (!Types.ObjectId.isValid(targetId)) return [];
    const edges = await UserRelationshipModel.find({ following_id: new Types.ObjectId(targetId) })
      .select('follower_id')
      .lean();
    return edges.map((e: any) => String(e.follower_id));
  },

  // Can `viewerId` see `ownerId`'s posts/stories/private details? Owner always
  // can; PUBLIC profiles are open; PRIVATE profiles need a follow edge.
  async canViewContent(ownerId: string, viewerId: string | null) {
    if (!Types.ObjectId.isValid(ownerId)) return false;
    if (viewerId && viewerId === ownerId) return true;
    const owner = await UserModel.findById(ownerId).select('metadata.profile_visibility');
    if (!owner) return false;
    const visibility = (owner as any).metadata?.profile_visibility ?? 'PUBLIC';
    if (visibility === 'PUBLIC') return true;
    return viewerId ? this.isFollowing(viewerId, ownerId) : false;
  },

  async updateMyPetProfile(user_id: string, input: PetProfileDTO) {
    const updated = await UserModel.findByIdAndUpdate(
      user_id,
      { $set: { pet_profile: input } },
      { new: true }
    );
    if (!updated) throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
    return toPublic(updated);
  },

  async me(id: string) {
    const u = await UserModel.findById(id);
    return toPublic(u);
  },

  async getById(id: string) {
    const u = await UserModel.findById(id);
    return toPublic(u);
  },

  async listContactActions(user_id: string) {
    const docs = await UserContactActionModel.find({ user_id: new Types.ObjectId(user_id) })
      .sort({ created_at: -1 })
      .limit(100);
    return docs.map(contactActionToPublic);
  },

  async recordContactAction(input: Record<string, any>, createdBy?: string | null) {
    const targetUser = await UserModel.findById(input.user_id).select('_id');
    if (!targetUser) throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
    const created = await UserContactActionModel.create({
      user_id: targetUser._id,
      created_by: createdBy ? new Types.ObjectId(createdBy) : null,
      type: input.type,
      target: input.target,
      subject: input.subject ?? '',
      notes: input.notes ?? '',
      status: input.status ?? 'LOGGED',
      duration_seconds: input.duration_seconds ?? 0,
      recording_url: input.recording_url ?? '',
    });
    return contactActionToPublic(created);
  },

  async startRecordedCall(input: StartRecordedUserCallDTO, createdBy?: string | null) {
    const targetUser = await UserModel.findById(input.user_id).select('_id');
    if (!targetUser) throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
    const action = await UserContactActionModel.create({
      user_id: targetUser._id,
      created_by: createdBy ? new Types.ObjectId(createdBy) : null,
      type: 'CALL',
      target: input.target,
      notes: input.notes ?? '',
      status: 'INITIATING',
    });
    try {
      action.twilio_call_sid = await startTwilioRecordedBridge(String(action._id), input.target);
      action.status = 'INITIATED';
      await action.save();
      return contactActionToPublic(action);
    } catch (error: any) {
      action.status = 'FAILED';
      action.notes = [input.notes, error?.message].filter(Boolean).join('\n');
      await action.save();
      throw error;
    }
  },

  async attachCallRecording(input: {
    actionId?: string | null;
    callSid?: string | null;
    recordingSid?: string | null;
    recordingUrl?: string | null;
    durationSeconds?: number | null;
  }) {
    const query = input.actionId
      ? { _id: new Types.ObjectId(input.actionId) }
      : { twilio_call_sid: input.callSid ?? '' };
    const updated = await UserContactActionModel.findOneAndUpdate(
      query,
      {
        $set: {
          status: 'RECORDED',
          recording_sid: input.recordingSid ?? '',
          recording_url: input.recordingUrl ?? '',
          duration_seconds: input.durationSeconds ?? 0,
        },
      },
      { new: true }
    );
    return !!updated;
  },

  async deleteContactAction(actionId: string) {
    const deleted = await UserContactActionModel.findByIdAndDelete(actionId);
    return !!deleted;
  },

  async list(filter?: {
    role?: string;
    city?: string;
    zone?: string;
    status?: string;
    search?: string;
  }) {
    const query: any = {};
    if (filter?.role) query['metadata.role_keys'] = filter.role;
    if (filter?.city) query['profile.city'] = filter.city;
    if (filter?.zone) query['profile.zone'] = filter.zone;
    if (filter?.status) query['metadata.status'] = filter.status;
    if (filter?.search) {
      const rx = new RegExp(filter.search, 'i');
      query.$or = [
        { 'profile.first_name': rx },
        { 'profile.last_name': rx },
        { 'auth.email': rx },
        { 'auth.phone.number': rx },
      ];
    }
    const all = await UserModel.find(query).sort({ 'metadata.created_at': -1 });
    return Promise.all(all.map((u) => toPublic(u)));
  },

  async create(input: CreateUserDTO) {
    if (isPlaceholderPhone(input.phone_number)) {
      throw new GraphQLError('Invalid phone number', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const existing = input.email
      ? await UserModel.findOne({ 'auth.email': input.email })
      : null;
    if (existing) {
      throw new GraphQLError('Email already in use', { extensions: { code: 'CONFLICT' } });
    }
    const hashed = await bcrypt.hash(input.password, 10);
    const created = await UserModel.create(
      shapeUserDoc(input, { passwordHash: hashed })
    );
    await replaceUserRoles(String(created._id), (input.roles ?? []) as string[], {
      assignedZones: ((input.assigned_zones ?? []) as string[]).filter(Boolean),
      assignedCity: input.assigned_city ?? null,
    });

    if (created.auth?.email) {
      sendWelcomeEmail(created.auth.email, created.profile?.first_name).catch((e) =>
        // eslint-disable-next-line no-console
        console.error('Email send failed', e)
      );
    }
    const fresh = await UserModel.findById(created._id);
    return toPublic(fresh);
  },

  async update(user_id: string, input: UpdateUserDTO) {
    const set: Record<string, any> = {};
    const profileFields = [
      'first_name',
      'last_name',
      'bio',
      'profile_photo',
      'city',
      'zone',
    ] as const;
    for (const f of profileFields) {
      if ((input as any)[f] !== undefined) set[`profile.${f}`] = (input as any)[f];
    }
    if ((input as any).email !== undefined) set['auth.email'] = (input as any).email;
    if ((input as any).phone_number !== undefined) {
      const v = (input as any).phone_number;
      if (v && isPlaceholderPhone(v)) {
        throw new GraphQLError('Invalid phone number', { extensions: { code: 'BAD_USER_INPUT' } });
      }
      set['auth.phone.number'] = v;
    }
    if ((input as any).phone_extension !== undefined) {
      set['auth.phone.extension'] = (input as any).phone_extension;
    }
    if ((input as any).dob !== undefined) set['profile.dob'] = (input as any).dob;
    if ((input as any).status !== undefined) set['metadata.status'] = (input as any).status;
    if ((input as any).assigned_city !== undefined) {
      set['profile.assigned_city'] = (input as any).assigned_city;
    }
    if ((input as any).assigned_zones !== undefined) {
      set['metadata.assigned_zones'] = (input as any).assigned_zones;
    }
    if ((input as any).host_commission_pct !== undefined) {
      set['finance.host_commission_pct'] = (input as any).host_commission_pct;
    }
    const updated = await UserModel.findByIdAndUpdate(user_id, { $set: set }, { new: true });
    if (!updated) {
      throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
    }
    if ((input as any).roles !== undefined) {
      const inputZones = (input as any).assigned_zones as string[] | undefined;
      const currentZones = (updated.metadata?.assigned_zones ?? []) as string[];
      await replaceUserRoles(user_id, ((input as any).roles ?? []) as string[], {
        assignedZones: (inputZones ?? currentZones).filter(Boolean),
        assignedCity:
          (input as any).assigned_city ?? updated.profile?.assigned_city ?? null,
      });
    }
    const fresh = await UserModel.findById(user_id);
    return toPublic(fresh);
  },

  async remove(user_id: string) {
    // Soft delete per spec — set metadata.deleted_at, mark INACTIVE. Hard
    // delete of relations is also performed so counters do not drift.
    const oid = new Types.ObjectId(user_id);
    const session = await UserModel.db.startSession();
    try {
      await session.withTransaction(async () => {
        await UserModel.updateOne(
          { _id: oid },
          {
            $set: {
              'metadata.deleted_at': new Date(),
              'metadata.status': 'INACTIVE',
            },
          },
          { session }
        );
        await Promise.all([
          UserRoleModel.deleteMany({ user_id: oid }, { session }),
          UserSavedPodModel.deleteMany({ user_id: oid }, { session }),
          PodFollowerModel.deleteMany({ user_id: oid }, { session }),
          ClubFollowerModel.deleteMany({ user_id: oid }, { session }),
          UserInterestModel.deleteMany({ user_id: oid }, { session }),
          UserRelationshipModel.deleteMany(
            { $or: [{ follower_id: oid }, { following_id: oid }] },
            { session }
          ),
        ]);
      });
    } finally {
      await session.endSession();
    }
    return true;
  },

  async assignRoles(user_id: string, role_keys: string[]) {
    const target = await UserModel.findById(user_id);
    if (!target) throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
    await replaceUserRoles(user_id, role_keys, {
      assignedZones: target.metadata?.assigned_zones ?? [],
      assignedCity: target.profile?.assigned_city ?? null,
    });
    const fresh = await UserModel.findById(user_id);
    return toPublic(fresh);
  },

  async addRole(user_id: string, role_key: string) {
    const target = await UserModel.findById(user_id);
    if (!target) throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
    const current = new Set<string>(target.metadata?.role_keys ?? []);
    current.add(String(role_key).toUpperCase());
    await replaceUserRoles(user_id, Array.from(current), {
      assignedZones: target.metadata?.assigned_zones ?? [],
      assignedCity: target.profile?.assigned_city ?? null,
    });
    const fresh = await UserModel.findById(user_id);
    return toPublic(fresh);
  },

  async removeRole(user_id: string, role_key: string) {
    const target = await UserModel.findById(user_id);
    if (!target) throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
    const current = new Set<string>(target.metadata?.role_keys ?? []);
    current.delete(String(role_key).toUpperCase());
    await replaceUserRoles(user_id, Array.from(current), {
      assignedZones: target.metadata?.assigned_zones ?? [],
      assignedCity: target.profile?.assigned_city ?? null,
    });
    const fresh = await UserModel.findById(user_id);
    return toPublic(fresh);
  },

  // Grant SUPER_ADMIN ("admin") access to a user + email them a security
  // warning. Idempotent: re-granting an existing admin only re-sends nothing.
  async grantAdmin(user_id: string) {
    const target = await UserModel.findById(user_id);
    if (!target) throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
    const current = new Set<string>(target.metadata?.role_keys ?? []);
    if (!current.has('SUPER_ADMIN')) {
      current.add('SUPER_ADMIN');
      await replaceUserRoles(user_id, Array.from(current), {
        assignedZones: target.metadata?.assigned_zones ?? [],
        assignedCity: target.profile?.assigned_city ?? null,
      });
      const email = target.auth?.email;
      if (email) {
        sendAdminAccessGrantedEmail({ to: email, name: target.profile?.first_name || 'there' }).catch(
          // eslint-disable-next-line no-console
          (e) => console.error('Admin granted email failed', e)
        );
      }
    }
    const fresh = await UserModel.findById(user_id);
    return toPublic(fresh);
  },

  // Revoke SUPER_ADMIN access + email the user. The seeded root admin
  // (DEFAULT_SUPER_ADMIN_EMAIL) is protected and cannot be revoked.
  async revokeAdmin(user_id: string) {
    const target = await UserModel.findById(user_id);
    if (!target) throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
    const rootEmail = (process.env.DEFAULT_SUPER_ADMIN_EMAIL || 'admin@duncit.com').toLowerCase();
    if ((target.auth?.email ?? '').toLowerCase() === rootEmail) {
      throw new GraphQLError('The root super admin cannot be revoked', {
        extensions: { code: 'FORBIDDEN' },
      });
    }
    const current = new Set<string>(target.metadata?.role_keys ?? []);
    if (current.has('SUPER_ADMIN')) {
      current.delete('SUPER_ADMIN');
      await replaceUserRoles(user_id, Array.from(current), {
        assignedZones: target.metadata?.assigned_zones ?? [],
        assignedCity: target.profile?.assigned_city ?? null,
      });
      const email = target.auth?.email;
      if (email) {
        sendAdminAccessRevokedEmail({ to: email, name: target.profile?.first_name || 'there' }).catch(
          // eslint-disable-next-line no-console
          (e) => console.error('Admin revoked email failed', e)
        );
      }
    }
    const fresh = await UserModel.findById(user_id);
    return toPublic(fresh);
  },

  // Privileged-role gate. Call from any path issuing an elevated session.
  // Today this is permissive (warn only) so existing flows do not break, but
  // the helper is wired so future enablement is a one-line flip.
  isPrivileged(roleKeys: readonly string[]): boolean {
    return roleKeys.some((r) => (PRIVILEGED_ROLE_KEYS as readonly string[]).includes(r));
  },

  async seedSuperAdmin(): Promise<{ created: boolean; emailed: boolean; email: string }> {
    const DEFAULT_EMAIL = process.env.DEFAULT_SUPER_ADMIN_EMAIL || 'admin@duncit.com';
    const DEFAULT_PASSWORD = process.env.DEFAULT_SUPER_ADMIN_PASSWORD || '12345678';

    const existing = await UserModel.findOne({ 'auth.email': DEFAULT_EMAIL });
    let created = false;

    if (!existing) {
      const hashed = await bcrypt.hash(DEFAULT_PASSWORD, 10);
      // Seed uses sentinel phone 0000000000 / +91 by design — these rows are
      // the only place that bypasses the placeholder-phone validator. Mark
      // them as already migrated so the migration script skips them.
      const doc = await UserModel.create({
        auth: {
          email: DEFAULT_EMAIL,
          is_email_verified: true,
          password: hashed,
          phone: { number: '0000000000', extension: '+91', is_verified: false },
        },
        profile: {
          first_name: 'Super',
          last_name: 'Admin',
          dob: new Date('1990-01-01'),
          country: 'India',
        },
        metadata: {
          status: 'ACTIVE',
          is_first_time_user: false,
          role_keys: ['SUPER_ADMIN'],
        },
      });
      await UserRoleModel.create({
        user_id: doc._id,
        role: 'SUPER_ADMIN',
        scope: { city: null, zone: null },
      });
      created = true;
    } else {
      const hasSuper = (existing.metadata?.role_keys ?? []).includes('SUPER_ADMIN');
      if (!hasSuper) {
        await replaceUserRoles(
          String(existing._id),
          [...(existing.metadata?.role_keys ?? []), 'SUPER_ADMIN'],
          {
            assignedZones: existing.metadata?.assigned_zones ?? [],
            assignedCity: existing.profile?.assigned_city ?? null,
          }
        );
      }
    }

    let emailed = false;
    try {
      await sendAdminCredentialsEmail({
        to: DEFAULT_EMAIL,
        name: 'Super Admin',
        email: DEFAULT_EMAIL,
        password: DEFAULT_PASSWORD,
      });
      emailed = true;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Admin credentials email failed', e);
    }

    return { created, emailed, email: DEFAULT_EMAIL };
  },
};
