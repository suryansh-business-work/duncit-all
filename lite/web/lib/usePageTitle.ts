import { usePageMeta } from '@duncit/app-settings';
import { useLiteSettings } from '../app/providers/LiteSettingsProvider';

/** The document title for the page on screen, suffixed with the site's name. An empty title keeps the previous one. */
export function usePageTitle(title: string, description?: string): void {
  const { site_name } = useLiteSettings();
  usePageMeta({ title, description, appName: site_name });
}
