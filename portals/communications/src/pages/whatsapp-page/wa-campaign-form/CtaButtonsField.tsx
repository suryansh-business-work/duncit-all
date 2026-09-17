import { useFieldArray, type Control, type FieldValues, type Path } from 'react-hook-form';
import { Stack, Typography } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/app-settings';
import type { DynamicButton } from './template-fields';

interface Props<T extends FieldValues> {
  control: Control<T>;
  /** The CTA buttons whose link carries a {{n}}, in template order. */
  buttons: DynamicButton[];
}

/**
 * What fills each button's dynamic link.
 *
 * A link left unfilled opens with a literal `{{7}}` in it, on a message that was
 * already billed — so the row exists for exactly the buttons that have one, and
 * the label is the button's own text so it is obvious which link is being set.
 */
export default function CtaButtonsField<T extends FieldValues>({
  control,
  buttons,
}: Readonly<Props<T>>) {
  const { t } = useTranslation();
  const { fields } = useFieldArray({ control, name: 'buttons' as never });
  if (fields.length === 0) return null;

  return (
    <Stack spacing={1}>
      <Typography variant="overline" sx={{
        color: "text.secondary"
      }}>
        {t('marketingWhatsapp.buttonsTitle')}
      </Typography>
      <Typography variant="caption" sx={{
        color: "text.secondary"
      }}>
        {t('marketingWhatsapp.buttonsHint')}
      </Typography>
      {fields.map((field, index) => {
        const button = buttons[index];
        if (!button) return null;
        return (
          <RhfTextField
            key={field.id}
            control={control}
            name={`buttons.${index}.value` as Path<T>}
            label={t('marketingWhatsapp.buttonLabel', { vars: { text: button.text } })}
            size="small"
            hint={button.url}
          />
        );
      })}
    </Stack>
  );
}
