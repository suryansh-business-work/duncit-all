import { useFieldArray, type Control } from 'react-hook-form';
import { FormLabel, Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import type { DesignFormValues } from './design.types';

/** Font stylesheets (Google Fonts and the like) every page of the site loads. */
export default function FontRows({ control }: Readonly<{ control: Control<DesignFormValues> }>) {
  const { t } = useTranslation();
  const { fields, append, remove } = useFieldArray({ control, name: 'font_urls' });

  return (
    <Stack spacing={1} role="group" aria-labelledby="cms-design-fonts">
      <FormLabel id="cms-design-fonts">{t('websiteApp.cms.design.fonts')}</FormLabel>
      {fields.map((field, index) => (
        <Stack key={field.id} direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
          <RhfTextField control={control} name={`font_urls.${index}.url`} size="small" label={t('websiteApp.cms.design.fontUrl')} />
          <DuncitIconButton aria-label={t('websiteApp.cms.design.removeFont')} onClick={() => remove(index)} sx={{ mt: 0.5 }}>
            <DeleteOutlineIcon fontSize="small" />
          </DuncitIconButton>
        </Stack>
      ))}
      <DuncitButton size="small" startIcon={<AddIcon />} onClick={() => append({ url: '' })} sx={{ alignSelf: 'flex-start' }}>
        {t('websiteApp.cms.design.addFont')}
      </DuncitButton>
    </Stack>
  );
}
