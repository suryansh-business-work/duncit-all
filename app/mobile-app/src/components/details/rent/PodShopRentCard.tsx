import { useState, type ReactNode } from 'react';
import { Text, XStack, YStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { DuncitDialog } from '@/components/DuncitDialog/DuncitDialog';
import { PillTabs, type PillTab } from '@/components/PillTabs';
import { SectionHeader } from '@/components/SectionHeader';
import { SurfaceCard } from '@/components/SurfaceCard';
import type { PodRentals } from '@/hooks/usePodRentals';
import { useTranslation } from '@/hooks/useTranslation';
import type { PodRentalPicks } from '@/stores/rental-picks.store';

import { PodRentList } from './PodRentList';

type ShopRentTab = 'shop' | 'rent';

const TABS: readonly PillTab<ShopRentTab>[] = [
  { key: 'shop', labelKey: 'venueRentals.guest.shopTab' },
  { key: 'rent', labelKey: 'venueRentals.guest.rentTab' },
];

/** Rows the Pod Details card shows of the rentals before See all. */
const PREVIEW_ROWS = 2;

interface Props {
  podTitle: string;
  hasProducts: boolean;
  /** The pod's shop, drawn flat inside this card. */
  shop: ReactNode;
  rentals: PodRentals;
  picks: PodRentalPicks;
  seats: number;
}

/**
 * Pod Details' Pod Shop | Pod Rent card. The switch shows only when the pod both
 * sells and rents; a rent-only pod's card is simply "Pod Rent". See all opens a sheet named for this
 * pod with everything it sells and rents. RN twin of mWeb's PodShopRentCard.
 */
export function PodShopRentCard({
  podTitle,
  hasProducts,
  shop,
  rentals,
  picks,
  seats,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<ShopRentTab>(hasProducts ? 'shop' : 'rent');
  const [sheetOpen, setSheetOpen] = useState(false);
  const shown = hasProducts ? tab : 'rent';
  const title = hasProducts ? t('mweb.shop.title') : t('venueRentals.guest.rentTab');
  return (
    <SurfaceCard marginHorizontal={16} marginTop={20} gap={14} testID="pod-shop-rent">
      <XStack alignItems="center" justifyContent="space-between" gap={12}>
        <YStack flex={1}>
          <SectionHeader title={title} />
        </YStack>
        <XStack
          role="button"
          tabIndex={0}
          aria-label={t('venueRentals.guest.seeAll')}
          testID="pod-shop-rent-see-all"
          hitSlop={8}
          onPress={() => setSheetOpen(true)}
          {...PRESS_STYLE}
        >
          <Text fontSize={13} fontWeight="700" color="$accent">
            {t('venueRentals.guest.seeAll')}
          </Text>
        </XStack>
      </XStack>
      {hasProducts ? (
        <PillTabs
          tabs={TABS}
          value={shown}
          onChange={setTab}
          ariaLabel={title}
          testIDPrefix="pod-shop-rent-tab"
        />
      ) : null}
      {shown === 'shop' ? (
        shop
      ) : (
        <PodRentList rentals={rentals} picks={picks} seats={seats} limit={PREVIEW_ROWS} />
      )}
      <DuncitDialog
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        testID="pod-shop-rent-sheet"
        title={t('venueRentals.guest.sheetTitle', { vars: { pod: podTitle } })}
        closeLabel={t('mweb.common.close')}
      >
        <YStack gap={16}>
          {hasProducts ? (
            <YStack gap={8}>
              <SectionHeader title={t('venueRentals.guest.shopTab')} />
              {shop}
            </YStack>
          ) : null}
          <YStack gap={8}>
            {/* A rent-only sheet needs no sub-heading: the card already says Pod Rent. */}
            {hasProducts ? <SectionHeader title={t('venueRentals.guest.rentTab')} /> : null}
            <PodRentList rentals={rentals} picks={picks} seats={seats} />
          </YStack>
        </YStack>
      </DuncitDialog>
    </SurfaceCard>
  );
}
