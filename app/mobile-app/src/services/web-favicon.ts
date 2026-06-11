import { Platform } from 'react-native';

const FAVICON_RELS = ['icon', 'shortcut icon', 'apple-touch-icon'];

/**
 * Web build only (native.duncit.com): points the document favicon links at the
 * admin-configured URL (Branding → 1B Mobile App). No-op on native platforms
 * and until a URL is configured.
 */
export function setWebFavicon(url: string): void {
  if (Platform.OS !== 'web' || !url || typeof document === 'undefined') return;
  FAVICON_RELS.forEach((rel) => {
    let link = document.querySelector(`link[rel="${rel}"]`);
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', rel);
      document.head.appendChild(link);
    }
    link.setAttribute('href', url);
  });
}
