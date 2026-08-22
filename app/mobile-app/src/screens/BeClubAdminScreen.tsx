import { OnboardingSurvey } from '@/components/survey-onboarding/OnboardingSurvey';
import { useTranslation } from '@/hooks/useTranslation';

export function BeClubAdminScreen() {
  const { t } = useTranslation();
  return (
    <OnboardingSurvey
      kind="CLUB_ADMIN"
      title={t('mweb.beClubAdmin.beAClubAdmin')}
      icon="groups"
      subtitle={t('mweb.beClubAdmin.runADuncitClubAndManage')}
    />
  );
}
