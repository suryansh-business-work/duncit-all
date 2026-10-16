import { useState, type ReactNode } from 'react';
import { Box, Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import ResponsiveDialog from '../../components/ResponsiveDialog';
import SectionHeader from '../../components/SectionHeader';
import { SURFACE_SX } from '../../theme';
import { useTranslation } from '../../i18n/useTranslation';
import PodRentList from './PodRentList';
import PodShopRentTabs from './PodShopRentTabs';
import type { PodRentalPicks } from './usePodRentalPicks';
import type { PodRentals } from './usePodRentals';

/** Rows the Pod Details card shows of each list before See all. */
const PREVIEW_ROWS = 2;

interface Props {
  podTitle: string;
  hasProducts: boolean;
  /** The pod's shop, at the given row limit (undefined = every row). */
  renderShop: (limit?: number) => ReactNode;
  rentals: PodRentals;
  picks: PodRentalPicks;
  seats: number;
}

/**
 * Pod Details' compact Pod Shop | Pod Rent card. See all opens a bottom sheet
 * named for this pod with everything it sells and rents, on the same tab.
 */
export default function PodShopRentCard({ podTitle, hasProducts, renderShop, rentals, picks, seats }: Readonly<Props>) {
  const { t } = useTranslation();
  const [sheetOpen, setSheetOpen] = useState(false);
  const rentList = (limit?: number) => <PodRentList rentals={rentals} picks={picks} seats={seats} limit={limit} />;

  return (
    <Box data-testid="pod-shop-rent" sx={{ ...SURFACE_SX, p: 2, overflow: 'hidden' }}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <SectionHeader testId="pod-shop-rent-header" title={t('mweb.shop.title')} />
        <DuncitButton size="small" onClick={() => setSheetOpen(true)} data-testid="pod-shop-rent-see-all">
          {t('venueRentals.guest.seeAll')}
        </DuncitButton>
      </Stack>
      <PodShopRentTabs
        idPrefix="pod-shop-rent"
        hasProducts={hasProducts}
        shop={renderShop(PREVIEW_ROWS)}
        rent={rentList(PREVIEW_ROWS)}
      />
      <ResponsiveDialog
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={t('venueRentals.guest.sheetTitle', { vars: { pod: podTitle } })}
        bottomSheetOnly
        testId="pod-shop-rent-sheet"
      >
        <PodShopRentTabs idPrefix="pod-shop-rent-sheet" hasProducts={hasProducts} shop={renderShop()} rent={rentList()} />
      </ResponsiveDialog>
    </Box>
  );
}
