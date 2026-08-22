import { Box, TextField } from '@mui/material';
import { useFormContext, useWatch } from 'react-hook-form';
import MediaPickerField from '../MediaPickerField';
import { useHostFieldProps } from './useHostFieldProps';
import type { HostCreateValues, HostEditValues } from '../../forms/host.form';
import { useTranslation } from '@duncit/app-settings';

type Values = HostCreateValues & Partial<HostEditValues>;

export default function HostIdentitySection() {
  const { t } = useTranslation();
  const { control, setValue } = useFormContext<Values>();
  const { hasError, errorMessage, tfProps } = useHostFieldProps();
  const passportPhotoUrl = useWatch({ control, name: 'step2.passport_photo_url' });

  return (
    <>
      <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
        <TextField label={t('onboarding.hostForm.aadharNumber')} required {...tfProps('step2.aadhar_number', '12-digit number')} />
        <TextField label={t('onboarding.hostForm.panNumber')} required {...tfProps('step2.pan_number', 'Format ABCDE1234F')} />
      </Box>
      <MediaPickerField
        label={t('onboarding.common.passportPhoto')}
        value={passportPhotoUrl ?? ''}
        onChange={(url) => setValue('step2.passport_photo_url', url, { shouldValidate: true, shouldDirty: true })}
        helperText={hasError('step2.passport_photo_url') ? errorMessage('step2.passport_photo_url') : ' '}
        folder="/hosts/photo"
        required
      />
    </>
  );
}
