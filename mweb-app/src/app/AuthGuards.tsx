import { Navigate, useLocation } from 'react-router-dom';

export function RequireAuth({ children }: { children: JSX.Element }) {
  const isAuthed = !!localStorage.getItem('token');
  const location = useLocation();
  if (!isAuthed) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

export function RedirectIfAuthed({ children }: { children: JSX.Element }) {
  const isAuthed = !!localStorage.getItem('token');
  if (isAuthed) return <Navigate to="/" replace />;
  return children;
}
