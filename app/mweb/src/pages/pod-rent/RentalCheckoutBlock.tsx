import { useState } from 'react';
import { Box, Checkbox, FormControlLabel, Link, Stack, Typography } from '@mui/material';
import DOMPurify from 'dompurify';
import { RICH_TEXT_BODY_SX } from '@duncit/ui';
import { rentalMoney } from '@duncit/utils';
import ResponsiveDialog from '../../components/ResponsiveDialog';
import { useTranslation } from '../../i18n/useTranslation';
import SummaryRow from '../checkout-page/SummaryRow';
import type { CheckoutRentals } from './useCheckoutRentals';

/** The bill's rental lines: the rent, the deposit (refundable or kept, per Finance's rule), and the ticket-only note. */
export function RentalBillRows({ rentals }: Readonly<{ rentals: CheckoutRentals }>) {
  const { t } = useTranslation();
  const { totals, currency, settings } = rentals;
  if (totals.count === 0) return null;
  const depositLabel = settings?.deposit_refundable === false ? 'venueRentals.guest.depositKept' : 'venueRentals.guest.depositLine';
  return (
    <>
      <SummaryRow testId="checkout-rental-rent" label={t('venueRentals.guest.rentLine')} value={`+ ${rentalMoney(currency, totals.rent)}`} />
      {totals.deposit > 0 && (
        <SummaryRow testId="checkout-rental-deposit" label={t(depositLabel)} value={`+ ${rentalMoney(currency, totals.deposit)}`} />
      )}
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {t('venueRentals.guest.ticketOnly')}
      </Typography>
    </>
  );
}

/** The guest agrees to Finance's rental terms before paying for rented items. */
export function RentalTermsConsent({ rentals }: Readonly<{ rentals: CheckoutRentals }>) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  if (rentals.totals.count === 0) return null;
  // Duncit's terms and the venue's own, read together. The venue's are written
  // by the venue, so both are sanitised before they become markup.
  const terms = DOMPurify.sanitize(rentals.settings?.terms_html ?? '');
  const venueTerms = DOMPurify.sanitize(rentals.venueTerms);
  return (
    <Stack spacing={0.5} data-testid="checkout-rental-terms">
      <FormControlLabel
        control={<Checkbox checked={rentals.agreed} onChange={(_e, checked) => rentals.setAgreed(checked)} />}
        label={t('venueRentals.guest.agree')}
      />
      {(terms || venueTerms) && (
        <Link component="button" type="button" variant="body2" onClick={() => setOpen(true)} sx={{ alignSelf: 'flex-start' }}>
          {t('venueRentals.guest.termsTitle')}
        </Link>
      )}
      <ResponsiveDialog open={open} onClose={() => setOpen(false)} title={t('venueRentals.guest.termsTitle')} testId="rental-terms-dialog">
        {terms && (
          <Box component="section" aria-label={t('venueRentals.guest.duncitTerms')}>
            <Typography variant="subtitle2">{t('venueRentals.guest.duncitTerms')}</Typography>
            <Box sx={RICH_TEXT_BODY_SX} dangerouslySetInnerHTML={{ __html: terms }} />
          </Box>
        )}
        {venueTerms && (
          <Box component="section" aria-label={t('venueRentals.guest.venueTerms')} sx={{ mt: 2 }}>
            <Typography variant="subtitle2">{t('venueRentals.guest.venueTerms')}</Typography>
            <Box sx={RICH_TEXT_BODY_SX} dangerouslySetInnerHTML={{ __html: venueTerms }} />
          </Box>
        )}
      </ResponsiveDialog>
    </Stack>
  );
}
