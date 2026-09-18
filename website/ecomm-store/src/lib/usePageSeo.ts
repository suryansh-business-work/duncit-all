import { usePageMeta } from '@duncit/app-settings';

import { useStoreSettings } from '../app/providers/StoreSettingsProvider';

/**
 * The document title and meta description for the page on screen, suffixed
 * with the store's name. The HTML server writes the same pair for crawlers.
 * An empty title (still loading) leaves the previous one in place.
 */
export function usePageSeo(title: string, description?: string): void {
  const settings = useStoreSettings();
  const own = description?.trim() ?? '';
  usePageMeta({
    title,
    description: own === '' ? settings.seo_description : own,
    appName: settings.store_name,
  });
}
