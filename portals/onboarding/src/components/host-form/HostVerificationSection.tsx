import { TextField } from '@mui/material';
import { useFormContext, useWatch } from 'react-hook-form';
import MediaPickerField from '../MediaPickerField';
import { useHostFieldProps } from './useHostFieldProps';
import type { HostCreateValues, HostEditValues } from '../../forms/host.form';

type Values = HostCreateValues & Partial<HostEditValues>;

export default function HostVerificationSection() {
  const { control, setValue } = useFormContext<Values>();
  const { hasError, errorMessage, tfProps } = useHostFieldProps();
  const policeUrl = useWatch({ control, name: 'step3.police_verification_url' });
  const tags = useWatch({ control, name: 'step3.tags' });

  const opts = { shouldValidate: true, shouldDirty: true } as const;

  return (
    <>
      <MediaPickerField
        label="Police verification document"
        value={policeUrl ?? ''}
        onChange={(url) => setValue('step3.police_verification_url', url, opts)}
        helperText={
          hasError('step3.police_verification_url')
            ? errorMessage('step3.police_verification_url')
            : ' '
        }
        folder="/hosts/docs"
        required
      />
      <TextField label="Full address" multiline minRows={2} required {...tfProps('step3.full_address')} />
      <TextField
        label="Tags"
        value={(tags ?? []).join(', ')}
        onChange={(event) =>
          setValue(
            'step3.tags',
            event.target.value.split(',').map((tag) => tag.trim()).filter(Boolean),
            opts,
          )
        }
        helperText="Comma separated host tags."
        fullWidth
        size="small"
      />
    </>
  );
}
