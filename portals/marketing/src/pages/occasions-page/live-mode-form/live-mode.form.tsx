import { useMemo } from 'react';
import { Controller, useForm, useWatch, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Box, FormControl, FormControlLabel, FormLabel, MenuItem, Radio, RadioGroup, Stack, Typography } from '@mui/material';
import PublishRoundedIcon from '@mui/icons-material/PublishRounded';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/app-settings';
import { LIVE_MODES, LIVE_MODE_HINT, LIVE_MODE_LABEL } from '../copy';
import { liveModeSchema, liveModeValues, type LiveModeFormProps, type LiveModeFormValues } from './live-mode.types';

/** Normal, one pinned look, or the schedule — the switch behind every app's look. */
export default function LiveModeForm({ settings, looks, onSubmit }: Readonly<LiveModeFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => liveModeSchema(t), [t]);
  const { control, handleSubmit, formState } = useForm<LiveModeFormValues, unknown, LiveModeFormValues>({
    defaultValues: liveModeValues(settings),
    resolver: zodResolver(schema) as unknown as Resolver<LiveModeFormValues, unknown, LiveModeFormValues>,
    mode: 'onChange',
  });
  const mode = useWatch({ control, name: 'mode' });

  return (
    <form noValidate onSubmit={(event) => event.preventDefault()} data-testid="occasion-live-mode-form">
      <Stack spacing={2}>
        <FormControl component="fieldset">
          <FormLabel component="legend" sx={{ mb: 1 }}>
            {t('marketing.occasions.live.modeLegend')}
          </FormLabel>
          <Controller
            control={control}
            name="mode"
            render={({ field }) => (
              <RadioGroup
                ref={field.ref}
                name={field.name}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' } }}
              >
                {LIVE_MODES.map((option) => (
                  <Box
                    key={option}
                    sx={{
                      border: 1,
                      borderColor: field.value === option ? 'primary.main' : 'divider',
                      bgcolor: field.value === option ? 'action.selected' : 'transparent',
                      borderRadius: 2,
                      px: 1.5,
                      py: 1,
                      transition: (th) => th.transitions.create(['border-color', 'background-color']),
                    }}
                  >
                    <FormControlLabel
                      value={option}
                      control={<Radio />}
                      sx={{ alignItems: 'flex-start', m: 0, width: '100%' }}
                      label={
                        <Stack spacing={0.25} sx={{ pt: 1 }}>
                          <Typography variant="subtitle2">{t(LIVE_MODE_LABEL[option])}</Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {t(LIVE_MODE_HINT[option])}
                          </Typography>
                        </Stack>
                      }
                    />
                  </Box>
                ))}
              </RadioGroup>
            )}
          />
        </FormControl>
        {mode === 'MANUAL' && (
          <RhfTextField
            control={control}
            name="manual_key"
            select
            label={t('marketing.occasions.live.pickLook')}
            hint={t('marketing.occasions.live.pickLookHint')}
            required
            sx={{ maxWidth: (th) => th.spacing(60) }}
          >
            {looks.map((look) => (
              <MenuItem key={look.key} value={look.key}>
                {look.name}
              </MenuItem>
            ))}
          </RhfTextField>
        )}
        <Stack direction="row">
          <DuncitButton
            variant="contained"
            startIcon={<PublishRoundedIcon />}
            disabled={!formState.isDirty}
            onClick={() => handleSubmit(onSubmit)()}
            data-testid="occasion-live-mode-save"
          >
            {t('marketing.occasions.live.apply')}
          </DuncitButton>
        </Stack>
      </Stack>
    </form>
  );
}
