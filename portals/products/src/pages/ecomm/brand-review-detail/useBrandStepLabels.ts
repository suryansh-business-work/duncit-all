import { useTranslation } from '@duncit/shell';

/**
 * The wizard step names, keyed the way the server's `completion.steps` are.
 *
 * Written out as literal `t('…')` calls rather than composed from the step key:
 * the translation-key gate greps source for the literal, and a computed key
 * would be reported as shipped-but-never-rendered.
 */
export function useBrandStepLabels(): Record<string, string> {
  const { t } = useTranslation();
  return {
    details: t('products.brandReview.step.details'),
    business: t('products.brandReview.step.business'),
    address: t('products.brandReview.step.address'),
    payout: t('products.brandReview.step.payout'),
    categories: t('products.brandReview.step.categories'),
    media: t('products.brandReview.step.media'),
    documents: t('products.brandReview.step.documents'),
    integration: t('products.brandReview.step.integration'),
    review: t('products.brandReview.step.review'),
    consent: t('products.brandReview.step.consent'),
  };
}
