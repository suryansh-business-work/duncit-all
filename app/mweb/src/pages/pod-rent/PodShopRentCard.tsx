import { useState, type ReactNode } from 'react';
import { Box, Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import ResponsiveDialog from '../../components/ResponsiveDialog';
import SectionHeader from '../../components/SectionHeader';
import { CAPPED_PANEL_SX } from '../../components/scroll-panel/scrollPanelSx';
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
  /** The viewer already holds this pod: Pod Rent is a listing with a note. */
  joined?: boolean;
}

/**
 * Pod Details' compact Pod Shop | Pod Rent card. See all opens a bottom sheet
 * named for this pod with everything it sells and rents, on the same tab. The
 * card's panel scrolls inside a capped height, so it never stretches the page.
 */
export default function PodShopRentCard({ podTitle, hasProducts, renderShop, rentals, picks, seats, joined = false }: Readonly<Props>) {
  const { t } = useTranslation();
  const [sheetOpen, setSheetOpen] = useState(false);
  const rentList = (limit?: number) => <PodRentList rentals={rentals} picks={picks} seats={seats} limit={limit} joined={joined} />;

  return (
    <Box data-testid="pod-shop-rent" sx={{ ...SURFACE_SX, p: 2, overflow: 'hidden' }}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <SectionHeader
          testId="pod-shop-rent-header"
          title={hasProducts ? t('mweb.shop.title') : t('venueRentals.guest.rentTab')}
        />
        <DuncitButton size="small" onClick={() => setSheetOpen(true)} data-testid="pod-shop-rent-see-all">
          {t('venueRentals.guest.seeAll')}
        </DuncitButton>
      </Stack>
      <PodShopRentTabs
        idPrefix="pod-shop-rent"
        hasProducts={hasProducts}
        shop={<Box sx={CAPPED_PANEL_SX}>{renderShop(PREVIEW_ROWS)}</Box>}
        rent={<Box sx={CAPPED_PANEL_SX}>{rentList(PREVIEW_ROWS)}</Box>}
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
