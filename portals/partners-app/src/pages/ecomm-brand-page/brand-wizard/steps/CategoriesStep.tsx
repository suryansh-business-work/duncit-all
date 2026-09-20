import { useState } from 'react';
import { Chip, Stack, TextField, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import type { BrandStepProps } from './step-types';

const MAX_CATEGORIES = 30;

/** Step 5 — the categories the brand sells in; they decide which pods show its products. */
export default function CategoriesStep({ watch, setValue, locked }: Readonly<BrandStepProps>) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState('');
  const categories = watch('product_categories');

  const add = () => {
    const value = draft.trim();
    if (value && !categories.includes(value)) {
      setValue('product_categories', [...categories, value].slice(0, MAX_CATEGORIES), { shouldDirty: true });
    }
    setDraft('');
  };
  const remove = (category: string) =>
    setValue(
      'product_categories',
      categories.filter((item) => item !== category),
      { shouldDirty: true },
    );

  return (
    <Stack spacing={2}>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('partners.brandWizard.categories.intro')}
      </Typography>
      <Stack direction="row" spacing={1}>
        <TextField
          size="small"
          fullWidth
          disabled={locked}
          label={t('partners.ecommBrandPage.addACategory')}
          placeholder={t('partners.brandWizard.categories.addPlaceholder')}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              add();
            }
          }}
          slotProps={{ htmlInput: { 'data-testid': 'brand-wizard-category-input' } }}
        />
        <DuncitButton onClick={add} disabled={locked || !draft.trim()} variant="outlined" data-testid="brand-wizard-category-add">
          {t('partners.brandWizard.categories.add')}
        </DuncitButton>
      </Stack>
      {categories.length === 0 ? (
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {t('partners.brandWizard.categories.empty')}
        </Typography>
      ) : (
        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }} data-testid="brand-wizard-category-list">
          {categories.map((category) => (
            <Chip key={category} label={category} onDelete={locked ? undefined : () => remove(category)} />
          ))}
        </Stack>
      )}
    </Stack>
  );
}
