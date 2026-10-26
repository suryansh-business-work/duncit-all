import { Stack, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { Controller, useFieldArray, useFormContext, useFormState } from 'react-hook-form';
import type { ClubFormValues } from '../types';
import { useTranslation } from '../i18n/useTranslation';

/** Add/remove list of FAQ question + answer pairs, backed by a RHF field array
 * (stable `field.id` keys — never the array index, S6479). */
export default function FaqListField() {
  const { t } = useTranslation();
  const { control } = useFormContext<ClubFormValues>();
  const { errors } = useFormState({ control });
  const { fields, append, remove } = useFieldArray({ control, name: 'faqs' });

  return (
    <Stack spacing={1}>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('clubForm.faqListField.hint')}
      </Typography>
      {errors.faqs?.message && (
        <Typography role="alert" variant="caption" sx={{ color: 'error.main' }}>
          {errors.faqs.message}
        </Typography>
      )}
      {fields.map((field, index) => (
        <Stack
          key={field.id}
          spacing={1}
          sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}
        >
          <Stack direction="row" spacing={1} sx={{
            alignItems: "center"
          }}>
            <Controller
              control={control}
              name={`faqs.${index}.question` as const}
              render={({ field: input }) => (
                <TextField {...input} value={input.value ?? ''} fullWidth size="small" label={t('clubForm.faqListField.question', { vars: { number: index + 1 } })} />
              )}
            />
            <DuncitIconButton aria-label={t('clubForm.faqListField.removeFaq', { vars: { number: index + 1 } })} onClick={() => remove(index)}>
              <DeleteOutlineIcon />
            </DuncitIconButton>
          </Stack>
          <Controller
            control={control}
            name={`faqs.${index}.answer` as const}
            render={({ field: input }) => (
              <TextField {...input} value={input.value ?? ''} fullWidth size="small" multiline minRows={2} label={t('clubForm.faqListField.answer')} />
            )}
          />
        </Stack>
      ))}
      <DuncitButton
        size="small"
        startIcon={<AddIcon />}
        onClick={() => append({ question: '', answer: '' })}
        sx={{ alignSelf: 'flex-start' }}
      >
        {t('clubForm.faqListField.addFaq')}
      </DuncitButton>
    </Stack>
  );
}
