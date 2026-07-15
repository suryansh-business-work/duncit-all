import { OnboardingSurvey } from '@/components/survey-onboarding/OnboardingSurvey';

export function BeClubAdminScreen() {
  return (
    <OnboardingSurvey
      kind="CLUB_ADMIN"
      title="Be a Club Admin"
      icon="groups"
      subtitle="Run a Duncit club and manage its pods and members."
    />
  );
}
