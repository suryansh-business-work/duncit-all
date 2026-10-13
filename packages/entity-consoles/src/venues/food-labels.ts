import type { useTranslation } from '@duncit/shell';

/**
 * How a dish's food type and spice level read, for the editor's selects and the
 * detail page's menu alike.
 *
 * Every label is a LITERAL `t('…')` rather than a key built from the enum value:
 * the localization gate reads the source, and a composed key is invisible to it
 * (rule 38). A value the server adds before this file learns it reads as itself
 * instead of as nothing.
 */
type Translate = ReturnType<typeof useTranslation>['t'];

export function foodDietLabel(t: Translate, diet: string): string {
  const labels: Record<string, string> = {
    VEG: t('directory.venueFood.dietVeg'),
    NON_VEG: t('directory.venueFood.dietNonVeg'),
    EGG: t('directory.venueFood.dietEgg'),
    VEGAN: t('directory.venueFood.dietVegan'),
  };
  return labels[diet] ?? diet;
}

export function foodSpiceLabel(t: Translate, level: string): string {
  const labels: Record<string, string> = {
    NONE: t('directory.venueFood.spiceNone'),
    MILD: t('directory.venueFood.spiceMild'),
    MEDIUM: t('directory.venueFood.spiceMedium'),
    HOT: t('directory.venueFood.spiceHot'),
    EXTRA_HOT: t('directory.venueFood.spiceExtraHot'),
  };
  return labels[level] ?? level;
}
