import { useMemo } from 'react';
import { useFieldArray, useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { DialogActions, FormHelperText, FormLabel, MenuItem, Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import { useRoleLabels } from '../useRoleLabels';
import CustomFontFile from './CustomFontFile';
import { blankCustomFont, customFontSchema, type CustomFontFormOutput, type CustomFontFormValues } from './custom-font.types';

interface Props {
  onSubmit: (values: CustomFontFormOutput) => void;
  onCancel: () => void;
}

/** A family of the site's own font files — the brand typeface Google does not have. */
export default function CustomFontForm({ onSubmit, onCancel }: Readonly<Props>) {
  const { t } = useTranslation();
  const roles = useRoleLabels();
  const schema = useMemo(() => customFontSchema((key) => t(key)), [t]);
  const { control, handleSubmit, formState } = useForm<CustomFontFormValues, unknown, CustomFontFormOutput>({
    defaultValues: blankCustomFont(),
    resolver: zodResolver(schema) as Resolver<CustomFontFormValues, unknown, CustomFontFormOutput>,
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'files' });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate data-testid="cms-custom-font-form">
      <Stack spacing={2}>
        <RhfTextField control={control} name="family" label={t('websiteApp.cms.fonts.family')} hint={t('websiteApp.cms.fonts.familyHint')} required />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <RhfTextField control={control} name="role" select label={t('websiteApp.cms.fonts.role')}>
            {roles.map((role) => (
              <MenuItem key={role.value} value={role.value}>
                {role.label}
              </MenuItem>
            ))}
          </RhfTextField>
          <RhfTextField control={control} name="fallback" label={t('websiteApp.cms.fonts.fallback')} />
        </Stack>
        <Stack spacing={1} role="group" aria-labelledby="cms-font-files">
          <FormLabel id="cms-font-files">{t('websiteApp.cms.fonts.files')}</FormLabel>
          <FormHelperText>{t('websiteApp.cms.fonts.filesHint')}</FormHelperText>
          {fields.map((field, index) => (
            <CustomFontFile key={field.id} control={control} index={index} onRemove={() => remove(index)} />
          ))}
          {formState.errors.files?.root?.message && <FormHelperText error>{formState.errors.files.root.message}</FormHelperText>}
          <DuncitButton size="small" startIcon={<AddIcon />} onClick={() => append({ weight: 700, style: 'normal', url: '' })} sx={{ alignSelf: 'flex-start' }}>
            {t('websiteApp.cms.fonts.addFile')}
          </DuncitButton>
        </Stack>
      </Stack>
      <DialogActions sx={{ px: 0, pt: 2 }}>
        <DuncitButton onClick={onCancel}>{t('shell.common.cancel')}</DuncitButton>
        <DuncitButton type="submit" variant="contained">
          {t('websiteApp.cms.fonts.add')}
        </DuncitButton>
      </DialogActions>
    </form>
  );
}
