import { TextField } from '@mui/material';
import { useFormContext, useWatch } from 'react-hook-form';
import MediaPickerField from '../MediaPickerField';
import { useHostFieldProps } from './useHostFieldProps';
import type { HostCreateValues, HostEditValues } from '../../forms/host.form';
import { useTranslation } from '@duncit/app-settings';

type Values = HostCreateValues & Partial<HostEditValues>;

export default function HostVerificationSection() {
  const { t } = useTranslation();
  const { control, setValue } = useFormContext<Values>();
  const { hasError, errorMessage, tfProps } = useHostFieldProps();
  const policeUrl = useWatch({ control, name: 'step3.police_verification_url' });
  const tags = useWatch({ control, name: 'step3.tags' });

  const opts = { shouldValidate: true, shouldDirty: true } as const;

  return (
    <>
      <MediaPickerField
        label={t('onboarding.hostForm.policeVerificationDocument')}
        value={policeUrl ?? ''}
        onChange={(url) => setValue('step3.police_verification_url', url, opts)}
        helperText={
          hasError('step3.police_verification_url')
            ? errorMessage('step3.police_verification_url')
            : ' '
        }
        folder="/hosts/docs"
      />
      <TextField label={t('onboarding.hostForm.fullAddress')} multiline minRows={2} required {...tfProps('step3.full_address')} />
      <TextField
        label={t('onboarding.common.tags')}
        value={(tags ?? []).join(', ')}
        onChange={(event) =>
          setValue(
            'step3.tags',
            event.target.value.split(',').map((tag) => tag.trim()).filter(Boolean),
            opts,
          )
        }
        helperText={t('onboarding.hostForm.commaSeparatedHostTags')}
        fullWidth
        size="small"
      />
    </>
  );
}
