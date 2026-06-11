import { OnboardingSurvey } from '@/components/survey-onboarding/OnboardingSurvey';

export function BecomeHostScreen() {
  return (
    <OnboardingSurvey
      kind="HOST"
      title="Be a host"
      icon="storefront"
      subtitle="Start hosting pods and bring people together."
    />
  );
}
