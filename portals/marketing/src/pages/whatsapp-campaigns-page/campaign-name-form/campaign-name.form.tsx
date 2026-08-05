import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { RhfTextField } from '@duncit/forms';
import { campaignNameSchema, emptyValues, type CampaignNameValues } from './campaign-name.types';

interface Props {
  busy: boolean;
  onSubmit: (values: CampaignNameValues) => Promise<void>;
}

/** Add one campaign name to the list marketing picks from. The name must match
 * the AiSensy campaign exactly — it is what every message is sent under. */
export default function CampaignNameForm({ busy, onSubmit }: Readonly<Props>) {
  const {
    control,
    handleSubmit,
    reset,
    formState: { isValid },
  } = useForm<CampaignNameValues>({
    defaultValues: emptyValues(),
    resolver: zodResolver(campaignNameSchema),
    mode: 'onChange',
  });

  const submit = handleSubmit(async (values) => {
    await onSubmit(values);
    reset(emptyValues());
  });

  return (
    <form noValidate onSubmit={submit}>
      <Stack spacing={1.5}>
        <RhfTextField
          control={control}
          name="name"
          label="Campaign name"
          size="small"
          required
          hint="Exactly as it appears in AiSensy, e.g. duncit_camp_1"
        />
        <RhfTextField
          control={control}
          name="description"
          label="What this template says (optional)"
          size="small"
          hint=" "
        />
        <Stack direction="row" justifyContent="flex-end">
          <Button type="submit" startIcon={<AddIcon />} variant="outlined" disabled={busy || !isValid}>
            Add
          </Button>
        </Stack>
      </Stack>
    </form>
  );
}
