import { useFieldArray, type Control } from 'react-hook-form';
import { Box, Button, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { RhfTextField } from '@duncit/forms';
import type { WaCampaignVariable } from '../queries';
import type { WaCampaignValues } from './wa-campaign.types';

/** One template variable row. Hoisted so it isn't redefined each render (S6478). */
function ParamRow({
  control,
  index,
  onRemove,
}: Readonly<{ control: Control<WaCampaignValues>; index: number; onRemove: () => void }>) {
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
        <IconButton aria-label={`Remove parameter ${index + 1}`} onClick={onRemove} sx={{ mt: 0.5 }}>
          <DeleteOutlineIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Stack>
  );
}

interface Props {
  control: Control<WaCampaignValues>;
  /** Variables the server resolves per recipient — rendered so the list stays
   * whatever the server supports, with no copy of it in the portal. */
  variables: WaCampaignVariable[];
}

/**
 * The template's variables, in the order WhatsApp fills them. A row is either
 * literal text everybody receives, or a {{token}} resolved per recipient.
 */
export default function ParamsField({ control, variables }: Readonly<Props>) {
  const { fields, append, remove } = useFieldArray({ control, name: 'template_params' });

  return (
    <Stack spacing={1}>
      <Typography variant="overline" color="text.secondary">
        Template params
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {`Literal text, or a variable filled per recipient: ${variables.map((v) => `{{${v.name}}}`).join(', ')}. Somebody whose variable is empty is skipped rather than sent a blank.`}
      </Typography>
      {fields.map((field, index) => (
        <ParamRow key={field.id} control={control} index={index} onRemove={() => remove(index)} />
      ))}
      <Box>
        <Button size="small" startIcon={<AddIcon />} onClick={() => append({ value: '' })}>
          Add parameter
        </Button>
      </Box>
    </Stack>
  );
}
