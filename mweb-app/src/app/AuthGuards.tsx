import { Navigate, useLocation } from 'react-router-dom';
import { getSafeRedirectPath, redirectPathFromLocation } from '../utils/redirect';

export function RequireAuth({ children }: { children: JSX.Element }) {
  const isAuthed = !!localStorage.getItem('token');
  const location = useLocation();
  if (!isAuthed) {
    const redirect = encodeURIComponent(redirectPathFromLocation(location));
    return <Navigate to={`/login?redirect=${redirect}`} state={{ from: location }} replace />;
  }
  return children;
}

export function RedirectIfAuthed({ children }: { children: JSX.Element }) {
  const isAuthed = !!localStorage.getItem('token');
  const location = useLocation();
  if (isAuthed) {
    const redirect = getSafeRedirectPath(new URLSearchParams(location.search).get('redirect'));
    return <Navigate to={redirect || '/'} replace />;
  }
  return children;
}
