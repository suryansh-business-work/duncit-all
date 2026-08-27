import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { campaignNameSchema, emptyValues, type CampaignNameValues } from './campaign-name.types';
import { useTranslation } from '@duncit/app-settings';

interface Props {
  busy: boolean;
  onSubmit: (values: CampaignNameValues) => Promise<void>;
}

/** Add one campaign name to the list marketing picks from. The name must match
 * the AiSensy campaign exactly — it is what every message is sent under. */
export default function CampaignNameForm({ busy, onSubmit }: Readonly<Props>) {
  const { t } = useTranslation();
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
          label={t('marketing.common.campaignName')}
          size="small"
          required
          hint="Exactly as it appears in AiSensy, e.g. duncit_camp_1"
        />
        <RhfTextField
          control={control}
          name="description"
          label={t('marketing.whatsappCampaigns.whatThisTemplateSaysOptional')}
          size="small"
          hint=" "
        />
        <Stack direction="row" sx={{
          justifyContent: "flex-end"
        }}>
          <DuncitButton type="submit" startIcon={<AddIcon />} variant="outlined" disabled={busy || !isValid}>
            Add
          </DuncitButton>
        </Stack>
      </Stack>
    </form>
  );
}
