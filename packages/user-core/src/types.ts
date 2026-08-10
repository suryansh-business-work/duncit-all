/**
 * The one shape every surface reads the signed-in account through.
 *
 * Deliberately NOT the old `DuncitUser`, whose nine all-optional fields meant
 * every call site re-derived the same answers (`accountName`, `initials`,
 * `hasAppAccess`, studio mode) in its own way — and whose `id` was a phantom:
 * it existed in the type, in no query, and the server has never had it. The
 * server's identity field is `user_id`.
 */
export interface SessionUser {
  /** The server's identity field. There is no separate `id`. */
  user_id: string;
  first_name: string;
  last_name: string;
  /** Server-computed; falls back to first+last when the server sends nothing. */
  full_name: string;
  email: string | null;
  phone_number: string;
  phone_extension: string;
  avatar: string | null;
  bio: string | null;
  roles: string[];
  /** BCP-47, from `profile.locale` — what makes a language choice follow the
   * account to a new device rather than living in one install's storage. */
  locale: string;
  /** IANA zone from the account, '' when unset (the app then uses the device). */
  timezone: string;
  country: string;
  city: string | null;
  state: string | null;
  zone: string | null;
  /** City/zones a staff account is scoped to — the shell gates on these. */
  assigned_city: string | null;
  assigned_zones: string[];
  selected_location_id: string | null;
  is_email_verified: boolean;
  is_phone_verified: boolean;
  onboarding_survey_completed: boolean;
  created_at: string | null;
  updated_at: string | null;
}

/** The device the session is running on. Assembled by a platform probe, so the
 * shape is identical whether it came from `navigator` or React Native's
 * `Platform`. */
export interface SessionDevice {
  /** Stable per-install identifier used for attribution. Survives sign-out —
   * it identifies the DEVICE, not the session. */
  duid: string;
  /** 'web' | 'ios' | 'android'. */
  platform: string;
  /** OS name + version, or the browser user agent on web. */
  os: string;
  /** Handset model, or `WIDTHxHEIGHT` on web. */
  model: string;
  /** The build the user is running — what a bug report has to name. */
  app_version: string;
  /** Device timezone, used when the account has not set one. */
  timezone: string;
}

/** A resolved feature flag. */
export interface FeatureFlags {
  [key: string]: boolean;
}

export type SessionStatus = 'loading' | 'authenticated' | 'anonymous' | 'failed';

/**
 * Everything a surface can read about "who is using this, on what".
 *
 * This is what `useSession()` returns on mWeb, the portals and the native app.
 * The three used to answer the same questions from three different shapes —
 * one of which carried an `id` field the server has never had.
 */
export interface SessionSnapshot {
  status: SessionStatus;
  user: SessionUser | null;
  device: SessionDevice;
  flags: FeatureFlags;
  /** Convenience: `status === 'authenticated'`. */
  isAuthenticated: boolean;
  /** The account's roles, never null — `[]` when signed out. */
  roles: string[];
  /** Display name, initials and email, derived once instead of at 40 call sites. */
  name: string;
  initials: string;
  email: string;
  /** Holds EVERY named role. */
  can: (...roles: string[]) => boolean;
  /** Holds ANY named role. */
  canAny: (...roles: string[]) => boolean;
  /** Reads a feature flag; absent flags read false, the safe side of a switch. */
  hasFlag: (key: string) => boolean;
}
