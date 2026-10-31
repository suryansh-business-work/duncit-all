import { reportJourneyForCurrentRoute } from '@/services/short-link-attribution';
import { trackCurrentScreen } from '@/services/product-analytics';

/**
 * NavigationContainer's onStateChange: the short-link journey step of the
 * screen just reached, and its product-analytics screen view.
 */
export function onRouteChange(): void {
  reportJourneyForCurrentRoute();
  trackCurrentScreen();
}
