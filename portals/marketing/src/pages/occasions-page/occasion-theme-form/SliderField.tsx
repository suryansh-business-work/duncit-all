import { useId } from 'react';
import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form';
import { Box, FormHelperText, Slider, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import type { Range } from './occasion-theme.limits';

/** How a slider's number reads: pixels, seconds, a 0–1 fraction or a share of the screen as a percentage, a rate or a bare count. */
export type SliderUnit = 'px' | 's' | 'percent' | 'screenPercent' | 'perMinute' | 'count';

const UNIT_KEY: Record<SliderUnit, string> = {
  px: 'marketing.occasions.units.px',
  s: 'marketing.occasions.units.seconds',
  percent: 'marketing.occasions.units.percent',
  screenPercent: 'marketing.occasions.units.percent',
  perMinute: 'marketing.occasions.units.perMinute',
  count: 'marketing.occasions.units.count',
};

interface Props<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  range: Range;
  unit: SliderUnit;
  hint?: string;
}

/**
 * A number on a slider drawn to the server's bounds, its value written out
 * beside the label. A `[low, high]` value gets two thumbs, each named.
 */
export default function SliderField<T extends FieldValues>({ control, name, label, range, unit, hint }: Readonly<Props<T>>) {
  const { t } = useTranslation();
  const labelId = useId();
  const read = (value: number) => t(UNIT_KEY[unit], { vars: { value: unit === 'percent' ? Math.round(value * 100) : value } });

  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, onChange, onBlur, ref }, fieldState }) => {
        const current: number | number[] = Array.isArray(value) ? value.map(Number) : Number(value);
        const pair = Array.isArray(current);
        const shown = pair ? t('marketing.occasions.units.range', { vars: { low: read(current[0]), high: read(current[1]) } }) : read(current);
        return (
          <Box>
            <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Typography id={labelId} variant="body2" sx={{ fontWeight: 600 }}>
                {label}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }} aria-hidden>
                {shown}
              </Typography>
            </Stack>
            <Slider
              ref={ref}
              size="small"
              value={current}
              min={range.min}
              max={range.max}
              step={range.step}
              onChange={(_, next) => onChange(next)}
              onBlur={onBlur}
              valueLabelDisplay="auto"
              valueLabelFormat={read}
              getAriaValueText={read}
              aria-labelledby={pair ? undefined : labelId}
              getAriaLabel={
                pair
                  ? (thumb) => t(thumb === 0 ? 'marketing.occasions.units.low' : 'marketing.occasions.units.high', { vars: { label } })
                  : undefined
              }
              disableSwap
            />
            {(fieldState.error ?? hint) && <FormHelperText error={!!fieldState.error}>{fieldState.error?.message ?? hint}</FormHelperText>}
          </Box>
        );
      }}
    />
  );
}
