import { useMemo } from 'react';
import { useFieldArray, useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import StoreOccasionRow from './StoreOccasionRow';
import {
  MAX_STORE_OCCASIONS,
  blankStoreOccasion,
  storeOccasionsSchema,
  toStoreInput,
  toStoreValues,
  type StoreOccasionsFormProps,
  type StoreOccasionsValues,
} from './store-occasions.types';

/** Every festive window on the ecomm store, edited and saved together. */
export default function StoreOccasionsForm({ occasions, onSubmit }: Readonly<StoreOccasionsFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => storeOccasionsSchema(t), [t]);
  const { control, handleSubmit, formState } = useForm<StoreOccasionsValues, unknown, StoreOccasionsValues>({
    defaultValues: toStoreValues(occasions),
    resolver: zodResolver(schema) as unknown as Resolver<StoreOccasionsValues, unknown, StoreOccasionsValues>,
    mode: 'onChange',
  });
  const { fields, append, remove, move } = useFieldArray({ control, name: 'occasions' });

  return (
    <form noValidate onSubmit={(event) => event.preventDefault()} data-testid="store-occasions-form">
      <Stack spacing={2}>
        {fields.length === 0 && <Alert severity="info">{t('marketing.storeOccasions.empty')}</Alert>}
        {fields.map((field, index) => (
          <StoreOccasionRow
            key={field.id}
            control={control}
            index={index}
            isFirst={index === 0}
            isLast={index === fields.length - 1}
            onMoveUp={() => move(index, index - 1)}
            onMoveDown={() => move(index, index + 1)}
            onRemove={() => remove(index)}
          />
        ))}
        <Stack direction="row" sx={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
          <DuncitButton
            startIcon={<AddIcon />}
            onClick={() => append(blankStoreOccasion(fields.length))}
            disabled={fields.length >= MAX_STORE_OCCASIONS}
          >
            {t('marketing.storeOccasions.add')}
          </DuncitButton>
          <DuncitButton
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={!formState.isDirty || formState.isSubmitting}
            onClick={() => handleSubmit((values) => onSubmit(toStoreInput(values)))()}
            data-testid="store-occasions-save"
          >
            {t(formState.isSubmitting ? 'marketing.storeOccasions.saving' : 'marketing.storeOccasions.save')}
          </DuncitButton>
        </Stack>
      </Stack>
    </form>
  );
}
