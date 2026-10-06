import { useState } from 'react';
import { useFieldArray, type Control } from 'react-hook-form';
import { Stack, Typography } from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import type { DesignFormValues } from '../design-form/design.types';
import FontRow from './FontRow';
import GoogleFontDialog from './GoogleFontDialog';
import CustomFontDialog from './CustomFontDialog';

type Picker = 'google' | 'custom' | null;

/** The site's typefaces — from the Google Fonts catalogue or uploaded — each bound to a role. */
export default function FontsSection({ control }: Readonly<{ control: Control<DesignFormValues> }>) {
  const { t } = useTranslation();
  const { fields, append, remove } = useFieldArray({ control, name: 'fonts' });
  const [picker, setPicker] = useState<Picker>(null);
  const close = () => setPicker(null);

  return (
    <Stack spacing={1.5} component="section" aria-labelledby="cms-fonts-title" data-testid="cms-fonts">
      <Typography id="cms-fonts-title" variant="h6" component="h2">
        {t('websiteApp.cms.fonts.title')}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {t('websiteApp.cms.fonts.intro')}
      </Typography>
      {fields.length === 0 && <Typography color="text.secondary">{t('websiteApp.cms.fonts.empty')}</Typography>}
      {fields.map((field, index) => (
        <FontRow key={field.id} control={control} index={index} onRemove={() => remove(index)} />
      ))}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
        <DuncitButton variant="outlined" startIcon={<GoogleIcon />} onClick={() => setPicker('google')} data-testid="cms-fonts-add-google">
          {t('websiteApp.cms.fonts.addGoogle')}
        </DuncitButton>
        <DuncitButton variant="outlined" startIcon={<UploadFileIcon />} onClick={() => setPicker('custom')} data-testid="cms-fonts-upload">
          {t('websiteApp.cms.fonts.upload')}
        </DuncitButton>
      </Stack>
      <GoogleFontDialog open={picker === 'google'} onClose={close} onAdd={(font) => append(font)} />
      <CustomFontDialog open={picker === 'custom'} onClose={close} onAdd={(font) => append(font)} />
    </Stack>
  );
}
