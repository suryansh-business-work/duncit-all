import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
} from '@mui/material';
import GroupIcon from '@mui/icons-material/Group';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/app-settings';
import TemplateSample from '../wa-aisensy/TemplateSample';
import { campaignFor, templateFor, useCampaignOptions } from '../wa-aisensy/useAisensyCatalogue';
import type { WaAudienceList, WaCampaignNameOption, WaCampaignVariable } from '../queries';
import RecipientFields from './RecipientFields';
import ScheduleField from './ScheduleField';
import TemplateInputs from './TemplateInputs';
import { useTemplateFields } from './useTemplateFields';
import { useWaReach } from './useWaReach';
import {
  emptyValues,
  toSendInput,
  waCampaignSchema,
  type SendWaCampaignInput,
  type WaCampaignValues,
} from './wa-campaign.types';

interface Props {
  open: boolean;
  busy: boolean;
  /** Prefilled values when repeating a past send; null starts empty. */
  initial?: WaCampaignValues | null;
  /** The AiSensy campaign a Campaigns row started this send from. */
  campaignName?: string;
  names: WaCampaignNameOption[];
  audienceLists: WaAudienceList[];
  variables: WaCampaignVariable[];
  onClose: () => void;
  onSubmit: (input: SendWaCampaignInput) => void;
}

const reachText = (reach: number) => {
  if (reach === 0) return 'Nobody in this list has a usable WhatsApp number.';
  const noun = reach === 1 ? 'message' : 'messages';
  return `This sends ${reach.toLocaleString()} WhatsApp ${noun}.`;
};

export default function WaCampaignForm({
  open,
  busy,
  initial,
  campaignName,
  names,
  audienceLists,
  variables,
  onClose,
  onSubmit,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const schema = useMemo(() => waCampaignSchema(t), [t]);
  const {
    control,
    getValues,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { isValid },
  } = useForm<WaCampaignValues>({
    defaultValues: emptyValues(),
    resolver: zodResolver(schema),
    mode: 'onChange',
  });

  // Counted rather than watched: the fields below are laid out from the reset
  // values, and on the render where `open` flips they have not landed yet.
  const [resetCount, setResetCount] = useState(0);
  useEffect(() => {
    if (!open) return;
    reset(initial ?? emptyValues(campaignName));
    setResetCount((count) => count + 1);
  }, [open, initial, campaignName, reset]);

  const values = watch();
  const reach = useWaReach(values);
  const { options: campaignOptions, campaigns, templates } = useCampaignOptions(names);
  const campaign = campaignFor(values.wa_campaign_name, campaigns);
  const template = templateFor(values.wa_campaign_name, campaigns, templates);

  useTemplateFields({ resetCount, template, campaign, setValue, getValues });

  // The button says what pressing it does — schedule, or send right now.
  const scheduled = !!values.scheduled_at;
  let submitLabel = scheduled ? 'Schedule' : 'Send now';
  if (busy) submitLabel = scheduled ? 'Scheduling…' : 'Sending…';
  // The variable list is whatever the server supports — no copy of it here.
  const variableList = variables.map((variable) => `{{${variable.name}}}`).join(', ');
  const paramsHint = `Literal text, or a variable filled per recipient: ${variableList}. Somebody whose variable is empty is skipped rather than sent a blank.`;
  const media = values.media_url
    ? { url: values.media_url, filename: values.media_filename }
    : undefined;

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
      <form noValidate onSubmit={handleSubmit((form) => onSubmit(toSendInput(form)))}>
        <DialogTitle>{t('marketing.whatsappCampaigns.sendWhatsappCampaign')}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <RhfTextField
              control={control}
              name="name"
              label={t('marketing.whatsappCampaigns.campaignNameInternal')}
              required
              hint="How you recognise this send in the logs"
            />
            <RhfTextField
              control={control}
              name="wa_campaign_name"
              label={t('marketing.whatsappCampaigns.whatsappCampaign')}
              select
              required
              hint="The approved AiSensy campaign this send uses"
            >
              {campaignOptions.length === 0 && (
                <MenuItem disabled value="">
                  No campaign names yet — add one under Settings
                </MenuItem>
              )}
              {campaignOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </RhfTextField>

            <TemplateInputs
              control={control}
              template={template}
              campaign={campaign}
              hint={paramsHint}
            />

            {template && (
              <TemplateSample
                template={template}
                params={values.template_params.map((param) => param.value)}
                media={media}
                buttons={values.buttons}
              />
            )}

            <RecipientFields
              control={control}
              setValue={setValue}
              audience={values.audience}
              audienceLists={audienceLists}
            />

            {reach !== null && (
              <Alert severity={reach > 0 ? 'info' : 'warning'} icon={<GroupIcon fontSize="small" />}>
                {reachText(reach)}
              </Alert>
            )}

            <ScheduleField control={control} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <DuncitButton type="button" onClick={onClose} disabled={busy}>
            Cancel
          </DuncitButton>
          <DuncitButton type="submit" variant="contained" disabled={busy || !isValid || reach === 0}>
            {submitLabel}
          </DuncitButton>
        </DialogActions>
      </form>
    </Dialog>
  );
}
