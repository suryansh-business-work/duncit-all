import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  Typography,
} from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/app-settings';
import TemplateInputs from '../wa-campaign-form/TemplateInputs';
import { useTemplateFields } from '../wa-campaign-form/useTemplateFields';
import TemplateSample from '../wa-aisensy/TemplateSample';
import { campaignFor, templateFor, useCampaignOptions } from '../wa-aisensy/useAisensyCatalogue';
import type { WaCampaignNameOption } from '../queries';
import {
  emptyValues,
  toTestInput,
  waTestSchema,
  type WaTestInput,
  type WaTestValues,
} from './wa-test.types';

interface Props {
  open: boolean;
  busy: boolean;
  /** The campaign a Campaigns row started this test from. */
  campaignName?: string;
  names: WaCampaignNameOption[];
  onClose: () => void;
  onSubmit: (input: WaTestInput) => Promise<boolean>;
}

const PARAMS_HINT =
  'Literal text only — a test has no recipient to resolve {{first_name}} against.';

/**
 * Send one message to one number before pointing a template at an audience.
 * Same server path as a campaign, so a template that works here works there.
 */
export default function WaTestForm({
  open,
  busy,
  campaignName,
  names,
  onClose,
  onSubmit,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const schema = useMemo(() => waTestSchema(t), [t]);
  const { options, campaigns, templates } = useCampaignOptions(names);
  // The campaign the test was started from wins; the first option is only the
  // fallback for a test opened without one.
  const startCampaign = campaignName || options[0]?.value || '';
  const {
    control,
    getValues,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { isValid },
  } = useForm<WaTestValues, any, WaTestValues>({
    defaultValues: emptyValues(''),
    resolver: zodResolver(schema),
    mode: 'onChange',
  });

  // See `useTemplateFields`: the reset is what the field layout follows, not
  // `open`, whose render still carries the previous send's values.
  const [resetCount, setResetCount] = useState(0);
  useEffect(() => {
    if (!open) return;
    reset(emptyValues(startCampaign));
    setResetCount((count) => count + 1);
  }, [open, startCampaign, reset]);

  const values = watch();
  const campaign = campaignFor(values.wa_campaign_name, campaigns);
  const template = templateFor(values.wa_campaign_name, campaigns, templates);
  useTemplateFields({ resetCount, template, campaign, setValue, getValues });

  const submit = handleSubmit(async (next) => {
    const ok = await onSubmit(toTestInput(next));
    if (ok) onClose();
  });

  const media = values.media_url
    ? { url: values.media_url, filename: values.media_filename }
    : undefined;

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
      <form noValidate onSubmit={submit}>
        <DialogTitle>{t('marketing.whatsappCampaigns.sendATestMessage')}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography variant="body2" sx={{
              color: "text.secondary"
            }}>
              One real WhatsApp message to one number — billed like any other.
            </Typography>
            <RhfTextField
              control={control}
              name="wa_campaign_name"
              label={t('marketing.whatsappCampaigns.whatsappCampaign')}
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

            <RhfTextField
              control={control}
              name="destination"
              label={t('marketing.common.destination')}
              required
              hint="Country code + number, digits only — e.g. 919582998897"
            />
            <RhfTextField
              control={control}
              name="user_name"
              label={t('marketing.whatsappCampaigns.userName')}
              required
              hint="Name AiSensy records for this contact"
            />

            <TemplateInputs
              control={control}
              template={template}
              campaign={campaign}
              hint={PARAMS_HINT}
            />

            {template && (
              <TemplateSample
                template={template}
                params={values.template_params.map((param) => param.value)}
                media={media}
                buttons={values.buttons}
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <DuncitButton type="button" onClick={onClose} disabled={busy}>
            Cancel
          </DuncitButton>
          <DuncitButton type="submit" variant="contained" disabled={busy || !isValid}>
            {busy ? 'Sending…' : 'Send test'}
          </DuncitButton>
        </DialogActions>
      </form>
    </Dialog>
  );
}
