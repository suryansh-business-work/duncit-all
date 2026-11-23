import { Controller, type Control } from 'react-hook-form';
import { FormControlLabel, MenuItem, Stack, Switch, TextField } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { SOLUTION_AUDIENCES } from '@duncit/utils';
import type { WebsiteContentFormValues } from './website-content.types';

/**
 * The two fields only a SOLUTIONS entry has: which duncit.com/solutions section
 * lists it, and whether it is announced but not on sale yet.
 */
export default function SolutionFields({ control }: Readonly<{ control: Control<WebsiteContentFormValues> }>) {
  const { t } = useTranslation();
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' } }}>
      <Controller
        control={control}
        name="audience"
        render={({ field, fieldState }) => (
          <TextField
            select
            required
            fullWidth
            label={t('websiteApp.form.audience')}
            value={field.value}
            onChange={(event) => field.onChange(event.target.value)}
            onBlur={field.onBlur}
            inputRef={field.ref}
            error={Boolean(fieldState.error)}
            helperText={fieldState.error?.message ?? t('websiteApp.form.audienceHint')}
            slotProps={{ htmlInput: { 'data-testid': 'solution-audience' } }}
          >
            {SOLUTION_AUDIENCES.map((audience) => (
              <MenuItem key={audience} value={audience}>
                {t(`websiteApp.form.audiences.${audience}`)}
              </MenuItem>
            ))}
          </TextField>
        )}
      />
      <Controller
        control={control}
        name="coming_soon"
        render={({ field }) => (
          <FormControlLabel
            sx={{ flexShrink: 0 }}
            control={<Switch checked={field.value} onChange={(_, checked) => field.onChange(checked)} />}
            label={t('websiteApp.form.comingSoon')}
          />
        )}
      />
    </Stack>
  );
}
