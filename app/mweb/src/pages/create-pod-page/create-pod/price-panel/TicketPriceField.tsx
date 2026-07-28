import { useState } from 'react';
import { InputAdornment, Link, Stack, TextField, Typography } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { usePricing } from '../../../../hooks/usePricing';
import type { CreatePodForm } from '../create-pod.types';
import type { EarningsPreview } from './useEarningsPreview';
import SuggestedPricesDialog from './SuggestedPricesDialog';
import ZeroEarningsNotice from './ZeroEarningsNotice';
import { SUGGESTED_PRICES_LINK, TICKET_PRICE_LABEL } from './pricingCopy';

interface Props {
  form: CreatePodForm;
  preview: EarningsPreview;
  isFree: boolean;
}

const FIELD_ID = 'create-pod-ticket-price';

/** The Step-4 ticket price: its label with the "Suggested Price ⓘ" link to the
 * RIGHT, the amount input, and the zero-earnings notice that blocks publishing
 * when the projected payout is ₹0. Native twin (rule 27). */
export default function TicketPriceField({ form, preview, isFree }: Readonly<Props>) {
  const [open, setOpen] = useState(false);
  const { currency } = usePricing();
  const {
    register,
    formState: { errors },
  } = form;
  // TODO(i18n) — helper copy ships as a literal until this feature is localized.
  const helper = isFree ? 'Free pods are ₹0.' : 'Gross ticket price, max 1999.';

  return (
    <Stack spacing={1}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
        <Typography
          component="label"
          htmlFor={FIELD_ID}
          variant="subtitle2"
          fontWeight={800}
          sx={{ minWidth: 0 }}
        >
          {TICKET_PRICE_LABEL}
        </Typography>
        <Link
          component="button"
          type="button"
          underline="always"
          onClick={() => setOpen(true)}
          aria-label={SUGGESTED_PRICES_LINK}
          data-testid="suggested-price-link"
          sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 700 }}
        >
          {SUGGESTED_PRICES_LINK}
          <InfoOutlinedIcon sx={{ fontSize: 15 }} />
        </Link>
      </Stack>
      <TextField
        id={FIELD_ID}
        type="number"
        fullWidth
        disabled={isFree}
        InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
        error={!!errors.pod_amount}
        helperText={errors.pod_amount?.message ?? helper}
        {...register('pod_amount', { valueAsNumber: true })}
      />
      {preview.zeroEarnings && <ZeroEarningsNotice />}
      <SuggestedPricesDialog
        open={open}
        onClose={() => setOpen(false)}
        noOfSpots={preview.noOfSpots}
        venueId={preview.hasVenue ? preview.venueId : null}
        venueAmount={preview.hasVenue ? preview.slotPrice : null}
        symbol={currency}
      />
    </Stack>
  );
}
