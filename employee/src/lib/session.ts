import { appConfig } from '../config/app-config';

/** SUPER_ADMIN can access every Duncit console regardless of app role. */
export const SUPER_ROLE = 'SUPER_ADMIN';

export function getToken(): string | null {
  try {
    return localStorage.getItem(appConfig.tokenKey);
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  localStorage.setItem(appConfig.tokenKey, token);
}

export function clearToken(): void {
  try {
    localStorage.removeItem(appConfig.tokenKey);
  } catch {
    /* storage unavailable — nothing to clear */
  }
}

/** Whether the given roles grant access to this app. */
export function hasAppAccess(roles?: readonly string[] | null): boolean {
  if (!roles || roles.length === 0) return false;
  if (roles.includes(SUPER_ROLE)) return true;
  return appConfig.requiredRoles.some((role) => roles.includes(role));
}

export function accessDeniedMessage(): string {
  return `You do not have access to ${appConfig.fullName}. Please contact your administrator.`;
}
