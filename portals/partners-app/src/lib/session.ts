import { createSession } from '@duncit/shell';
import { appConfig } from '../config/app-config';

/**
 * Portal session helpers, built from the shared shell factory so the token-key
 * + role-gate logic lives in one place (@duncit/shell) instead of a local copy.
 * Partners is portal-gate-exempt, so `requiredRoles` is empty and access is not
 * gated on the client — the helpers are still used for token storage.
 */
export const { getToken, setToken, clearToken, hasAppAccess, accessDeniedMessage } = createSession(
  appConfig.tokenKey,
  appConfig.requiredRoles,
  appConfig.fullName,
);
