import { useId, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogActions, DialogContent, DialogTitle, Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';

import { usePincode } from '../../lib/usePincode';
import { useStoreT } from '../../i18n';
import { makePincodeSchema, type PincodeValues } from './pincode.types';

interface PincodeDialogProps {
  open: boolean;
  onClose: () => void;
}

/** Where to deliver: a 6-digit pincode, remembered in this browser. */
export function PincodeDialog({ open, onClose }: Readonly<PincodeDialogProps>) {
  const { t } = useStoreT();
  const titleId = useId();
  const [pincode, setPincode] = usePincode();
  const schema = useMemo(() => makePincodeSchema(t), [t]);
  const { control, handleSubmit } = useForm<PincodeValues>({
    resolver: zodResolver(schema),
    values: { pincode },
  });
  const submit = handleSubmit((values) => {
    setPincode(values.pincode);
    onClose();
  });
  return (
    <Dialog open={open} onClose={onClose} aria-labelledby={titleId} fullWidth maxWidth="xs">
      <Stack component="form" onSubmit={submit} noValidate>
        <DialogTitle id={titleId}>{t('ecommStore.deliverTo.title')}</DialogTitle>
        <DialogContent>
          <RhfTextField
            control={control}
            name="pincode"
            label={t('ecommStore.deliverTo.pincode')}
            hint={t('ecommStore.deliverTo.hint')}
            autoComplete="postal-code"
            slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 6 } }}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <DuncitButton onClick={onClose}>{t('ecommStore.common.cancel')}</DuncitButton>
          <DuncitButton type="submit" variant="contained">
            {t('ecommStore.deliverTo.save')}
          </DuncitButton>
        </DialogActions>
      </Stack>
    </Dialog>
  );
}
