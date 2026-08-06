/**
 * The roles that make someone a coworker.
 *
 * The union of every portal's `requiredRoles` — anyone who can sign in to a
 * staff console. It mirrors the server's own list, which is the one that
 * actually decides: this copy only avoids drawing a chat button for a person
 * the server would refuse.
 */
export const STAFF_CHAT_ROLES = new Set([
  'SUPER_ADMIN',
  'CITY_ADMIN',
  'ZONAL_ADMIN',
  'TECH_MANAGER',
  'PRODUCTS_MANAGER',
  'MARKETING_MANAGER',
  'CRM_MANAGER',
  'CHALLENGE_MANAGER',
  'AI_MANAGER',
  'WEBSITE_MANAGER',
  'HR_MANAGER',
  'FINANCE_MANAGER',
  'DEVELOPERS_MANAGER',
  'LEGAL_MANAGER',
  'ONBOARDING_MANAGER',
  'EMPLOYEE',
  'SUPPORT_MANAGER',
  'ADS_MANAGER',
]);
