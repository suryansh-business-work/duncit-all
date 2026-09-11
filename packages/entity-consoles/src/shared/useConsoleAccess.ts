import { useUserData } from '@duncit/user-context';

/**
 * What the signed-in viewer may do in a directory console.
 *
 * The five `ALL_*_ACCESS` roles say "you may use this console", and that is
 * enough to read every record and edit its own details — a name, an address,
 * photos, documents, contact, operating hours, categories.
 *
 * It is NOT enough to APPROVE a partner, move their percentages or flip them
 * dark. Those stay with the platform admins and the onboarding desk, because
 * granting somebody venues.duncit.com should not grant them the power to set a
 * venue's commission.
 *
 * The server enforces exactly this split (`server/src/modules/portals/console-access.ts`);
 * this hook exists so the screen does not offer a control that would be refused.
 * A missing role list reads as "cannot govern", which is the safe direction: the
 * worst case is an admin who has to reload, not a control that silently fails.
 */
const GOVERNOR_ROLES = ['SUPER_ADMIN', 'CITY_ADMIN', 'ZONAL_ADMIN', 'ONBOARDING_MANAGER'];

export interface ConsoleAccess {
  /** May approve/reject, change percentages, and activate or deactivate. */
  canGovern: boolean;
}

export function useConsoleAccess(): ConsoleAccess {
  const { user } = useUserData();
  const roles = new Set(user?.roles ?? []);
  return { canGovern: GOVERNOR_ROLES.some((role) => roles.has(role)) };
}
