import { OnboardingSurvey } from '@/components/survey-onboarding/OnboardingSurvey';
import { useTranslation } from '@/hooks/useTranslation';

export function RegisterVenueScreen() {
  const { t } = useTranslation();
  return (
    <OnboardingSurvey
      kind="VENUE"
      title={t('mweb.registerVenue.beAVenueOwner')}
      icon="add-business"
      subtitle={t('mweb.registerVenue.listYourVenueAndHostPods')}
    />
  );
}
