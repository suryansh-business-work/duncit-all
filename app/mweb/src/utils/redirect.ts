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

export function getSafeRedirectPath(value?: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '';
  if (value === '/login' || value.startsWith('/login?')) return '';
  if (value === '/register' || value.startsWith('/register?')) return '';
  return value;
}