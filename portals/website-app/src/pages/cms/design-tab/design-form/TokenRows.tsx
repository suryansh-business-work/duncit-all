import { useFieldArray, useWatch, type Control } from 'react-hook-form';
import { Box, FormLabel, Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import type { DesignFormValues } from './design.types';

/** One row per design token; a colour value shows a live swatch beside it. */
export default function TokenRows({ control }: Readonly<{ control: Control<DesignFormValues> }>) {
  const { t } = useTranslation();
  const { fields, append, remove } = useFieldArray({ control, name: 'tokens' });
  const values = useWatch({ control, name: 'tokens' });

  return (
    <Stack spacing={1} role="group" aria-labelledby="cms-design-tokens">
      <FormLabel id="cms-design-tokens">{t('websiteApp.cms.design.tokens')}</FormLabel>
      {fields.map((field, index) => (
        <Stack key={field.id} direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'flex-start' } }}>
          <Box
            aria-hidden="true"
            sx={{
              flex: '0 0 auto',
              width: 36,
              height: 36,
              mt: 0.5,
              borderRadius: 1,
              border: 1,
              borderColor: 'divider',
              // The swatch IS the token's own value: it previews whatever was typed.
              background: values?.[index]?.value ?? 'transparent',
            }}
          />
          <RhfTextField control={control} name={`tokens.${index}.name`} size="small" label={t('websiteApp.cms.design.tokenName')} />
          <RhfTextField control={control} name={`tokens.${index}.value`} size="small" label={t('websiteApp.cms.design.tokenValue')} />
          <RhfTextField control={control} name={`tokens.${index}.group`} size="small" label={t('websiteApp.cms.design.tokenGroup')} sx={{ maxWidth: { sm: 160 } }} />
          <DuncitIconButton aria-label={t('websiteApp.cms.design.removeToken')} onClick={() => remove(index)} sx={{ mt: 0.5 }}>
            <DeleteOutlineIcon fontSize="small" />
          </DuncitIconButton>
        </Stack>
      ))}
      <DuncitButton size="small" startIcon={<AddIcon />} onClick={() => append({ name: '--', value: '', group: 'color' })} sx={{ alignSelf: 'flex-start' }}>
        {t('websiteApp.cms.design.addToken')}
      </DuncitButton>
    </Stack>
  );
}
