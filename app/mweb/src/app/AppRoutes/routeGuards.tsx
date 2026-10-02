import { JSX, useEffect } from 'react';
import { Navigate } from 'react-router';
import { useProductVisibility } from '@duncit/app-settings';
import { RedirectIfAuthed, RequireAuth } from '../AuthGuards';
import RouteFallback from '../RouteFallback';

export interface AppRoutesProps {
  superCategory: string;
  locationId: string;
  zoneName: string;
}

export const withAuth = (element: JSX.Element) => <RequireAuth>{element}</RequireAuth>;
export const redirectIfAuthed = (element: JSX.Element) => <RedirectIfAuthed>{element}</RedirectIfAuthed>;

export function PartnerRedirect({ path }: Readonly<{ path: string }>) {
  useEffect(() => {
    globalThis.window.location.replace(`https://partners-app.duncit.com${path}`);
  }, [path]);
  return null;
}

/**
 * Product routes exist only while the `is_product_visible` system flag is on.
 * With it off they are not 404s — they are pages the app currently has no
 * feature for — so they send the visitor home instead of to Not Found.
 *
 * It waits on `pending`: the flag set arrives a beat after the first paint, and
 * redirecting on that beat would bounce every bookmarked /shop link home even
 * when products are switched on.
 */
function RequireProducts({ children }: Readonly<{ children: JSX.Element }>) {
  const { pending, visible } = useProductVisibility();
  if (pending) return <RouteFallback />;
  if (!visible) return <Navigate to="/" replace />;
  return children;
}

/** Signed-in AND products on — every product page needs both. */
export const withProducts = (element: JSX.Element) => withAuth(<RequireProducts>{element}</RequireProducts>);
