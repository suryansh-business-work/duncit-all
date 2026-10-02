import { Controller, type Control, type UseFormSetValue } from 'react-hook-form';
import { MenuItem, TextField } from '@mui/material';
import { adMediaTypeOptions } from '../ad-options';
import { useTranslation } from '../i18n/useTranslation';
import type { AdRequestFormValues } from '../ad-request.types';

interface Props {
  control: Control<AdRequestFormValues, any, AdRequestFormValues>;
  setValue: UseFormSetValue<AdRequestFormValues>;
}

/** Image or video — and changing it clears the media picked for the other kind. */
export default function AdTypeField({ control, setValue }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Controller
      control={control}
      name="ad_type"
      render={({ field }) => (
        <TextField
          label={t('adRequest.form.type')}
          select
          fullWidth
          value={field.value}
          onChange={(event) => {
            field.onChange(event);
            setValue('media_url', '', { shouldValidate: true });
          }}
          onBlur={field.onBlur}
          helperText={t('adRequest.form.typeHint')}
        >
          {adMediaTypeOptions(t).map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
      )}
    />
  );
}
