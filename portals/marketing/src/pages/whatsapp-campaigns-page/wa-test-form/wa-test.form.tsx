import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  Typography,
} from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import ParamsField from '../wa-campaign-form/ParamsField';
import { templateFor, useCampaignOptions } from '../wa-aisensy/useAisensyCatalogue';
import type { WaCampaignNameOption } from '../queries';
import { emptyValues, toTestInput, waTestSchema, type WaTestInput, type WaTestValues } from './wa-test.types';

interface Props {
  open: boolean;
  busy: boolean;
  names: WaCampaignNameOption[];
  onClose: () => void;
  onSubmit: (input: WaTestInput) => Promise<boolean>;
}

const PARAMS_HINT =
  'Literal text only — a test has no recipient to resolve {{first_name}} against. Add exactly as many as the template expects.';

/**
 * Send one message to one number before pointing a template at an audience.
 * Same server path as a campaign, so a template that works here works there.
 */
export default function WaTestForm({ open, busy, names, onClose, onSubmit }: Readonly<Props>) {
  const { options, campaigns, templates } = useCampaignOptions(names);
  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { isValid },
  } = useForm<WaTestValues>({
    defaultValues: emptyValues(options[0]?.value ?? ''),
    resolver: zodResolver(waTestSchema),
    mode: 'onChange',
  });

  useEffect(() => {
    if (open) reset(emptyValues(options[0]?.value ?? ''));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only the first
    // option matters, and re-running on every options identity would wipe typing
  }, [open, options[0]?.value, reset]);

  // A test proves the template, so it carries exactly the params the template
  // expects — the same rule the campaign form follows.
  const template = templateFor(watch('wa_campaign_name'), campaigns, templates);
  const paramCount = template?.param_count;
  useEffect(() => {
    if (paramCount === undefined) return;
    setValue(
      'template_params',
      Array.from({ length: paramCount }, () => ({ value: '' })),
      { shouldValidate: true }
    );
  }, [paramCount, setValue]);

  const submit = handleSubmit(async (values) => {
    const ok = await onSubmit(toTestInput(values));
    if (ok) onClose();
  });

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
      <form noValidate onSubmit={submit}>
        <DialogTitle>Send a test message</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              One real WhatsApp message to one number — billed like any other.
            </Typography>
            <RhfTextField
              control={control}
              name="wa_campaign_name"
              label="WhatsApp campaign"
              select
              required
              hint="The approved AiSensy campaign to test"
            >
              {options.length === 0 && (
                <MenuItem disabled value="">
                  No campaign names yet — add one with Manage names
                </MenuItem>
              )}
              {options.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </RhfTextField>

            {template && (
              <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                {template.body}
              </Typography>
            )}
            <RhfTextField
              control={control}
              name="destination"
              label="Destination"
              required
              hint="Country code + number, digits only — e.g. 919582998897"
            />
            <RhfTextField
              control={control}
              name="user_name"
              label="User name"
              required
              hint="Name AiSensy records for this contact"
            />
            <ParamsField control={control} hint={PARAMS_HINT} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button type="button" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={busy || !isValid}>
            {busy ? 'Sending…' : 'Send test'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
