import { useMemo } from 'react';
import { Controller, useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Checkbox, DialogActions, FormControlLabel, FormGroup, FormHelperText, FormLabel, MenuItem, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import { fontStack } from '@duncit/brand/cms-design';
import RhfSwitch from '../../../components/RhfSwitch';
import { useRoleLabels } from '../useRoleLabels';
import { defaultWeights, googleFontSchema, type GoogleFontFormOutput, type GoogleFontFormValues } from './google-font.types';

interface Props {
  family: string;
  weights: number[];
  hasItalic: boolean;
  onSubmit: (values: GoogleFontFormOutput) => void;
  onBack: () => void;
}

/** The weights, italics and role a chosen Google family is added with. */
export default function GoogleFontForm({ family, weights, hasItalic, onSubmit, onBack }: Readonly<Props>) {
  const { t } = useTranslation();
  const roles = useRoleLabels();
  const schema = useMemo(() => googleFontSchema((key) => t(key)), [t]);
  const { control, handleSubmit } = useForm<GoogleFontFormValues, unknown, GoogleFontFormOutput>({
    defaultValues: { weights: defaultWeights(weights), italic: false, role: 'BODY' },
    resolver: zodResolver(schema) as Resolver<GoogleFontFormValues, unknown, GoogleFontFormOutput>,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate data-testid="cms-google-font-form">
      <Stack spacing={2}>
        <Typography variant="h5" component="p" sx={{ fontFamily: fontStack({ family, fallback: '' }) }}>
          {family}
        </Typography>
        <Controller
          control={control}
          name="weights"
          render={({ field, fieldState }) => (
            <Stack role="group" aria-labelledby="cms-font-weights">
              <FormLabel id="cms-font-weights">{t('websiteApp.cms.fonts.weights')}</FormLabel>
              <FormGroup row>
                {weights.map((weight) => (
                  <FormControlLabel
                    key={weight}
                    label={<span style={{ fontFamily: fontStack({ family, fallback: '' }), fontWeight: weight }}>{weight}</span>}
                    control={
                      <Checkbox
                        checked={field.value.includes(weight)}
                        onChange={(_e, checked) => field.onChange(checked ? [...field.value, weight] : field.value.filter((w) => w !== weight))}
                      />
                    }
                  />
                ))}
              </FormGroup>
              {fieldState.error && <FormHelperText error>{fieldState.error.message}</FormHelperText>}
            </Stack>
          )}
        />
        {hasItalic && <RhfSwitch control={control} name="italic" label={t('websiteApp.cms.fonts.italic')} />}
        <RhfTextField control={control} name="role" select label={t('websiteApp.cms.fonts.role')}>
          {roles.map((role) => (
            <MenuItem key={role.value} value={role.value}>
              {role.label}
            </MenuItem>
          ))}
        </RhfTextField>
      </Stack>
      <DialogActions sx={{ px: 0, pt: 2 }}>
        <DuncitButton onClick={onBack}>{t('websiteApp.cms.fonts.back')}</DuncitButton>
        <DuncitButton type="submit" variant="contained">
          {t('websiteApp.cms.fonts.add')}
        </DuncitButton>
      </DialogActions>
    </form>
  );
}
