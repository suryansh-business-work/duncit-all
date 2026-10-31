import { useMemo } from 'react';
import { useFieldArray, useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import OccasionIconRow from './OccasionIconRow';
import {
  MAX_ICONS,
  blankIcon,
  occasionIconsSchema,
  toIconInput,
  toIconValues,
  type OccasionIconsFormProps,
  type OccasionIconsValues,
} from './occasion-icons.types';

/** Every festive icon window, edited together and saved together. */
export default function OccasionIconsForm({ icons, onSubmit }: Readonly<OccasionIconsFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => occasionIconsSchema(t), [t]);
  const { control, handleSubmit, formState } = useForm<OccasionIconsValues, unknown, OccasionIconsValues>({
    defaultValues: toIconValues(icons),
    resolver: zodResolver(schema) as unknown as Resolver<OccasionIconsValues, unknown, OccasionIconsValues>,
    mode: 'onChange',
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'icons' });

  return (
    <form noValidate onSubmit={(event) => event.preventDefault()} data-testid="occasion-icons-form">
      <Stack spacing={2}>
        {fields.length === 0 && <Alert severity="info">{t('marketing.occasionIcons.empty')}</Alert>}
        {fields.map((field, index) => (
          <OccasionIconRow key={field.id} control={control} index={index} onRemove={() => remove(index)} />
        ))}
        <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
          <DuncitButton startIcon={<AddIcon />} onClick={() => append(blankIcon(fields.length))} disabled={fields.length >= MAX_ICONS}>
            {t('marketing.occasionIcons.add')}
          </DuncitButton>
          <DuncitButton
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={!formState.isDirty || formState.isSubmitting}
            onClick={() => handleSubmit((values) => onSubmit(toIconInput(values)))()}
            data-testid="occasion-icons-save"
          >
            {t(formState.isSubmitting ? 'marketing.occasionIcons.saving' : 'marketing.occasionIcons.save')}
          </DuncitButton>
        </Stack>
      </Stack>
    </form>
  );
}
