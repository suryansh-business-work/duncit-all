import { useId } from 'react';
import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form';
import { Box, FormHelperText, Stack, ToggleButton, ToggleButtonGroup, Tooltip, Typography } from '@mui/material';
import { OCCASION_SHAPES, OCCASION_SHAPE_PATHS, type OccasionShape } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import { SHAPE_LABEL } from './form-copy';

interface Props<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  hint?: string;
}

/** One built-in mark, drawn from the same path data the apps paint. */
export function ShapeIcon({ shape }: Readonly<{ shape: OccasionShape }>) {
  return (
    <Box component="svg" viewBox="0 0 24 24" aria-hidden sx={{ width: (th) => th.spacing(3), height: (th) => th.spacing(3), display: 'block' }}>
      <path d={OCCASION_SHAPE_PATHS[shape]} fill="currentColor" />
    </Box>
  );
}

/** Pick any number of the built-in marks, each shown as itself. */
export default function ShapePicker<T extends FieldValues>({ control, name, label, hint }: Readonly<Props<T>>) {
  const { t } = useTranslation();
  const labelId = useId();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, onChange }, fieldState }) => (
        <Stack spacing={0.75}>
          <Typography id={labelId} variant="body2" sx={{ fontWeight: 600 }}>
            {label}
          </Typography>
          <ToggleButtonGroup
            value={Array.isArray(value) ? value : []}
            onChange={(_, next: OccasionShape[]) => onChange(next)}
            aria-labelledby={labelId}
            size="small"
            sx={{
              display: 'grid',
              gridTemplateColumns: (th) => `repeat(auto-fill, minmax(${th.spacing(5.5)}, 1fr))`,
              gap: 0.75,
              '& .MuiToggleButtonGroup-grouped': {
                m: 0,
                border: 1,
                borderColor: 'divider',
                borderRadius: 1.5,
                aspectRatio: '1',
              },
              '& .MuiToggleButtonGroup-grouped.Mui-selected': { color: 'primary.main', borderColor: 'primary.main' },
            }}
          >
            {OCCASION_SHAPES.map((shape) => (
              <Tooltip key={shape} title={t(SHAPE_LABEL[shape])}>
                <ToggleButton value={shape} aria-label={t(SHAPE_LABEL[shape])}>
                  <ShapeIcon shape={shape} />
                </ToggleButton>
              </Tooltip>
            ))}
          </ToggleButtonGroup>
          {(fieldState.error ?? hint) && <FormHelperText error={!!fieldState.error}>{fieldState.error?.message ?? hint}</FormHelperText>}
        </Stack>
      )}
    />
  );
}
