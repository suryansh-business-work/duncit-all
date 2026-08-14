import type { ReactNode } from 'react';
import { useFieldArray, type Control, type FieldValues, type Path } from 'react-hook-form';
import { Stack, Typography } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/app-settings';
import { paramContext } from '../wa-aisensy/helpers';

interface Props<T extends FieldValues> {
  control: Control<T>;
  /** The template body, so a row can show the sentence its value lands in. */
  body: string;
  /** What these params mean here — a campaign resolves variables per recipient,
   * a test send does not, so the caption is the caller's to write. */
  hint: ReactNode;
}

/**
 * The template's variables, in the order WhatsApp fills them.
 *
 * The rows are laid out from the template (see `useTemplateFields`) and there is
 * deliberately no add or remove: the count is the template's, and letting it be
 * edited by hand is how a send reached AiSensy with the wrong number of values.
 * Generic over the form so the campaign and the test send share one row list.
 */
export default function ParamsField<T extends FieldValues>({
  control,
  body,
  hint,
}: Readonly<Props<T>>) {
  const { t } = useTranslation();
  const { fields } = useFieldArray({ control, name: 'template_params' as never });
  if (fields.length === 0) return null;

  return (
    <Stack spacing={1}>
      <Typography variant="overline" color="text.secondary">
        {t('marketingWhatsapp.paramsTitle')}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {hint}
      </Typography>
      {fields.map((field, index) => (
        <RhfTextField
          key={field.id}
          control={control}
          name={`template_params.${index}.value` as Path<T>}
          label={t('marketingWhatsapp.paramLabel', { vars: { n: `{{${index + 1}}}` } })}
          size="small"
          hint={paramContext(body, index + 1) || undefined}
        />
      ))}
    </Stack>
  );
}
