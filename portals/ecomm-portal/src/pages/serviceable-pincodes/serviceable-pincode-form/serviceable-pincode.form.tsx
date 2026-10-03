import { Box, Stack } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import FormDialog from '../../../components/FormDialog';
import RhfSwitch from '../../../components/form/RhfSwitch';
import { useSchemaForm } from '../../../components/form/useSchemaForm';
import { TWO_COLUMNS } from '../../../lib/layout';
import type { StoreServiceablePincode } from '../queries';
import {
  makeServiceablePincodeSchema,
  toServiceablePincodeValues,
  type ServiceablePincodeValues,
} from './serviceable-pincode.types';

interface ServiceablePincodeFormProps {
  initial: StoreServiceablePincode | null;
  busy: boolean;
  onClose: () => void;
  onSubmit: (values: ServiceablePincodeValues) => Promise<void>;
}

/** Create or edit one serviceable pincode: the PIN, where it is, and whether the store delivers there now. */
export default function ServiceablePincodeForm({ initial, busy, onClose, onSubmit }: Readonly<ServiceablePincodeFormProps>) {
  const { t, form } = useSchemaForm<ServiceablePincodeValues>(makeServiceablePincodeSchema, toServiceablePincodeValues(initial));
  const { control, handleSubmit } = form;
  return (
    <FormDialog
      formId="serviceable-pincode-form"
      title={initial ? t('ecommPortal.serviceablePincodes.editTitle') : t('ecommPortal.serviceablePincodes.newTitle')}
      busy={busy}
      onClose={onClose}
      onSubmit={handleSubmit(onSubmit)}
    >
      <Stack spacing={1} data-testid="serviceable-pincode-form">
        <RhfTextField
          control={control}
          name="pincode"
          label={t('ecommPortal.serviceablePincodes.pincode')}
          hint={t('ecommPortal.serviceablePincodes.pincodeHint')}
          required
          autoComplete="off"
          slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 6 } }}
          data-testid="serviceable-pincode-input"
        />
        <RhfTextField control={control} name="area" label={t('ecommPortal.serviceablePincodes.area')} data-testid="serviceable-pincode-area" />
        <Box sx={TWO_COLUMNS}>
          <RhfTextField control={control} name="city" label={t('ecommPortal.serviceablePincodes.city')} data-testid="serviceable-pincode-city" />
          <RhfTextField control={control} name="state" label={t('ecommPortal.serviceablePincodes.state')} data-testid="serviceable-pincode-state" />
        </Box>
        <RhfSwitch
          control={control}
          name="is_active"
          label={t('shell.common.active')}
          hint={t('ecommPortal.serviceablePincodes.activeHint')}
          testId="serviceable-pincode-active"
        />
      </Stack>
    </FormDialog>
  );
}
