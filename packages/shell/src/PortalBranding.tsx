import { useEffect, useState } from 'react';
import { gql, useQuery } from '@apollo/client';

const PORTAL_BRANDING = gql`
  query PortalBranding {
    branding {
      app_name
      portals_favicon_url
      portals_splash_url
      portals_splash_type
    }
  }
`;

const FAVICON_RELS = ['icon', 'shortcut icon', 'apple-touch-icon'];
const SPLASH_SESSION_KEY = 'duncit_portal_splash_shown';
const IMAGE_SPLASH_MS = 1800;
const VIDEO_SPLASH_MS = 3200;

/** Points every favicon `<link>` at the admin-configured URL. */
function applyFavicon(url: string): void {
  FAVICON_RELS.forEach((rel) => {
    const links = document.querySelectorAll(`link[rel="${rel}"]`);
    if (links.length === 0) {
      const link = document.createElement('link');
      link.rel = rel;
      link.href = url;
      document.head.appendChild(link);
      return;
    }
    links.forEach((el) => {
      el.setAttribute('href', url);
      el.removeAttribute('type');
    });
  });
}

const splashStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 99999,
  background: '#F82C2E',
};

const splashMediaStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
};

/**
 * Console-wide branding side effects from the admin Branding → 1C Portals
 * accordion: swaps the favicon to the configured one, and shows the configured
 * splash image/video once per session while the console boots. Renders nothing
 * when the assets aren't configured.
 */
export function PortalBranding(): React.ReactElement | null {
  const { data } = useQuery(PORTAL_BRANDING, { fetchPolicy: 'cache-first' });
  const branding = data?.branding;
  const splashUrl: string = branding?.portals_splash_url || '';
  const isVideo = branding?.portals_splash_type === 'VIDEO';
  const [splashOpen, setSplashOpen] = useState(
    () => typeof window !== 'undefined' && !sessionStorage.getItem(SPLASH_SESSION_KEY),
  );

  useEffect(() => {
    const faviconUrl: string = branding?.portals_favicon_url || '';
    if (faviconUrl) applyFavicon(faviconUrl);
  }, [branding?.portals_favicon_url]);

  useEffect(() => {
    if (!splashOpen || !splashUrl) return;
    const timer = window.setTimeout(
      () => {
        sessionStorage.setItem(SPLASH_SESSION_KEY, '1');
        setSplashOpen(false);
      },
      isVideo ? VIDEO_SPLASH_MS : IMAGE_SPLASH_MS,
    );
    return () => window.clearTimeout(timer);
  }, [splashOpen, splashUrl, isVideo]);

  if (!splashOpen || !splashUrl) return null;

  return (
    <output aria-label={`Loading ${branding?.app_name || 'Duncit'}`} style={splashStyle}>
      {isVideo ? (
        <video src={splashUrl} autoPlay muted loop playsInline style={splashMediaStyle} />
      ) : (
        <img src={splashUrl} alt={branding?.app_name || 'Duncit'} style={splashMediaStyle} />
      )}
    </output>
  );
}
