import { OnboardingSurvey } from '@/components/survey-onboarding/OnboardingSurvey';
import { useTranslation } from '@/hooks/useTranslation';

export function BecomeHostScreen() {
  const { t } = useTranslation();
  return (
    <OnboardingSurvey
      kind="HOST"
      title={t('mweb.becomeHost.beAHost')}
      icon="storefront"
      subtitle={t('mweb.becomeHost.startHostingPodsAndBringPeople')}
    />
  );
}
