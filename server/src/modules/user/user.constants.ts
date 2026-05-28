export const ROLES = [
  'SUPER_ADMIN',
  'CITY_ADMIN',
  'ZONAL_ADMIN',
  'USER',
  'HOST',
  'VENUE_OWNER',
  'ECOMM_MANAGER',
  'SUPPORT_USER',
  'FINANCE_USER',
  'ADS_MANAGER',
  'CRM_MANAGER',
  'FINANCE_MANAGER',
  'TECH_MANAGER',
  'SUPPORT_MANAGER',
  'WEBSITE_MANAGER',
  'LEGAL_MANAGER',
  'AI_MANAGER',
  'PRODUCTS_MANAGER',
  'MARKETING_MANAGER',
] as const;

export type UserRole = (typeof ROLES)[number];

export const STATUSES = ['ACTIVE', 'INACTIVE', 'SUSPENDED'] as const;
export type UserStatus = (typeof STATUSES)[number];

// Future-proof: per-role permission map.
export const PERMISSIONS = [
  'CREATE_POD',
  'DELETE_USER',
  'VIEW_FINANCE',
  'MANAGE_USERS',
  'MANAGE_VENUES',
  'MANAGE_CITY',
  'MANAGE_ZONE',
] as const;
export type Permission = (typeof PERMISSIONS)[number];

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  SUPER_ADMIN: [...PERMISSIONS],
  CITY_ADMIN: ['MANAGE_USERS', 'MANAGE_VENUES', 'MANAGE_CITY', 'CREATE_POD'],
  ZONAL_ADMIN: ['MANAGE_USERS', 'MANAGE_ZONE', 'CREATE_POD'],
  SUPPORT_USER: ['MANAGE_USERS'],
  FINANCE_USER: ['VIEW_FINANCE'],
  ECOMM_MANAGER: [],
  ADS_MANAGER: [],
  CRM_MANAGER: [],
  FINANCE_MANAGER: [],
  TECH_MANAGER: [],
  SUPPORT_MANAGER: [],
  WEBSITE_MANAGER: [],
  LEGAL_MANAGER: [],
  AI_MANAGER: [],
  PRODUCTS_MANAGER: [],
  MARKETING_MANAGER: [],
  HOST: [],
  VENUE_OWNER: ['MANAGE_VENUES'],
  USER: [],
};
