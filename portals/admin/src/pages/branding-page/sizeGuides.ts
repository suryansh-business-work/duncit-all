import type { PlatformPrefix } from './queries';

export interface PlatformSection {
  prefix: PlatformPrefix;
  title: string;
  subtitle: string;
  sizes: {
    favicon: string;
    logo: string;
    splashImage: string;
    splashVideo: string;
    note?: string;
  };
}

const FAVICON_GUIDE =
  'Square PNG 512×512 px (min 192×192), transparent background — shown at 48×48 in browser tabs and 180×180 on iOS home screens.';
const LOGO_GUIDE =
  'Transparent PNG/SVG — square 512×512 px, or wordmark up to 1024×256 px (max 4:1). Rendered at 36–58 px height in headers and auth pages.';
const SPLASH_PORTRAIT_IMAGE =
  'Portrait 9:16 — 1080×1920 px JPG/PNG, ≤ 1 MB. Shown full-screen while the app boots.';
const SPLASH_PORTRAIT_VIDEO =
  'Portrait 9:16 — 1080×1920 px MP4 (H.264), 3–6 s, ≤ 10 MB, no audio. Auto-plays muted while the app boots.';

/** The 1A / 1B / 1C platform accordions with their recommended asset sizes. */
export const PLATFORM_SECTIONS: PlatformSection[] = [
  {
    prefix: 'mweb',
    title: '1A · mWeb (duncit.com)',
    subtitle: 'Favicon, logo and the boot splash of the mobile-web app.',
    sizes: {
      favicon: FAVICON_GUIDE,
      logo: LOGO_GUIDE,
      splashImage: SPLASH_PORTRAIT_IMAGE,
      splashVideo: SPLASH_PORTRAIT_VIDEO,
    },
  },
  {
    prefix: 'mobile',
    title: '1B · Mobile App (Android / iOS / native web)',
    subtitle: 'Favicon (web build), logo and the in-app boot splash.',
    sizes: {
      favicon: FAVICON_GUIDE,
      logo: LOGO_GUIDE,
      splashImage: SPLASH_PORTRAIT_IMAGE,
      splashVideo: SPLASH_PORTRAIT_VIDEO,
      note: 'The store app icon and the OS launch screen ship inside the app binary (a new build is needed to change them). The favicon applies to the native web build, and the in-app boot splash below updates instantly.',
    },
  },
  {
    prefix: 'portals',
    title: '1C · Portals (admin / crm / tech / …)',
    subtitle: 'Favicon, logo and the boot splash shared by all consoles.',
    sizes: {
      favicon: FAVICON_GUIDE,
      logo: LOGO_GUIDE,
      splashImage:
        'Landscape 16:9 — 1920×1080 px JPG/PNG, ≤ 1 MB. Shown once per session while a console boots.',
      splashVideo:
        'Landscape 16:9 — 1920×1080 px MP4 (H.264), 2–5 s, ≤ 10 MB, no audio. Auto-plays muted once per session.',
    },
  },
];
