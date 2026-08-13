import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
} from '@mui/material';
import GroupIcon from '@mui/icons-material/Group';
import { RhfTextField } from '@duncit/forms';
import TemplateSample from '../wa-aisensy/TemplateSample';
import { templateFor, useCampaignOptions } from '../wa-aisensy/useAisensyCatalogue';
import type { WaAudienceList, WaCampaignNameOption, WaCampaignVariable } from '../queries';
import ParamsField from './ParamsField';
import RecipientFields from './RecipientFields';
import ScheduleField from './ScheduleField';
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
  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { isValid },
  } = useForm<WaCampaignValues>({
    defaultValues: emptyValues(),
    resolver: zodResolver(waCampaignSchema),
    mode: 'onChange',
  });

  useEffect(() => {
    if (open) reset(initial ?? emptyValues(campaignName));
  }, [open, initial, campaignName, reset]);

  const values = watch();
  const reach = useWaReach(values);
  const { options: campaignOptions, campaigns, templates } = useCampaignOptions(names);
  const template = templateFor(values.wa_campaign_name, campaigns, templates);

  // The template decides how many params a send must carry, so the rows follow
  // it rather than the marketer counting {{n}} by hand. Only when AiSensy told
  // us — otherwise the rows stay the marketer's to add.
  const paramCount = template?.param_count;
  const rowCount = values.template_params.length;
  useEffect(() => {
    // Already the right shape — a duplicated send arrives with its params
    // filled, and re-laying them out would wipe what it came with.
    if (paramCount === undefined || rowCount === paramCount) return;
    setValue(
      'template_params',
      Array.from({ length: paramCount }, () => ({ value: '' })),
      { shouldValidate: true }
    );
  }, [paramCount, rowCount, setValue]);

  // The button says what pressing it does — schedule, or send right now.
  const scheduled = !!values.scheduled_at;
  let submitLabel = scheduled ? 'Schedule' : 'Send now';
  if (busy) submitLabel = scheduled ? 'Scheduling…' : 'Sending…';
  // The variable list is whatever the server supports — no copy of it here.
  const variableList = variables.map((variable) => `{{${variable.name}}}`).join(', ');
  const paramsHint = `Literal text, or a variable filled per recipient: ${variableList}. Somebody whose variable is empty is skipped rather than sent a blank.`;

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
      <form noValidate onSubmit={handleSubmit((form) => onSubmit(toSendInput(form)))}>
        <DialogTitle>Send WhatsApp campaign</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <RhfTextField
              control={control}
              name="name"
              label="Campaign name (internal)"
              required
              hint="How you recognise this send in the logs"
            />
            <RhfTextField
              control={control}
              name="wa_campaign_name"
              label="WhatsApp campaign"
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

            {template && <TemplateSample template={template} />}

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

            <ParamsField control={control} hint={paramsHint} />

            <ScheduleField control={control} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button type="button" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={busy || !isValid || reach === 0}>
            {submitLabel}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
