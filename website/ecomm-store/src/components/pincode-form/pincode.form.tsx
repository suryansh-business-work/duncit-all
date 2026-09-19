import { useId, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogActions, DialogContent, DialogTitle, Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';

import { usePincode } from '../../lib/usePincode';
import { useStoreT } from '../../i18n';
import { LocateMeButton } from './LocateMeButton';
import { PincodeServiceability } from './PincodeServiceability';
import { makePincodeSchema, type PincodeValues } from './pincode.types';

interface PincodeDialogProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Where to deliver: a 6-digit pincode, remembered in this browser. It can be
 * typed or found from the device's location; while the operator keeps a
 * serviceable-pincode list the dialog says whether the store delivers there.
 */
export function PincodeDialog({ open, onClose }: Readonly<PincodeDialogProps>) {
  const { t } = useStoreT();
  const titleId = useId();
  const [pincode, setPincode] = usePincode();
  const schema = useMemo(() => makePincodeSchema(t), [t]);
  const { control, handleSubmit, setValue, watch } = useForm<PincodeValues>({
    resolver: zodResolver(schema),
    values: { pincode },
  });
  const typed = watch('pincode');
  const submit = handleSubmit((values) => {
    setPincode(values.pincode);
    onClose();
  });
  return (
    <Dialog open={open} onClose={onClose} aria-labelledby={titleId} fullWidth maxWidth="xs">
      <Stack component="form" onSubmit={submit} noValidate data-testid="pincode-form">
        <DialogTitle id={titleId}>{t('ecommStore.deliverTo.title')}</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 1 }}>
            <RhfTextField
              control={control}
              name="pincode"
              label={t('ecommStore.deliverTo.pincode')}
              hint={t('ecommStore.deliverTo.hint')}
              autoComplete="postal-code"
              slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 6 } }}
              data-testid="pincode-input"
            />
            <PincodeServiceability pincode={typed} />
            <LocateMeButton onPincode={(found) => setValue('pincode', found, { shouldValidate: true, shouldDirty: true })} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <DuncitButton onClick={onClose} data-testid="pincode-cancel">
            {t('ecommStore.common.cancel')}
          </DuncitButton>
          <DuncitButton type="submit" variant="contained" data-testid="pincode-save">
            {t('ecommStore.deliverTo.save')}
          </DuncitButton>
        </DialogActions>
      </Stack>
    </Dialog>
  );
}
