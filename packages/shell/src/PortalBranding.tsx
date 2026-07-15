import { useEffect, useState } from 'react';
import { gql, useQuery } from '@apollo/client';

const PORTAL_BRANDING = gql`
  query PortalBranding {
    branding {
      app_name
      portals_favicon_url
      portals_splash_url
      portals_splash_type
      portals_font_family
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

/** Loads the admin-picked Google Font and applies it console-wide. Returns the
 * cleanup that removes both injected tags. */
function applyPortalFont(family: string): () => void {
  const enc = family.trim().replace(/ /g, '+');
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${enc}:wght@400;500;600;700;800;900&display=swap`;
  document.head.appendChild(link);
  const style = document.createElement('style');
  // The #root id selector outranks MUI's class selectors, so the picked family
  // wins without !important; SVG icons are unaffected (no font glyphs).
  style.textContent = `#root, #root * { font-family: '${family}', 'Quicksand', sans-serif; }`;
  document.head.appendChild(style);
  return () => {
    link.remove();
    style.remove();
  };
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
    () => typeof globalThis.window !== 'undefined' && !sessionStorage.getItem(SPLASH_SESSION_KEY),
  );

  useEffect(() => {
    const faviconUrl: string = branding?.portals_favicon_url || '';
    if (faviconUrl) applyFavicon(faviconUrl);
  }, [branding?.portals_favicon_url]);

  useEffect(() => {
    const family: string = branding?.portals_font_family || '';
    if (!family) return undefined;
    return applyPortalFont(family);
  }, [branding?.portals_font_family]);

  useEffect(() => {
    if (!splashOpen || !splashUrl) return;
    const timer = globalThis.setTimeout(
      () => {
        sessionStorage.setItem(SPLASH_SESSION_KEY, '1');
        setSplashOpen(false);
      },
      isVideo ? VIDEO_SPLASH_MS : IMAGE_SPLASH_MS,
    );
    return () => globalThis.clearTimeout(timer);
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
