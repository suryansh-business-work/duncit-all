import { Navigate, useLocation } from 'react-router';

/**
 * An old address that moved. The query string and hash travel with it, so a
 * bookmarked filter — or the OAuth callback's `?connected=…` — still lands.
 */
export default function Redirect({ to }: Readonly<{ to: string }>) {
  const { search, hash } = useLocation();
  return <Navigate to={{ pathname: to, search, hash }} replace />;
}
