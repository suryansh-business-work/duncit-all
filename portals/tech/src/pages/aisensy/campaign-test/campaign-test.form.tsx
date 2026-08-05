import { useEffect } from 'react';
import { useFieldArray, useForm, type Control } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Box, Button, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SendIcon from '@mui/icons-material/Send';
import { RhfTextField } from '@duncit/forms';
import type { SendAisensyCampaignInput } from '../queries';
import { campaignTestSchema, emptyValues, toSendInput, type CampaignTestValues } from './campaign-test.types';

/** One template variable row. Hoisted so it isn't redefined each render (S6478). */
function ParamRow({
  control,
  index,
  onRemove,
}: Readonly<{ control: Control<CampaignTestValues>; index: number; onRemove: () => void }>) {
  return (
    <Stack direction="row" spacing={1} alignItems="flex-start">
      <RhfTextField
        control={control}
        name={`template_params.${index}.value`}
        label={`Param {{${index + 1}}}`}
        size="small"
        hint=" "
      />
      <Tooltip title="Remove parameter">
        <IconButton
          aria-label={`Remove parameter ${index + 1}`}
          onClick={onRemove}
          sx={{ mt: 0.5 }}
        >
          <DeleteOutlineIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Stack>
  );
}

interface Props {
  /** Campaign name from the AiSensy env entry — prefills the field. */
  defaultCampaign: string;
  busy: boolean;
  onSubmit: (input: SendAisensyCampaignInput) => void;
}

/**
 * Advance test parameters for a live AiSensy send. Sending stays disabled until
 * every field — including each template parameter added below — is valid.
 */
export default function CampaignTestForm({ defaultCampaign, busy, onSubmit }: Readonly<Props>) {
  const {
    control,
    handleSubmit,
    reset,
    formState: { isValid },
  } = useForm<CampaignTestValues>({
    defaultValues: emptyValues(defaultCampaign),
    resolver: zodResolver(campaignTestSchema),
    mode: 'onChange',
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'template_params' });

  useEffect(() => {
    reset(emptyValues(defaultCampaign));
  }, [defaultCampaign, reset]);

  return (
    <form onSubmit={handleSubmit((values) => onSubmit(toSendInput(values)))} noValidate>
      <Stack spacing={1.5}>
        <Typography variant="subtitle1" fontWeight={900}>
          Advance test parameters
        </Typography>
        <RhfTextField
          control={control}
          name="campaign_name"
          label="Campaign Name"
          size="small"
          required
          hint="API campaign name exactly as it appears in AiSensy"
        />
        <RhfTextField
          control={control}
          name="destination"
          label="Destination"
          size="small"
          required
          hint="Country code + number, digits only — e.g. 919582998897"
        />
        <RhfTextField
          control={control}
          name="user_name"
          label="User Name"
          size="small"
          required
          hint="Name AiSensy records for this contact"
        />

        <Typography variant="overline" color="text.secondary">
          Template params
        </Typography>
        {fields.map((field, index) => (
          <ParamRow key={field.id} control={control} index={index} onRemove={() => remove(index)} />
        ))}
        <Box>
          <Button
            size="small"
            startIcon={<AddIcon />}
            onClick={() => append({ value: '' })}
            sx={{ borderRadius: 999, fontWeight: 800 }}
          >
            Add parameter
          </Button>
        </Box>

        <Box>
          <Button
            type="submit"
            variant="contained"
            startIcon={<SendIcon />}
            disabled={busy || !isValid}
            sx={{ borderRadius: 999, fontWeight: 800 }}
          >
            {busy ? 'Sending…' : 'Send test'}
          </Button>
        </Box>
      </Stack>
    </form>
  );
}
