import { Text } from 'tamagui';

import { useTranslation } from '@/hooks/useTranslation';

/**
 * The venue's FSSAI licence number at the foot of its menu — Indian food law
 * asks every menu to show it. Nothing renders while the venue has not given
 * one. Tamagui twin of mWeb's food/FoodLicenceNote.
 */
export function FoodLicenceNote({ fssai }: Readonly<{ fssai?: string | null }>) {
  const { t } = useTranslation();
  const number = (fssai ?? '').trim();
  if (!number) return null;

  return (
    <Text fontSize={12} color="$muted" textAlign="center" testID="venue-food-fssai">
      {t('mweb.venueFood.fssai', { vars: { number } })}
    </Text>
  );
}
