import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { useTranslation } from '@/hooks/useTranslation';

export function PodPlansScreen() {
  const { t } = useTranslation();
  return (
    <PlaceholderScreen
      title={t('mweb.podPlans.podPlans')}
      icon="category"
      subtitle={t('mweb.podPlans.browsePlansAndPickWhatFits')}
    />
  );
}
