import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { GraphQLError } from 'graphql';
import { UserModel } from './user.model';
import type {
  LoginDTO,
  RegisterDTO,
  CreateUserDTO,
  UpdateUserDTO,
  PetProfileDTO,
} from './user.validator';
import { verifyGoogleIdToken } from './user.google';
import { sendWelcomeEmail, sendAdminCredentialsEmail } from '../../services/email/email.service';
import { rbacService } from '../rbac/rbac.service';
import { settingsService } from '../settings/settings.service';
import type { AuthUser } from '../../context';

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
    const hashed = await bcrypt.hash(input.password, 10);
    const created = await UserModel.create({
      ...input,
      password: hashed,
      roles: ['USER'],
    });

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
    return authPayload(user);
  },

  async loginWithGoogle(idToken: string) {
    const info = await verifyGoogleIdToken(idToken);
    let user = await UserModel.findOne({
      $or: [{ google_id: info.sub }, { email: info.email.toLowerCase() }],
    });
    if (user) {
      let dirty = false;
      if (!user.google_id) {
        user.google_id = info.sub;
        dirty = true;
      }
      if (!user.is_email_verified) {
        user.is_email_verified = true;
        dirty = true;
      }
      if (!user.profile_photo && info.picture) {
        user.profile_photo = info.picture;
        dirty = true;
      }
      if (dirty) await user.save();
    } else {
      user = await UserModel.create({
        first_name: info.given_name || info.name?.split(' ')[0] || 'Google',
        last_name: info.family_name || info.name?.split(' ').slice(1).join(' ') || 'User',
        email: info.email.toLowerCase(),
        is_email_verified: true,
        google_id: info.sub,
        // Google sign-up has no phone yet — placeholders the user can update later.
        phone_number: `g_${info.sub.slice(-10)}`,
        phone_extension: '+91',
        dob: new Date('1990-01-01'),
        profile_photo: info.picture || undefined,
        roles: ['USER'],
      });
      if (user.email) {
        sendWelcomeEmail(user.email, user.first_name).catch((e) =>
          // eslint-disable-next-line no-console
          console.error('Email send failed', e)
        );
      }
    }
    if (user.status !== 'ACTIVE') {
      throw new GraphQLError('Account is not active', { extensions: { code: 'FORBIDDEN' } });
    }
    return authPayload(user);
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
    const u = await UserModel.findById(id);
    return toPublic(u);
  },

  async getById(id: string) {
    const u = await UserModel.findById(id);
    return toPublic(u);
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
    const all = await UserModel.find(query).sort({ created_at: -1 });
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
