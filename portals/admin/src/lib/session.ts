import { createSession } from '@duncit/shell';
import { appConfig } from '../config/app-config';

/**
 * Admin session helpers, built from the shared shell factory so the token-key
 * + role-gate logic lives in one place (@duncit/shell) instead of a local copy.
 */
export const { getToken, setToken, clearToken, hasAppAccess, accessDeniedMessage } = createSession(
  appConfig.tokenKey,
  appConfig.requiredRoles,
  appConfig.fullName,
);
