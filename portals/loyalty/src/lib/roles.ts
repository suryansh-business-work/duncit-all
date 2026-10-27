import { useUserData } from '@duncit/user-context';
import { writeRoles } from '../config/app-config';

/**
 * Whether the signed-in person may act in this console (reveal, export, cancel,
 * generate). UI only: every one of those calls is checked on the server.
 */
export function useCanWrite(): boolean {
  const { user } = useUserData();
  return (user?.roles ?? []).some((role) => writeRoles.includes(role));
}
