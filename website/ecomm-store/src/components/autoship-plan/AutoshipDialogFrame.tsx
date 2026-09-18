import { useId, type FormEventHandler, type ReactNode } from 'react';
import type { Control, FieldValues } from 'react-hook-form';
import { Alert, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';

import { useStoreT } from '../../i18n';
import { AddressFields } from '../address-form';
import { CodOtpForm } from '../cod-otp';

interface AutoshipDialogFrameProps {
  title: string;
  submitLabel: string;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onClose: () => void;
  submitting: boolean;
  error: string;
  /** Fields above the plan choices (a quantity, an intro line). */
  lead?: ReactNode;
  /** The plan and address inputs of the caller's form. */
  children: ReactNode;
  /** COD_AUTO with a phone check configured: the verification sits below the form. */
  cod: { needed: boolean; phone: string; verified: boolean; onVerified: (challengeId: string) => void };
}

/**
 * The dialog both Autoship forms share: title, the caller's form, the COD phone
 * check kept OUTSIDE that form (it is a form of its own), the error, and the
 * actions — the submit button reaches the form through its id.
 */
export function AutoshipDialogFrame({ title, submitLabel, onSubmit, onClose, submitting, error, lead, children, cod }: Readonly<AutoshipDialogFrameProps>) {
  const { t } = useStoreT();
  const titleId = useId();
  const formId = useId();
  return (
    <Dialog open onClose={onClose} aria-labelledby={titleId} fullWidth maxWidth="sm" scroll="body">
      <DialogTitle id={titleId}>{title}</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          {lead}
          <Stack component="form" id={formId} spacing={2} onSubmit={onSubmit} noValidate>
            {children}
          </Stack>
          {cod.needed ? <CodOtpForm phone={cod.phone} verified={cod.verified} onVerified={cod.onVerified} /> : null}
          <Stack aria-live="assertive">{error ? <Alert severity="error">{error}</Alert> : null}</Stack>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <DuncitButton onClick={onClose}>{t('ecommStore.common.cancel')}</DuncitButton>
        <DuncitButton type="submit" form={formId} variant="contained" loading={submitting}>
          {submitLabel}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}

/** The "Deliver to" heading and the address inputs, under the plan choices. */
export function AutoshipAddress<T extends FieldValues>({ control }: Readonly<{ control: Control<T> }>) {
  const { t } = useStoreT();
  return (
    <>
      <Typography variant="h4" component="h3">
        {t('ecommStore.autoship.deliverTo')}
      </Typography>
      <AddressFields control={control} />
    </>
  );
}
