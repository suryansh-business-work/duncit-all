import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { UserModel } from './user.model';
import type {
  LoginDTO,
  RegisterDTO,
  GoogleSignupDTO,
  CreateUserDTO,
  UpdateUserDTO,
  UpdateMyProfileDTO,
  PetProfileDTO,
  StartRecordedUserCallDTO,
} from './user.validator';
import { verifyGoogleIdToken } from './user.google';
import { sendWelcomeEmail, sendAdminCredentialsEmail } from '../../services/email/email.service';
import { rbacService } from '../rbac/rbac.service';
import { settingsService } from '../settings/settings.service';
import type { AuthUser } from '../../context';
import { CategoryModel } from '../category/category.model';
import { PodModel } from '../pod/pod.model';
import { ClubModel } from '../club/club.model';
import { UserContactActionModel } from './userContactAction.model';
import { getRuntimeEnvValue } from '../../config/runtimeEnv';

const idStrings = (values: unknown[] | undefined | null) => (values ?? []).map((x: any) => String(x));

const cleanProfileLinks = (links: UpdateMyProfileDTO['profile_links'] = []) =>
  (links ?? [])
    .map((link) => ({ label: link.label.trim(), url: link.url.trim() }))
    .filter((link) => link.label && link.url)
    .slice(0, 5);

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
  const settings = await settingsService.getAppSettings();
  const opts: SignOptions = {};
  if (!settings.jwt_no_expiry && settings.jwt_expires_in) {
    opts.expiresIn = settings.jwt_expires_in as SignOptions['expiresIn'];
  }
  return jwt.sign(payload, secret, opts);
}

async function toPublic(u: any) {
  if (!u) return null;
  const roles = (u.roles ?? []) as string[];
  const permissions = await rbacService.permissionsForRoleKeys(roles);
  const authProviders = [
    (u as any).password ? 'EMAIL' : null,
    u.google_id ? 'GOOGLE' : null,
  ].filter(Boolean) as Array<'EMAIL' | 'GOOGLE'>;
  return {
    user_id: String(u._id),
    first_name: u.first_name,
    last_name: u.last_name,
    full_name: `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim(),
    email: u.email ?? null,
    is_email_verified: !!u.is_email_verified,
    phone_number: u.phone_number,
    phone_extension: u.phone_extension,
    is_phone_verified: !!u.is_phone_verified,
    auth_providers: authProviders.length ? authProviders : ['EMAIL'],
    last_login_provider: u.last_login_provider ?? null,
    last_login_at: u.last_login_at?.toISOString?.() ?? null,
    dob: u.dob ? new Date(u.dob).toISOString() : '',
    country: u.country ?? 'India',
    city: u.city ?? null,
    zone: u.zone ?? null,
    roles,
    permissions,
    assigned_city: u.assigned_city ?? null,
    assigned_zones: u.assigned_zones ?? [],
    profile_photo: u.profile_photo ?? null,
    bio: u.bio ?? null,
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
    saved_pod_ids: idStrings(u.saved_pod_ids),
    following_user_ids: idStrings(u.following_user_ids),
    followers_count: (u.follower_user_ids ?? []).length,
    following_count: (u.following_user_ids ?? []).length,
    interest_category_ids: idStrings(u.interest_category_ids),
    onboarding_survey_completed: !!u.onboarding_survey_completed,
    whatsapp_extension: u.whatsapp_extension ?? '',
    whatsapp_number: u.whatsapp_number ?? '',
    whatsapp_verified_at: u.whatsapp_verified_at?.toISOString?.() ?? null,
    is_first_time_user: !!u.is_first_time_user,
    status: u.status ?? 'ACTIVE',
    created_at: u.created_at?.toISOString?.() ?? '',
    updated_at: u.updated_at?.toISOString?.() ?? '',
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

export const userService = {
  async register(input: RegisterDTO) {
    const existing = await UserModel.findOne({ email: input.email });
    if (existing) {
      throw new GraphQLError('Email already in use', { extensions: { code: 'CONFLICT' } });
    }
    const phoneExists = await UserModel.findOne({
      phone_number: input.phone_number,
      phone_extension: input.phone_extension,
    });
    if (phoneExists) {
      throw new GraphQLError(
        'This phone number is already registered. Please use a different number or login.',
        { extensions: { code: 'CONFLICT' } }
      );
    }
    const hashed = await bcrypt.hash(input.password, 10);
    let created: any;
    try {
      created = await UserModel.create({
        ...input,
        password: hashed,
        roles: ['USER'],
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

    if (created.email) {
      sendWelcomeEmail(created.email, created.first_name).catch((e) =>
        // eslint-disable-next-line no-console
        console.error('Email send failed', e)
      );
    }
    return authPayload(created);
  },

  async login(input: LoginDTO) {
    const user = await UserModel.findOne({ email: input.email }).select('+password');
    if (!user) {
      throw new GraphQLError('Invalid credentials', { extensions: { code: 'UNAUTHENTICATED' } });
    }
    if (!(user as any).password) {
      throw new GraphQLError('This account uses Google sign-in. Continue with Google.', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }
    const ok = await bcrypt.compare(input.password, (user as any).password);
    if (!ok) {
      throw new GraphQLError('Invalid credentials', { extensions: { code: 'UNAUTHENTICATED' } });
    }
    if (user.status !== 'ACTIVE') {
      throw new GraphQLError('Account is not active', { extensions: { code: 'FORBIDDEN' } });
    }
    user.last_login_provider = 'EMAIL';
    user.last_login_at = new Date();
    await user.save();
    return authPayload(user);
  },

  async loginWithGoogle(idToken: string) {
    const info = await verifyGoogleIdToken(idToken);
    const email = info.email.toLowerCase();
    const user = await UserModel.findOne({ google_id: info.sub });
    if (!user) {
      const emailUser = await UserModel.findOne({ email }).select('+password');
      if (emailUser && (emailUser as any).password) {
        throw new GraphQLError('Please login with email. You registered using email and password.', {
          extensions: { code: 'EMAIL_LOGIN_REQUIRED' },
        });
      }
      throw new GraphQLError('User is not in our system. Please sign up first.', {
        extensions: { code: 'GOOGLE_ACCOUNT_NOT_FOUND' },
      });
    }
    let dirty = false;
    if (!user.is_email_verified) {
      user.is_email_verified = true;
      dirty = true;
    }
    if (!user.profile_photo && info.picture) {
      user.profile_photo = info.picture;
      dirty = true;
    }
    if (user.status !== 'ACTIVE') {
      throw new GraphQLError('Account is not active', { extensions: { code: 'FORBIDDEN' } });
    }
    user.last_login_provider = 'GOOGLE';
    user.last_login_at = new Date();
    if (dirty || user.isModified('last_login_provider') || user.isModified('last_login_at')) {
      await user.save();
    }
    return authPayload(user);
  },

  async signupWithGoogle(input: GoogleSignupDTO) {
    const info = await verifyGoogleIdToken(input.id_token);
    const email = info.email.toLowerCase();
    let created: any = null;
    const session = await UserModel.db.startSession();
    try {
      await session.withTransaction(async () => {
        const existing = await UserModel.findOne({
          $or: [{ google_id: info.sub }, { email }],
        })
          .select('+password')
          .session(session);
        if (existing) {
          const message = (existing as any).password
            ? 'Please login with email. You registered using email and password.'
            : 'Google account already exists. Please login with Google.';
          throw new GraphQLError(message, { extensions: { code: 'CONFLICT' } });
        }
        const phoneExists = await UserModel.findOne({
          phone_number: input.phone_number,
          phone_extension: input.phone_extension,
        }).session(session);
        if (phoneExists) {
          throw new GraphQLError(
            'This phone number is already registered. Please use a different number or login.',
            { extensions: { code: 'CONFLICT' } }
          );
        }
        const docs = await UserModel.create(
          [
            {
              first_name: info.given_name || info.name?.split(' ')[0] || 'Google',
              last_name: info.family_name || info.name?.split(' ').slice(1).join(' ') || 'User',
              email,
              is_email_verified: true,
              google_id: info.sub,
              phone_number: input.phone_number,
              phone_extension: input.phone_extension,
              dob: new Date(input.dob),
              city: input.city ?? null,
              zone: input.zone ?? null,
              profile_photo: info.picture || undefined,
              roles: ['USER'],
            },
          ],
          { session }
        );
        created = docs[0];
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
    if (created.email) {
      sendWelcomeEmail(created.email, created.first_name).catch((e) =>
        // eslint-disable-next-line no-console
        console.error('Email send failed', e)
      );
    }
    created.last_login_provider = 'GOOGLE';
    created.last_login_at = new Date();
    await created.save();
    return authPayload(created);
  },

  async updateMyProfile(user_id: string, input: UpdateMyProfileDTO) {
    const update: any = {};
    const stringFields = [
      'first_name',
      'last_name',
      'bio',
      'profile_photo',
      'city',
      'zone',
      'country',
      'phone_number',
      'phone_extension',
      'whatsapp_number',
      'whatsapp_extension',
    ] as const;
    for (const field of stringFields) {
      if ((input as any)[field] !== undefined) update[field] = (input as any)[field] || null;
    }
    if (input.profile_links !== undefined) update.profile_links = cleanProfileLinks(input.profile_links);
    if ((input as any).dob !== undefined) {
      const raw = (input as any).dob;
      const d = raw ? new Date(raw) : null;
      if (raw && (!d || Number.isNaN(d.getTime()))) {
        throw new GraphQLError('Invalid date of birth', { extensions: { code: 'BAD_USER_INPUT' } });
      }
      update.dob = d;
    }
    const updated = await UserModel.findByIdAndUpdate(user_id, update, { new: true });
    if (!updated) throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
    return toPublic(updated);
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
    const updated = await UserModel.findByIdAndUpdate(
      user_id,
      { interest_category_ids: uniqueIds, onboarding_survey_completed: true },
      { new: true }
    );
    if (!updated) throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
    return toPublic(updated);
  },

  async getInterestCategories(categoryIds: string[]) {
    const validIds = categoryIds.filter((id) => Types.ObjectId.isValid(id));
    if (!validIds.length) return [];
    const docs = await CategoryModel.find({ _id: { $in: validIds } });
    const byId = new Map(docs.map((doc: any) => [String(doc._id), doc]));
    return validIds.map((id) => byId.get(id)).filter(Boolean).map((doc: any) => ({
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
    const [user, pod] = await Promise.all([
      UserModel.findById(user_id),
      PodModel.findById(podId).select('_id'),
    ]);
    if (!user) throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
    if (!pod) throw new GraphQLError('Pod not found', { extensions: { code: 'NOT_FOUND' } });
    const current = new Set(idStrings(user.saved_pod_ids));
    const saved = !current.has(podId);
    if (saved) current.add(podId);
    else current.delete(podId);
    user.saved_pod_ids = Array.from(current).map((id) => new Types.ObjectId(id)) as any;
    await user.save();
    return { pod_id: podId, saved, saved_pod_ids: idStrings(user.saved_pod_ids) };
  },

  async listSavedPods(user_id: string) {
    const user = await UserModel.findById(user_id).select('saved_pod_ids');
    const ids = idStrings(user?.saved_pod_ids);
    if (!ids.length) return [];
    const docs = await PodModel.find({ _id: { $in: ids }, is_active: true });
    // Build club-slug map so club_slug (String!) is never null
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

  async followUser(user_id: string, targetUserId: string) {
    if (user_id === targetUserId) {
      throw new GraphQLError('You cannot follow yourself', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }
    if (!Types.ObjectId.isValid(targetUserId)) {
      throw new GraphQLError('Invalid user', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const target = await UserModel.findById(targetUserId).select('_id status');
    if (!target || target.status !== 'ACTIVE') {
      throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
    }
    await Promise.all([
      UserModel.findByIdAndUpdate(user_id, { $addToSet: { following_user_ids: target._id } }),
      UserModel.findByIdAndUpdate(targetUserId, { $addToSet: { follower_user_ids: user_id } }),
    ]);
    const updated = await UserModel.findById(user_id).select('+password');
    return toPublic(updated);
  },

  async unfollowUser(user_id: string, targetUserId: string) {
    await Promise.all([
      UserModel.findByIdAndUpdate(user_id, { $pull: { following_user_ids: targetUserId } }),
      UserModel.findByIdAndUpdate(targetUserId, { $pull: { follower_user_ids: user_id } }),
    ]);
    const updated = await UserModel.findById(user_id).select('+password');
    return toPublic(updated);
  },

  async updateMyPetProfile(user_id: string, input: PetProfileDTO) {
    const updated = await UserModel.findByIdAndUpdate(
      user_id,
      { pet_profile: input },
      { new: true }
    );
    if (!updated) throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
    return toPublic(updated);
  },

  async me(id: string) {
    const u = await UserModel.findById(id).select('+password');
    return toPublic(u);
  },

  async getById(id: string) {
    const u = await UserModel.findById(id).select('+password');
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
    if (filter?.role) query.roles = filter.role;
    if (filter?.city) query.city = filter.city;
    if (filter?.zone) query.zone = filter.zone;
    if (filter?.status) query.status = filter.status;
    if (filter?.search) {
      const rx = new RegExp(filter.search, 'i');
      query.$or = [
        { first_name: rx },
        { last_name: rx },
        { email: rx },
        { phone_number: rx },
      ];
    }
    const all = await UserModel.find(query).select('+password').sort({ created_at: -1 });
    return Promise.all(all.map(toPublic));
  },

  async create(input: CreateUserDTO) {
    const existing = input.email ? await UserModel.findOne({ email: input.email }) : null;
    if (existing) {
      throw new GraphQLError('Email already in use', { extensions: { code: 'CONFLICT' } });
    }
    const hashed = await bcrypt.hash(input.password, 10);
    const created = await UserModel.create({ ...input, password: hashed });

    if (created.email) {
      sendWelcomeEmail(created.email, created.first_name).catch((e) =>
        // eslint-disable-next-line no-console
        console.error('Email send failed', e)
      );
    }
    return toPublic(created);
  },

  async update(user_id: string, input: UpdateUserDTO) {
    const updated = await UserModel.findByIdAndUpdate(user_id, input, { new: true });
    if (!updated) {
      throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
    }
    return toPublic(updated);
  },

  async remove(user_id: string) {
    const res = await UserModel.findByIdAndDelete(user_id);
    return !!res;
  },

  async assignRoles(user_id: string, role_keys: string[]) {
    const normalized = Array.from(
      new Set(role_keys.map((k) => k.toUpperCase()).filter(Boolean))
    );
    const updated = await UserModel.findByIdAndUpdate(
      user_id,
      { roles: normalized },
      { new: true }
    );
    if (!updated) throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
    return toPublic(updated);
  },

  async addRole(user_id: string, role_key: string) {
    const updated = await UserModel.findByIdAndUpdate(
      user_id,
      { $addToSet: { roles: role_key.toUpperCase() } },
      { new: true }
    );
    if (!updated) throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
    return toPublic(updated);
  },

  async removeRole(user_id: string, role_key: string) {
    const updated = await UserModel.findByIdAndUpdate(
      user_id,
      { $pull: { roles: role_key.toUpperCase() } },
      { new: true }
    );
    if (!updated) throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
    return toPublic(updated);
  },

  async seedSuperAdmin(): Promise<{ created: boolean; emailed: boolean; email: string }> {
    const DEFAULT_EMAIL = process.env.DEFAULT_SUPER_ADMIN_EMAIL || 'admin@duncit.com';
    const DEFAULT_PASSWORD = process.env.DEFAULT_SUPER_ADMIN_PASSWORD || '12345678';

    const existing = await UserModel.findOne({ email: DEFAULT_EMAIL });
    let created = false;

    if (!existing) {
      const hashed = await bcrypt.hash(DEFAULT_PASSWORD, 10);
      await UserModel.create({
        first_name: 'Super',
        last_name: 'Admin',
        email: DEFAULT_EMAIL,
        is_email_verified: true,
        phone_number: '0000000000',
        phone_extension: '+91',
        password: hashed,
        dob: new Date('1990-01-01'),
        roles: ['SUPER_ADMIN'],
        status: 'ACTIVE',
        is_first_time_user: false,
      });
      created = true;
    } else if (!existing.roles?.includes('SUPER_ADMIN')) {
      existing.roles = [...(existing.roles ?? []), 'SUPER_ADMIN'];
      await existing.save();
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
