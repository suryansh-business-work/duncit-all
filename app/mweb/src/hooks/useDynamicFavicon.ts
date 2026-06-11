import { useEffect } from 'react';

const FAVICON_RELS = ['icon', 'shortcut icon', 'apple-touch-icon'];

/**
 * Points every favicon `<link>` at the admin-configured URL once branding
 * loads, replacing the static html links. No-op until a URL is configured.
 */
export function useDynamicFavicon(url: string) {
  useEffect(() => {
    if (!url) return;
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
  }, [url]);
}
