import { Controller, useFormContext } from 'react-hook-form';
import { Slider, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';

interface Props {
  name: string;
  label: string;
  min: number;
  max: number;
}

/** A pixel value on a slider, its number shown beside the label. */
export default function SliderField({ name, label, min, max }: Readonly<Props>) {
  const { t } = useTranslation();
  const { control } = useFormContext();
  const id = `theme-${name}-label`;
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Stack spacing={0.25}>
          <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
            <Typography id={id} variant="body2" sx={{ fontWeight: 600 }}>
              {label}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {t('crm.emailSettings.pixels', { vars: { value: Number(field.value) } })}
            </Typography>
          </Stack>
          <Slider
            value={Number(field.value)}
            min={min}
            max={max}
            step={1}
            onChange={(_, v) => field.onChange(Array.isArray(v) ? v[0] : v)}
            onBlur={field.onBlur}
            aria-labelledby={id}
          />
          {fieldState.error && (
            <Typography variant="caption" sx={{ color: 'error.main' }}>
              {fieldState.error.message}
            </Typography>
          )}
        </Stack>
      )}
    />
  );
}
