import { useUserData } from '@duncit/user-context';
import { managerRoles } from '../config/app-config';

/** Whether these roles include an MCP manager role (or SUPER_ADMIN). */
export function isManagerRoles(roles: readonly string[] | null | undefined): boolean {
  return (roles ?? []).some((role) => managerRoles.includes(role));
}

/**
 * Whether the signed-in person sees everyone's activity and the Settings page.
 * UI only: every read is scoped and every write is checked on the server.
 */
export function useIsMcpManager(): boolean {
  const { user } = useUserData();
  return isManagerRoles(user?.roles);
}
