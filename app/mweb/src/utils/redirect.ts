import { useSearchParams } from 'react-router';

export interface RedirectLocation {
  pathname: string;
  search: string;
  hash: string;
}

export function redirectPathFromLocation(location: RedirectLocation) {
  return `${location.pathname}${location.search}${location.hash}`;
}

/**
 * Where to land after a successful auth. The signup survey is a gate, not a
 * destination, so a pending deep link (an emailed `/booking/:id`, say) has to be
 * carried ACROSS it — dropping it here is what made the booking CTA land on the
 * home page for anyone who had not finished the survey. The native app already
 * parks and replays the same link, so this is rule-27 parity.
 */
export function postAuthPath(surveyCompleted: boolean, redirect?: string | null) {
  const target = getSafeRedirectPath(redirect) || '/';
  if (surveyCompleted) return target;
  if (target === '/') return '/signup-survey';
  return `/signup-survey?redirect=${encodeURIComponent(target)}`;
}

/**
 * An auth-screen path that keeps the pending deep link. Moving between login,
 * signup, password recovery, referral and survey must not drop `?redirect`, or
 * the visitor who tapped a pod on a public page lands on home instead of it.
 */
export function withRedirect(path: string, redirect?: string | null) {
  const target = getSafeRedirectPath(redirect);
  if (!target) return path;
  const joiner = path.includes('?') ? '&' : '?';
  return `${path}${joiner}redirect=${encodeURIComponent(target)}`;
}

/** `withRedirect` bound to the current screen's own `?redirect`, for its links. */
export function useWithRedirect() {
  const [params] = useSearchParams();
  const redirect = params.get('redirect');
  return (path: string) => withRedirect(path, redirect);
}

export function getSafeRedirectPath(value?: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '';
  if (value === '/login' || value.startsWith('/login?')) return '';
  if (value === '/register' || value.startsWith('/register?')) return '';
  return value;
}