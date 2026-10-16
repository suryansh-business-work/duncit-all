import { useState } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '../../i18n/useTranslation';
import VenueChargesDialog, { type VenueCharge } from './VenueChargesDialog';

interface Props {
  charges: VenueCharge[];
  currency: string;
  fmt: (value: number) => string;
}

/** Charges paid directly at the venue — shown for transparency, never added to the online total. */
export default function VenueChargesBox({ charges, currency, fmt }: Readonly<Props>) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const total = charges.reduce((sum, charge) => sum + Number(charge.amount || 0), 0);
  if (charges.length === 0) return null;
  return (
    <>
      <Box data-testid="venue-charges-row" sx={{ mt: 1, p: 1.5, borderRadius: '16px', bgcolor: 'action.hover' }}>
        <Stack
          direction="row"
          spacing={1}
          sx={{
            justifyContent: "space-between",
            alignItems: "center"
          }}>
          <Stack direction="row" spacing={0.5} sx={{
            alignItems: "center"
          }}>
            <Typography variant="body2" sx={{
              fontWeight: 600
            }}>{t('mweb.checkout.venueCharges')}</Typography>
            <DuncitIconButton data-testid="venue-charges-info" size="small" aria-label={t('mweb.checkout.venueChargesAbout')} onClick={() => setOpen(true)} sx={{ p: 0.25 }}>
              <InfoOutlinedIcon fontSize="inherit" color="action" />
            </DuncitIconButton>
          </Stack>
          <Typography variant="body2" sx={{
            fontWeight: 700
          }}>{fmt(total)}</Typography>
        </Stack>
        <Typography variant="caption" sx={{
          color: "text.secondary"
        }}>{t('mweb.checkout.venuePayAtVenue')}</Typography>
      </Box>
      <VenueChargesDialog open={open} charges={charges} currency={currency} onClose={() => setOpen(false)} />
    </>
  );
}
