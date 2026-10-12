import { useEffect } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useTranslation, type Translate } from '@duncit/shell';
import type { HideReasonDialogProps, HideReasonValues } from './hide-reason.types';

/** The server's own ceiling (HIDE_REASON_MAX in server/src/utils/hidden.ts). */
export const HIDE_REASON_MAX = 500;

const EMPTY: HideReasonValues = { reason: '' };

/** Messages are copy, so the translator comes in with the schema. */
export const buildHideReasonSchema = (t: Translate) =>
  z.object({
    reason: z
      .string()
      .trim()
      .min(1, t('directory.visibility.reasonRequired'))
      .max(HIDE_REASON_MAX, t('directory.visibility.reasonTooLong')),
  });

/**
 * The one screen between an admin and a hidden pod or club.
 *
 * Hiding is the only half that asks for anything: the reason is what the next
 * person to open the record reads instead of having to ask who hid it and why.
 * Showing again needs no form, so it is a plain confirm elsewhere.
 */
export default function HideReasonDialog({
  open,
  title,
  body,
  saving,
  onClose,
  onSubmit,
}: Readonly<HideReasonDialogProps>) {
  const { t } = useTranslation();
  const { control, handleSubmit, reset } = useForm<HideReasonValues, unknown, HideReasonValues>({
    defaultValues: EMPTY,
    resolver: zodResolver(buildHideReasonSchema(t)) as Resolver<HideReasonValues>,
    mode: 'onTouched',
  });

  // A reason typed for one record must not be waiting in the field for the next.
  useEffect(() => {
    if (open) reset(EMPTY);
  }, [open, reset]);

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="sm">
      <form noValidate onSubmit={handleSubmit((values) => onSubmit(values))}>
        <DialogTitle>{title}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Typography variant="body2">{body}</Typography>
            <RhfTextField
              control={control}
              name="reason"
              label={t('directory.visibility.reasonLabel')}
              hint={t('directory.visibility.reasonHelper')}
              required
              autoFocus
              multiline
              minRows={3}
              slotProps={{ htmlInput: { maxLength: HIDE_REASON_MAX } }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <DuncitButton onClick={onClose} disabled={saving}>
            {t('shell.common.cancel')}
          </DuncitButton>
          <DuncitButton type="submit" variant="contained" color="warning" loading={saving}>
            {t('directory.visibility.hide')}
          </DuncitButton>
        </DialogActions>
      </form>
    </Dialog>
  );
}
