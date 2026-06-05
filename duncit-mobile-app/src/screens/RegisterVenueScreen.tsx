import { OnboardingSurvey } from '@/components/survey-onboarding/OnboardingSurvey';

export function RegisterVenueScreen() {
  return (
    <OnboardingSurvey
      kind="VENUE"
      title="Be a Venue Owner"
      icon="add-business"
      subtitle="List your venue and host pods at your space."
    />
  );
}
