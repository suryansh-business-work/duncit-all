import type { ReactElement } from 'react';
import { Route } from 'react-router';
import HostBannerKitPage from './HostBannerKitPage';
import HostBannersPage from './HostBannersPage';
import VenueBannerKitPage from './VenueBannerKitPage';
import VenueBannersPage from './VenueBannersPage';

/**
 * The Banner Kit and Banners pages of the Venue and Host studios. `authed` is
 * the console's page wrapper (sign-in, studio gate, page error boundary).
 */
export function bannerRoutes(authed: (page: ReactElement) => ReactElement) {
  return (
    <>
      <Route path="/venues/banner-kit" element={authed(<VenueBannerKitPage />)} />
      <Route path="/venues/banners" element={authed(<VenueBannersPage />)} />
      <Route path="/host/banner-kit" element={authed(<HostBannerKitPage />)} />
      <Route path="/host/banners" element={authed(<HostBannersPage />)} />
    </>
  );
}
