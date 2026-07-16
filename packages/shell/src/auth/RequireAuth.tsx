import { Navigate, useLocation } from 'react-router-dom';
import { redirectPathFromLocation } from '../lib/redirect';

export interface RequireAuthProps {
  /** Auth-token accessor — pass the portal session's `getToken`. */
  getToken: () => string | null;
  children: JSX.Element;
}

/**
 * Route guard every portal previously carried as an identical copy in its
 * `App.tsx`: unauthenticated visits bounce to `/login?redirect=<current path>`
 * (with the original location in router state) so login can return the user.
 */
export function RequireAuth({ getToken, children }: Readonly<RequireAuthProps>) {
  const location = useLocation();
  if (!getToken()) {
    const redirect = encodeURIComponent(redirectPathFromLocation(location));
    return <Navigate to={`/login?redirect=${redirect}`} replace state={{ from: location }} />;
  }
  return children;
}

export interface CreateAuthedOptions {
  /** Auth-token accessor — pass the portal session's `getToken`. */
  getToken: () => string | null;
  /** Wraps the routed page in the portal chrome, e.g. `(el) => <AppShell>{el}</AppShell>`. */
  wrap: (element: JSX.Element) => JSX.Element;
}

/**
 * Builds the `authed(<Page />)` helper the portals' route tables use:
 * `const authed = createAuthed({ getToken: session.getToken, wrap: (el) => <AppShell>{el}</AppShell> })`.
 * The `wrap` slot absorbs per-portal drift (CRM adds an ErrorBoundary inside its AppShell).
 */
export function createAuthed(options: Readonly<CreateAuthedOptions>) {
  const { getToken, wrap } = options;
  return (element: JSX.Element) => <RequireAuth getToken={getToken}>{wrap(element)}</RequireAuth>;
}
