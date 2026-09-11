import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { useTranslation } from '@/hooks/useTranslation';

/** Pod Plans — not built on native yet, so the placeholder says so plainly
 * (its own "coming soon" line) rather than a tagline. */
export function PodPlansScreen() {
  const { t } = useTranslation();
  return <PlaceholderScreen title={t('mweb.podPlans.podPlans')} icon="category" />;
}
