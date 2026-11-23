import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Stack } from '@mui/material';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import { money } from '../../pod-finance-page/queries';
import FundingNoteField from './FundingNoteField';
import { shortfallFundingSchema } from './shortfall-funding.schema';
import type { ShortfallFundingFormProps, ShortfallFundingValues } from './shortfall-funding.types';

/**
 * "Approve all payouts" when the payouts send out more than the pod collected:
 * instead of a plain yes, Finance says who funds the difference. The note is
 * sent with the approval and recorded on every payout it approves.
 *
 * Mounted only while asked for, so each attempt starts with an empty note.
 */
export default function ShortfallFundingForm({
  total,
  shortfall,
  symbol,
  busy,
  errorMessage,
  onClose,
  onSubmit,
}: Readonly<ShortfallFundingFormProps>) {
  const { t } = useTranslation();
  const { control, handleSubmit } = useForm<ShortfallFundingValues>({
    defaultValues: { note: '' },
    resolver: zodResolver(shortfallFundingSchema(t)),
  });

  return (
    <Dialog
      open
      onClose={busy ? undefined : onClose}
      fullWidth
      maxWidth="sm"
      aria-labelledby="shortfall-funding-title"
      aria-describedby="shortfall-funding-intro"
    >
      <DialogTitle id="shortfall-funding-title">{t('finance.paymentRelease.fundingTitle')}</DialogTitle>
      <form noValidate onSubmit={handleSubmit((values) => onSubmit(values))}>
        <DialogContent dividers>
          <Stack spacing={2}>
            <DialogContentText id="shortfall-funding-intro">
              {t('finance.paymentRelease.fundingIntro', {
                vars: { total: money(symbol, total), shortfall: money(symbol, shortfall) },
              })}
            </DialogContentText>
            {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
            <FundingNoteField control={control} name="note" />
          </Stack>
        </DialogContent>
        <DialogActions>
          <DuncitButton onClick={onClose} disabled={busy}>
            {t('shell.common.cancel')}
          </DuncitButton>
          <DuncitButton type="submit" variant="contained" startIcon={<DoneAllIcon />} loading={busy}>
            {t('finance.paymentRelease.approveAll')}
          </DuncitButton>
        </DialogActions>
      </form>
    </Dialog>
  );
}
