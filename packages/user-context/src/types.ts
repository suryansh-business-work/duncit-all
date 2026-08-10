// Loose shape covering fields returned by each app's `me` query. Apps can pass
// a more specific type to `useUserData<MyUser>()` — the generic is unconstrained
// so every app's existing local type continues to work without forcing an index
// signature onto it.
//
// There is deliberately NO `id` here. The field existed for years, no query ever
// selected it and the server has never had one — its only effect was to make
// `user?.id ?? ''` compile in the shell and hand staff chat an empty `meId`, so
// every message looked like someone else's. The server's identity field is
// `user_id`.
//
// For the strict, normalised shape — plus device, flags and the derivations —
// use `useSession()`, which returns `@duncit/user-core`'s `SessionUser`.
export interface DuncitUser {
  user_id?: string | null;
  email?: string | null;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  profile_photo?: string | null;
  phone_number?: string | null;
  phone_extension?: string | null;
  bio?: string | null;
  roles?: string[] | null;
  /** The account's saved language (`profile.locale`) — what makes a language
   * choice follow the user to a new device, not just persist on this one. */
  locale?: string | null;
  /** IANA zone from the account; '' or null means "use the device zone". */
  timezone?: string | null;
  country?: string | null;
  city?: string | null;
  state?: string | null;
  zone?: string | null;
  assigned_city?: string | null;
  assigned_zones?: string[] | null;
  selected_location_id?: string | null;
  is_email_verified?: boolean | null;
  is_phone_verified?: boolean | null;
  onboarding_survey_completed?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
}
