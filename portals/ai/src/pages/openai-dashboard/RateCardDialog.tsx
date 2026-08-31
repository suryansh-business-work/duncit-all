import { useEffect, useMemo } from 'react';
import { useMutation } from '@apollo/client/react';
import { Dialog, DialogActions, DialogContent, DialogTitle, Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useForm , type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { notify } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { RhfTextField } from '@duncit/forms';
import { useTranslation, type useTranslation as UseTranslation } from '@duncit/shell';
import { UPSERT_OPENAI_MODEL_PRICE, type ModelPrice } from './queries';

/** Validation messages are copy, so the schema is built from the active
 *  catalogue rather than frozen at module load. */
const buildSchema = (t: ReturnType<typeof UseTranslation>['t']) =>
  z.object({
    model: z
      .string()
      .trim()
      .min(1, t('ai.rateCard.modelRequired'))
      .max(80, t('ai.rateCard.modelTooLong')),
    input_per_1m: z.coerce
      .number({ error: t('ai.rateCard.enterNumber') })
      .min(0, t('ai.rateCard.notNegative')),
    output_per_1m: z.coerce
      .number({ error: t('ai.rateCard.enterNumber') })
      .min(0, t('ai.rateCard.notNegative')),
  });

type RateForm = z.infer<ReturnType<typeof buildSchema>>;

const EMPTY: RateForm = { model: '', input_per_1m: 0, output_per_1m: 0 };

interface Props {
  /** The rate being edited, `null` for a new model, `undefined` when closed. */
  price: ModelPrice | null | undefined;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * Editing a rate changes what FUTURE calls cost on the dashboard — rows already
 * written keep the cost they were priced at, so correcting a rate never rewrites
 * history. That is deliberate: a month's spend must stay the number it was.
 */
export default function RateCardDialog({ price, onClose, onSaved }: Readonly<Props>) {
  const open = price !== undefined;
  const [upsert, { loading }] = useMutation<any>(UPSERT_OPENAI_MODEL_PRICE);
  const { t } = useTranslation();
  const schema = useMemo(() => buildSchema(t), [t]);
  const { control, handleSubmit, reset } = useForm<RateForm, any, RateForm>({
    resolver: zodResolver(schema) as unknown as Resolver<RateForm, any, RateForm>,
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (!open) return;
    reset(
      price
        ? {
            model: price.model,
            input_per_1m: price.input_per_1m,
            output_per_1m: price.output_per_1m,
          }
        : EMPTY
    );
  }, [open, price, reset]);

  const submit = handleSubmit(async (values) => {
    try {
      await upsert({ variables: { input: values } });
      notify(t('ai.rateCard.saved', { vars: { model: values.model } }), 'success');
      onSaved();
      onClose();
    } catch (err) {
      notify(parseApiError(err), 'error');
    }
  });

  // Hoisted out of the JSX so the two states read as one lookup each (rule 26b).
  const dialogTitle = price
    ? t('ai.rateCard.editTitle', { vars: { model: price.model } })
    : t('ai.rateCard.addTitle');

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{dialogTitle}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <RhfTextField
            control={control}
            name="model"
            label={t('ai.rateCard.model')}
            disabled={!!price}
            hint={t('ai.rateCard.modelHint')}
          />
          <RhfTextField
            control={control}
            name="input_per_1m"
            label={t('ai.rateCard.inputPer1m')}
            type="number"
          />
          <RhfTextField
            control={control}
            name="output_per_1m"
            label={t('ai.rateCard.outputPer1m')}
            type="number"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose} disabled={loading}>
          {t('shell.common.cancel')}
        </DuncitButton>
        <DuncitButton variant="contained" onClick={submit} disabled={loading}>
          {t('shell.common.save')}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
