import { useFieldArray, type Control } from 'react-hook-form';
import { Alert, Box, Button, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { RhfTextField } from '@duncit/forms';
import { MANUAL_VARIABLE_NOTE } from '../helpers';
import type { WaCampaignValues } from './wa-campaign.types';
import { useTranslation } from '@duncit/app-settings';

/**
 * Numbers typed in by hand. The country code is its own field because it is the
 * one part a marketer forgets and WhatsApp cannot infer — a number without it
 * is not deliverable, and finding that out per recipient is finding it out too
 * late.
 */

interface Props {
  control: Control<WaCampaignValues>;
}

/** One contact row. Hoisted so it isn't redefined each render (S6478). */
function ContactRow({
  control,
  index,
  onRemove,
}: Readonly<{ control: Control<WaCampaignValues>; index: number; onRemove: () => void }>) {
  const { t } = useTranslation();
  return (
    <Stack direction="row" spacing={1} sx={{
      alignItems: "flex-start"
    }}>
      <RhfTextField
        control={control}
        name={`contacts.${index}.name`}
        label={t('shell.common.name')}
        size="small"
        hint=" "
      />
      <RhfTextField
        control={control}
        name={`contacts.${index}.extension`}
        label={t('marketing.whatsappCampaigns.code')}
        size="small"
        hint=" "
        sx={{ maxWidth: 96 }}
      />
      <RhfTextField
        control={control}
        name={`contacts.${index}.number`}
        label={t('marketing.whatsappCampaigns.number')}
        size="small"
        hint=" "
      />
      <Tooltip title={t('marketing.whatsappCampaigns.removeContact')}>
        <IconButton
          aria-label={`Remove contact ${index + 1}`}
          onClick={onRemove}
          sx={{ mt: 0.5 }}
        >
          <DeleteOutlineIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Stack>
  );
}

export default function ManualContactsField({ control }: Readonly<Props>) {
  const { fields, append, remove } = useFieldArray({ control, name: 'contacts' });

  return (
    <Stack spacing={1}>
      <Typography variant="overline" sx={{
        color: "text.secondary"
      }}>
        Contacts
      </Typography>
      <Alert severity="info" icon={false} sx={{ py: 0.5 }}>
        <Typography variant="caption">{MANUAL_VARIABLE_NOTE}</Typography>
      </Alert>
      {fields.map((field, index) => (
        <ContactRow
          key={field.id}
          control={control}
          index={index}
          onRemove={() => remove(index)}
        />
      ))}
      <Box>
        <Button
          size="small"
          startIcon={<AddIcon />}
          onClick={() => append({ name: '', extension: '', number: '' })}
        >
          Add contact
        </Button>
      </Box>
    </Stack>
  );
}
