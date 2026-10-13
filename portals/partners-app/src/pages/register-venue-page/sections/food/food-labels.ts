import type { Translate } from '@duncit/shell';

/** Food type, in the reader's language. Keys are literal for the localization
 * gate; a value the bundle does not know yet shows as the server sent it. */
export const foodDietLabel = (t: Translate, diet: string): string => {
  const labels: Record<string, string> = {
    VEG: t('partners.registerVenuePage.foodDiet.VEG'),
    NON_VEG: t('partners.registerVenuePage.foodDiet.NON_VEG'),
    EGG: t('partners.registerVenuePage.foodDiet.EGG'),
    VEGAN: t('partners.registerVenuePage.foodDiet.VEGAN'),
  };
  return labels[diet] ?? diet;
};

export const foodSpiceLabel = (t: Translate, level: string): string => {
  const labels: Record<string, string> = {
    NONE: t('partners.registerVenuePage.foodSpice.NONE'),
    MILD: t('partners.registerVenuePage.foodSpice.MILD'),
    MEDIUM: t('partners.registerVenuePage.foodSpice.MEDIUM'),
    HOT: t('partners.registerVenuePage.foodSpice.HOT'),
    EXTRA_HOT: t('partners.registerVenuePage.foodSpice.EXTRA_HOT'),
  };
  return labels[level] ?? level;
};
