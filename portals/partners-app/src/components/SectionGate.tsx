import { Navigate, useLocation } from 'react-router-dom';
import { useUserData } from '@duncit/user-context';
import { hasPartnerRole, sectionRoleFor } from '../config/partner-sections';

/**
 * Keeps each partner area's routes to the people who hold its role.
 *
 * Hiding a section from the sidebar is not enough on its own: the pages behind
 * it answer any signed-in user (the server scopes their data by account, not by
 * role), so a typed-in URL would still open an empty Venue Owner dashboard for
 * somebody the Onboarding or Admin portal never approved. Whoever lacks the role
 * goes back to `/`, which lands them where their own access says.
 */
export default function SectionGate({ children }: Readonly<{ children: JSX.Element }>) {
  const { pathname } = useLocation();
  const { user } = useUserData();
  const role = sectionRoleFor(pathname);
  if (!role) return children;
  // No user yet (the first load after sign-in): there is no role to judge, so
  // nothing renders until it arrives — the portal chrome around it stays up.
  if (!user) return null;
  if (!hasPartnerRole(user.roles, role)) return <Navigate to="/" replace />;
  return children;
}
