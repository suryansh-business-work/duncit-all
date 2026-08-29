import type { JSX } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useUserData } from '@duncit/user-context';
import { useProductVisibility } from '@duncit/app-settings';
import { hasPartnerRole, sectionFor } from '../config/partner-sections';

/**
 * Keeps each partner area's routes to the people who hold its role.
 *
 * Hiding a section from the sidebar is not enough on its own: the pages behind
 * it answer any signed-in user (the server scopes their data by account, not by
 * role), so a typed-in URL would still open an empty Venue Owner dashboard for
 * somebody the Onboarding or Admin portal never approved. Whoever lacks the role
 * goes back to `/`, which lands them where their own access says.
 *
 * The same is true of the product system flag: the E-Commerce Brand area — its
 * listings, its warehouses and their ShipRocket registration — is gone while the
 * flag is off, not merely absent from the sidebar.
 */
export default function SectionGate({ children }: Readonly<{ children: JSX.Element }>) {
  const { pathname } = useLocation();
  const { user } = useUserData();
  const { pending: productsPending, visible: productsVisible } = useProductVisibility();
  const section = sectionFor(pathname);
  if (!section) return children;
  // Nothing is decided until both answers land: judging early would bounce a
  // bookmarked partner page on the first paint. The portal chrome stays up.
  if (!user || productsPending) return null;
  if (!hasPartnerRole(user.roles, section.role)) return <Navigate to="/" replace />;
  if (section.products && !productsVisible) return <Navigate to="/" replace />;
  return children;
}
