import { useEffect } from 'react';
import { useMutation } from '@apollo/client';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack } from '@mui/material';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { notify } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { RhfTextField } from '@duncit/forms';
import { UPSERT_OPENAI_MODEL_PRICE, type ModelPrice } from './queries';

const schema = z.object({
  model: z.string().trim().min(1, 'Model is required').max(80, 'Model name is too long'),
  input_per_1m: z.coerce.number({ invalid_type_error: 'Enter a number' }).min(0, 'Cannot be negative'),
  output_per_1m: z.coerce.number({ invalid_type_error: 'Enter a number' }).min(0, 'Cannot be negative'),
});

type RateForm = z.infer<typeof schema>;

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
  const [upsert, { loading }] = useMutation(UPSERT_OPENAI_MODEL_PRICE);
  const { control, handleSubmit, reset } = useForm<RateForm>({
    resolver: zodResolver(schema),
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
      notify(`Rate saved for ${values.model}`, 'success');
      onSaved();
      onClose();
    } catch (err) {
      notify(parseApiError(err), 'error');
    }
  });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{price ? `Rate for ${price.model}` : 'Add a model rate'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <RhfTextField
            control={control}
            name="model"
            label="Model"
            disabled={!!price}
            hint="Exactly as OpenAI names it, e.g. gpt-4o-mini"
          />
          <RhfTextField
            control={control}
            name="input_per_1m"
            label="Input — USD per 1M tokens"
            type="number"
          />
          <RhfTextField
            control={control}
            name="output_per_1m"
            label="Output — USD per 1M tokens"
            type="number"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button variant="contained" onClick={submit} disabled={loading}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
