export interface RedirectLocation {
  pathname: string;
  search: string;
  hash: string;
}

export function redirectPathFromLocation(location: RedirectLocation) {
  return `${location.pathname}${location.search}${location.hash}`;
}

export function getSafeRedirectPath(value?: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '';
  if (value === '/login' || value.startsWith('/login?')) return '';
  return value;
}