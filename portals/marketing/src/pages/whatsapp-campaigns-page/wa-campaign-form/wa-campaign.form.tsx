import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
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
  TextField,
} from '@mui/material';
import GroupIcon from '@mui/icons-material/Group';
import { RhfTextField } from '@duncit/forms';
import { WA_AUDIENCE_OPTIONS } from '../helpers';
import type { WaAudienceList, WaCampaignNameOption, WaCampaignVariable } from '../queries';
import ParamsField from './ParamsField';
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
  names: WaCampaignNameOption[];
  audienceLists: WaAudienceList[];
  variables: WaCampaignVariable[];
  onClose: () => void;
  onManageNames: () => void;
  onSubmit: (input: SendWaCampaignInput) => void;
}

const reachText = (reach: number) =>
  reach > 0
    ? `This sends ${reach.toLocaleString()} WhatsApp ${reach === 1 ? 'message' : 'messages'}.`
    : 'Nobody in this audience has a usable WhatsApp number.';

export default function WaCampaignForm({
  open,
  busy,
  names,
  audienceLists,
  variables,
  onClose,
  onManageNames,
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
    if (open) reset(emptyValues());
  }, [open, reset]);

  const audience = watch('audience');
  const reach = useWaReach(audience, watch('audience_list_id'));

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
      <form noValidate onSubmit={handleSubmit((values) => onSubmit(toSendInput(values)))}>
        <DialogTitle>New WhatsApp campaign</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <RhfTextField
              control={control}
              name="name"
              label="Campaign name (internal)"
              required
              hint="How you recognise this send in the table"
            />
            <RhfTextField
              control={control}
              name="wa_campaign_name"
              label="WhatsApp campaign"
              select
              required
              hint="The approved AiSensy campaign this send uses"
            >
              {names.length === 0 && (
                <MenuItem disabled value="">
                  No campaign names yet — add one with Manage names
                </MenuItem>
              )}
              {names.map((option) => (
                <MenuItem key={option.id} value={option.name}>
                  {option.description ? `${option.name} · ${option.description}` : option.name}
                </MenuItem>
              ))}
            </RhfTextField>

            <Controller
              control={control}
              name="audience"
              render={({ field }) => (
                <TextField
                  select
                  label="Target audience"
                  fullWidth
                  value={field.value}
                  onBlur={field.onBlur}
                  onChange={(event) => {
                    field.onChange(event.target.value);
                    setValue('audience_list_id', '');
                  }}
                >
                  {WA_AUDIENCE_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />

            {audience === 'AUDIENCE_LIST' && (
              <RhfTextField
                control={control}
                name="audience_list_id"
                label="Audience list"
                select
                hint="Membership is recomputed when you send"
              >
                {audienceLists.length === 0 && (
                  <MenuItem disabled value="">
                    No saved lists yet — create one under Target Audience
                  </MenuItem>
                )}
                {audienceLists.map((list) => (
                  <MenuItem key={list.id} value={list.id}>
                    {`${list.name} · ${list.member_count.toLocaleString()}`}
                  </MenuItem>
                ))}
              </RhfTextField>
            )}

            {reach !== null && (
              <Alert severity={reach > 0 ? 'info' : 'warning'} icon={<GroupIcon fontSize="small" />}>
                {reachText(reach)}
              </Alert>
            )}

            <ParamsField control={control} variables={variables} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'space-between' }}>
          <Button type="button" onClick={onManageNames} disabled={busy}>
            Manage names
          </Button>
          <Stack direction="row" spacing={1}>
            <Button type="button" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={busy || !isValid || reach === 0}>
              {busy ? 'Sending…' : 'Send now'}
            </Button>
          </Stack>
        </DialogActions>
      </form>
    </Dialog>
  );
}
