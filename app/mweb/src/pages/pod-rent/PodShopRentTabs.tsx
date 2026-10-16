import { useMemo, type ReactNode } from 'react';
import { Box } from '@mui/material';
import { DuncitTabs, TAB_PARAM, tabPanelProps, useTabParam, type DuncitTabItem } from '@duncit/tabs';
import { useTranslation } from '../../i18n/useTranslation';
import { SEGMENTED_TABS_SX } from '../gift-cards-page/segmentedSx';

export type ShopRentTab = 'shop' | 'rent';

/** Its own URL key: Pod Details already has other strips. The card and the sheet share it, so the sheet opens on the card's tab. */
const SHOP_RENT_PARAM = `${TAB_PARAM}_podshop`;

interface Props {
  idPrefix: string;
  /** Without products the strip offers Pod Rent alone. */
  hasProducts: boolean;
  shop: ReactNode;
  rent: ReactNode;
}

/** The Pod Shop | Pod Rent switch, and the panel it selects. */
export default function PodShopRentTabs({ idPrefix, hasProducts, shop, rent }: Readonly<Props>) {
  const { t } = useTranslation();
  const items = useMemo<DuncitTabItem<ShopRentTab>[]>(
    () => [
      ...(hasProducts ? [{ value: 'shop' as const, label: t('venueRentals.guest.shopTab'), testId: `${idPrefix}-tab-shop` }] : []),
      { value: 'rent', label: t('venueRentals.guest.rentTab'), testId: `${idPrefix}-tab-rent` },
    ],
    [hasProducts, idPrefix, t]
  );
  const tabs = useTabParam<ShopRentTab>({ items, fallback: hasProducts ? 'shop' : 'rent', param: SHOP_RENT_PARAM });
  return (
    <>
      <DuncitTabs {...tabs} idPrefix={idPrefix} variant="fullWidth" sx={SEGMENTED_TABS_SX} />
      <Box {...tabPanelProps(idPrefix, tabs.value)} sx={{ mt: 1.5 }}>
        {tabs.value === 'shop' ? shop : rent}
      </Box>
    </>
  );
}
