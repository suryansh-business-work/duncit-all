import { useId, useState } from 'react';
import { Alert, AlertTitle, Box, Checkbox, Link, Stack, Typography } from '@mui/material';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import DOMPurify from 'dompurify';
import { RICH_TEXT_BODY_SX } from '@duncit/ui';
import { rentalMoney, type RentalSummaryLine } from '@duncit/utils';
import ResponsiveDialog from '../../components/ResponsiveDialog';
import { useTranslation } from '../../i18n/useTranslation';
import SummaryRow from '../checkout-page/SummaryRow';
import type { CheckoutRentals } from './useCheckoutRentals';

interface RentalLinesProps {
  lines: readonly RentalSummaryLine[];
  currency: string;
  /** Finance's rule: false means the venue keeps the deposit. */
  depositRefundable: boolean;
  testId: string;
}

/** Each rented item on its own line — what it is, how many, its rent and its deposit. Shared with the confirmation. */
export function RentalItemLines({ lines, currency, depositRefundable, testId }: Readonly<RentalLinesProps>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={0.5} data-testid={testId}>
      {lines.map((line) => (
        <Box key={line.id}>
          <SummaryRow
            testId={`${testId}-${line.id}`}
            label={t('venueRentals.guest.itemLine', { vars: { name: line.name, quantity: line.quantity } })}
            value={rentalMoney(currency, line.rent)}
          />
          {line.deposit > 0 && (
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
              {depositRefundable
                ? t('venueRentals.guest.depositAtVenue', { vars: { amount: rentalMoney(currency, line.deposit) } })
                : `${t('venueRentals.guest.depositKept')} ${rentalMoney(currency, line.deposit)}`}
            </Typography>
          )}
        </Box>
      ))}
    </Stack>
  );
}

/** Where the items and their deposits are handled: at the venue, never refunded online. */
export function RentalCollectNotice({ depositRefundable }: Readonly<{ depositRefundable: boolean }>) {
  const { t } = useTranslation();
  return (
    <Alert severity="info" icon={<StorefrontOutlinedIcon fontSize="small" />} data-testid="rental-collect-notice">
      <AlertTitle>{t('venueRentals.guest.collectTitle')}</AlertTitle>
      {depositRefundable ? t('venueRentals.guest.collectNote') : t('venueRentals.guest.collectNoteKept')}
    </Alert>
  );
}

/** The bill's rental lines: every item, the rent and deposit totals, and where it is all settled. */
export function RentalBillRows({ rentals }: Readonly<{ rentals: CheckoutRentals }>) {
  const { t } = useTranslation();
  const { totals, currency, settings, lines } = rentals;
  if (totals.count === 0) return null;
  const refundable = settings?.deposit_refundable !== false;
  const depositLabel = refundable ? 'venueRentals.guest.depositLine' : 'venueRentals.guest.depositKept';
  return (
    <Stack spacing={0.75} data-testid="checkout-rentals-summary">
      <Typography variant="subtitle2" sx={{ pt: 0.5 }}>
        {t('venueRentals.guest.rentLine')}
      </Typography>
      <RentalItemLines lines={lines} currency={currency} depositRefundable={refundable} testId="checkout-rental-line" />
      <SummaryRow testId="checkout-rental-rent" label={t('venueRentals.guest.rentSubtotal')} value={`+ ${rentalMoney(currency, totals.rent)}`} />
      {totals.deposit > 0 && (
        <SummaryRow testId="checkout-rental-deposit" label={t(depositLabel)} value={`+ ${rentalMoney(currency, totals.deposit)}`} />
      )}
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {t('venueRentals.guest.ticketOnly')}
      </Typography>
      <RentalCollectNotice depositRefundable={refundable} />
    </Stack>
  );
}

/**
 * The guest agrees to the rental terms right above Pay. "rental terms" is a
 * link that opens Duncit's terms and the venue's own, read together.
 */
export function RentalTermsConsent({ rentals }: Readonly<{ rentals: CheckoutRentals }>) {
  const { t } = useTranslation();
  const checkboxId = useId();
  const [open, setOpen] = useState(false);
  if (rentals.totals.count === 0) return null;
  // The venue's terms are written by the venue, so both are sanitised before they become markup.
  const terms = DOMPurify.sanitize(rentals.settings?.terms_html ?? '');
  const venueTerms = DOMPurify.sanitize(rentals.venueTerms);
  const hasTerms = Boolean(terms || venueTerms);
  return (
    <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }} data-testid="checkout-rental-terms">
      <Checkbox
        id={checkboxId}
        checked={rentals.agreed}
        onChange={(_e, checked) => rentals.setAgreed(checked)}
        slotProps={{ input: { 'aria-describedby': hasTerms ? `${checkboxId}-terms` : undefined } }}
        sx={{ ml: -1 }}
        data-testid="checkout-rental-agree"
      />
      <Typography component="label" htmlFor={checkboxId} variant="body2">
        {t('venueRentals.guest.agreeLead')}
      </Typography>
      {hasTerms ? (
        <Link
          id={`${checkboxId}-terms`}
          component="button"
          type="button"
          variant="body2"
          onClick={() => setOpen(true)}
          data-testid="checkout-rental-terms-link"
        >
          {t('venueRentals.guest.termsLink')}
        </Link>
      ) : (
        <Typography variant="body2">{t('venueRentals.guest.termsLink')}</Typography>
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
