import { useUserData } from '@duncit/user-context';
import { CONTROL_ROLE } from './types';

/**
 * Whether this operator may pull the Control Center levers. Only a UI hint —
 * the server refuses the mutation for anyone else (requireAskDuncitControl).
 */
export function useCanControl(): boolean {
  const { user } = useUserData();
  return Boolean(user?.roles?.includes(CONTROL_ROLE));
}
