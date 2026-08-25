import { useState } from 'react';
import { InputAdornment, Link, Stack, TextField, Typography } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { usePricing } from '../../../../hooks/usePricing';
import { useTranslation } from '../../../../i18n/useTranslation';
import type { CreatePodForm } from '../create-pod.types';
import type { EarningsPreview } from './useEarningsPreview';
import SuggestedPricesDialog from './SuggestedPricesDialog';
import ZeroEarningsNotice from './ZeroEarningsNotice';

interface Props {
  form: CreatePodForm;
  preview: EarningsPreview;
  isFree: boolean;
}

const FIELD_ID = 'create-pod-ticket-price';

/** An empty field (and the blank default) stays null so ₹0 is never implied —
 * every other value is exactly the number the host typed. */
const asTicketPrice = (value: unknown) => (value === '' || value === null ? null : Number(value));

/** The Step-4 ticket price: its label with the "Suggested Price ⓘ" link to the
 * RIGHT, the amount input, and the zero-earnings notice that blocks publishing
 * when the projected payout is ₹0. Native twin (rule 27). */
export default function TicketPriceField({ form, preview, isFree }: Readonly<Props>) {
  const [open, setOpen] = useState(false);
  const { currency } = usePricing();
  const { t } = useTranslation();
  const {
    register,
    formState: { errors },
  } = form;
  const helper = isFree
    ? t('mweb.createPod.ticketPriceFreeHint')
    : t('mweb.createPod.ticketPriceHint');
  const suggestedLink = t('mweb.createPod.suggestedPrice');

  return (
    <Stack spacing={1}>
      <Stack
        direction="row"
        spacing={1}
        sx={{
          alignItems: "center",
          justifyContent: "space-between"
        }}>
        <Typography
          component="label"
          htmlFor={FIELD_ID}
          variant="subtitle2"
          sx={{
            fontWeight: 600,
            minWidth: 0
          }}>
          {t('mweb.createPod.ticketPriceLabel')}
        </Typography>
        <Link
          component="button"
          type="button"
          underline="always"
          onClick={() => setOpen(true)}
          aria-label={suggestedLink}
          data-testid="suggested-price-link"
          sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 700 }}
        >
          {suggestedLink}
          <InfoOutlinedIcon sx={{ fontSize: 15 }} />
        </Link>
      </Stack>
      <TextField
        id={FIELD_ID}
        type="number"
        fullWidth
        disabled={isFree}
        placeholder={t('mweb.createPod.ticketPricePlaceholder')}
        error={!!errors.pod_amount}
        helperText={errors.pod_amount?.message ?? helper}
        {...register('pod_amount', { setValueAs: asTicketPrice })}
        slotProps={{
          input: { startAdornment: <InputAdornment position="start">₹</InputAdornment> }
        }} />
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
