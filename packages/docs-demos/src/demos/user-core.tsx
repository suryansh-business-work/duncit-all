import {
  accountEmail,
  accountName,
  can,
  canAny,
  hasAppAccess,
  initials,
  normalizeMe,
} from '@duncit/user-core';
import { defineDemo, defineDemos } from '../types';

/** The `me` payload exactly as the server answers it. */
interface MeMock {
  me: Record<string, unknown>;
  /** What a portal declares in VITE_REQUIRED_ROLES. */
  required_roles: string[];
}

export default defineDemos('user-core', [
  defineDemo<MeMock>({
    id: 'session',
    title: 'One session shape, derived once',
    note:
      "Drop user_id and normalizeMe returns null — an object without one is a malformed answer, not an anonymous user. Take CITY_ADMIN out of roles and the portal gate below closes.",
    mock: {
      me: {
        user_id: '66f1c0a4e2b9a41d7c3f8a12',
        first_name: 'Meera',
        last_name: 'Nair',
        full_name: 'Meera Nair',
        email: 'meera@duncit.com',
        phone_number: '9845012345',
        phone_extension: '+91',
        roles: ['USER', 'HOST', 'CITY_ADMIN'],
        locale: 'en-IN',
        timezone: 'Asia/Kolkata',
        country: 'India',
        city: 'Bengaluru',
      },
      required_roles: ['SUPER_ADMIN', 'CITY_ADMIN'],
    },
    compute: (mock) => {
      const user = normalizeMe(mock.me);
      const roles = user?.roles ?? [];
      return {
        'normalizeMe(me)': user ? 'a SessionUser' : 'null — no user_id',
        'accountName(user)': accountName(user),
        'accountEmail(user)': accountEmail(user),
        'initials(user)': initials(user),
        'Roles held': roles,
        "can(roles, 'HOST', 'CITY_ADMIN')": can(roles, 'HOST', 'CITY_ADMIN'),
        "canAny(roles, 'SUPER_ADMIN', 'HOST')": canAny(roles, 'SUPER_ADMIN', 'HOST'),
        'hasAppAccess(roles, required_roles)': hasAppAccess(roles, mock.required_roles),
      };
    },
  }),
]);
