import { OnboardingSurvey } from '@/components/survey-onboarding/OnboardingSurvey';

/** "By Listing your Product" onboarding gate — category → ECOMM survey (when
 * authored) → onboarding meeting. Twin of mWeb's /survey/ecomm. */
export function ListProductScreen() {
  return (
    <OnboardingSurvey
      kind="ECOMM"
      title="List your product"
      icon="inventory-2"
      subtitle="Sell your products to the Duncit community."
    />
  );
}
