// Loose shape covering fields commonly returned by each app's `me` query.
// Apps can pass a more specific type to `useUserData<MyUser>()` — the generic
// is unconstrained so every app's existing local type continues to work
// without forcing an index signature onto it.
export interface DuncitUser {
  id?: string | null;
  user_id?: string | null;
  email?: string | null;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  profile_photo?: string | null;
  roles?: string[] | null;
}
