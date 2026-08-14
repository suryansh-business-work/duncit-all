import type { Control } from 'react-hook-form';
import { MenuItem, Stack } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/app-settings';
import {
  TEMPLATE_CATEGORIES,
  TEMPLATE_TYPES,
  type CreateTemplateValues,
} from './create-template.types';

/** Everything Meta reads, in the order it is written: what the template is
 * called, how it is billed and rendered, then the message itself. */
export default function TemplateFields({
  control,
}: Readonly<{ control: Control<CreateTemplateValues> }>) {
  const { t } = useTranslation();

  return (
    <Stack spacing={2}>
      <RhfTextField
        control={control}
        name="name"
        label={t('marketingWhatsapp.nameLabel')}
        required
        hint={t('marketingWhatsapp.nameHelp')}
      />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <RhfTextField
          control={control}
          name="category"
          label={t('marketingWhatsapp.categoryLabel')}
          select
          required
          hint={t('marketingWhatsapp.categoryHelp')}
        >
          {TEMPLATE_CATEGORIES.map((category) => (
            <MenuItem key={category} value={category}>
              {category}
            </MenuItem>
          ))}
        </RhfTextField>
        <RhfTextField
          control={control}
          name="type"
          label={t('marketingWhatsapp.typeLabel')}
          select
          required
          hint={t('marketingWhatsapp.typeHelp')}
        >
          {TEMPLATE_TYPES.map((type) => (
            <MenuItem key={type} value={type}>
              {type}
            </MenuItem>
          ))}
        </RhfTextField>
      </Stack>
      <RhfTextField
        control={control}
        name="language"
        label={t('marketingWhatsapp.languageLabel')}
        required
        hint={t('marketingWhatsapp.languageHelp')}
      />
      <RhfTextField
        control={control}
        name="header_text"
        label={t('marketingWhatsapp.headerTextLabel')}
        hint={t('marketingWhatsapp.headerTextHelp')}
      />
      <RhfTextField
        control={control}
        name="body"
        label={t('marketingWhatsapp.bodyLabel')}
        required
        multiline
        minRows={4}
        hint={t('marketingWhatsapp.bodyHelp')}
      />
      <RhfTextField
        control={control}
        name="sample"
        label={t('marketingWhatsapp.sampleLabel')}
        required
        multiline
        minRows={4}
        hint={t('marketingWhatsapp.sampleHelp')}
      />
      <RhfTextField
        control={control}
        name="footer_text"
        label={t('marketingWhatsapp.footerTextLabel')}
        hint={t('marketingWhatsapp.footerTextHelp')}
      />
    </Stack>
  );
}
