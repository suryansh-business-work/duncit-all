/**
 * The ONE `me` selection every surface reads the session through.
 *
 * A plain string, not a `gql` document, because the native app cannot import
 * @apollo/client: web wraps this in `gql(...)`, native hands it to
 * graphql-request as-is. That is the whole reason this package is
 * framework-free.
 *
 * It replaces a genuinely surprising amount of drift — the survey found 24
 * separate `me { … }` selections in mWeb alone, plus hand-rolled overrides in
 * `portals/admin/src/adminSession.ts` and `app/mweb/src/main.tsx` that both
 * omitted `locale`, which is why the account language silently failed to follow
 * a user into those two surfaces.
 */
export const ME_FIELDS = `
    user_id
    first_name
    last_name
    full_name
    email
    phone_number
    phone_extension
    profile_photo
    bio
    roles
    locale
    timezone
    country
    city
    state
    zone
    assigned_city
    assigned_zones
    selected_location_id
    is_email_verified
    is_phone_verified
    onboarding_survey_completed
    created_at
    updated_at
`;

/**
 * The full query source.
 *
 * @param operationName Distinct per surface so Apollo's cache and any devtools
 *   can tell an admin session read from an mWeb one.
 * @param extraFields Appended inside the `me { … }` block for a surface that
 *   needs more than the shared shape.
 */
export function buildMeQuerySource(operationName = 'SessionMe', extraFields = ''): string {
  const extra = extraFields.trim() ? `\n    ${extraFields.trim()}` : '';
  return `
  query ${operationName} {
    me {${ME_FIELDS}${extra}
    }
  }
`;
}
