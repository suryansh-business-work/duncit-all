import { OnboardingSurvey } from '@/components/survey-onboarding/OnboardingSurvey';
import { useTranslation } from '@/hooks/useTranslation';

/** "By Listing your Product" onboarding gate — category → ECOMM survey (when
 * authored) → onboarding meeting. Twin of mWeb's /survey/ecomm. */
export function ListProductScreen() {
  const { t } = useTranslation();
  return (
    <OnboardingSurvey
      kind="ECOMM"
      title={t('mweb.listProduct.listYourProduct')}
      icon="inventory-2"
      subtitle={t('mweb.listProduct.sellYourProductsToTheDuncit')}
    />
  );
}
