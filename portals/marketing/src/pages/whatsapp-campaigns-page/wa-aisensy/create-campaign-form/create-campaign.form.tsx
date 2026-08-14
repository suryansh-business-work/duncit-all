import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  ListSubheader,
  MenuItem,
  Stack,
} from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/app-settings';
import type { AisensyTemplate, CreateAisensyCampaignInput } from '../../queries';
import { paramsLabel, templateRowId } from '../helpers';
import {
  createCampaignSchema,
  emptyValues,
  toCreateInput,
  type CreateCampaignValues,
} from './create-campaign.types';

interface Props {
  open: boolean;
  busy: boolean;
  /** Approved templates nothing can send yet — offered first, because a
   * campaign is the only thing standing between them and going out. */
  orphans: AisensyTemplate[];
  /** Approved templates a campaign already sends. */
  bound: AisensyTemplate[];
  onClose: () => void;
  onSubmit: (input: CreateAisensyCampaignInput) => Promise<boolean>;
}

/** The param count rides the option: it is what the campaign will demand of
 * every send, and it cannot be changed once the binding exists. */
const templateOption = (template: AisensyTemplate) => (
  <MenuItem key={templateRowId(template)} value={template.name}>
    {`${template.name} · ${paramsLabel(template.param_count)}`}
  </MenuItem>
);

/**
 * Bind an approved template to a campaign name — the name every send addresses.
 * There is no edit here either: a campaign pointed at the wrong template is a
 * new campaign, so the choice is made once, deliberately, with nothing
 * pre-selected.
 */
export default function CreateCampaignForm({
  open,
  busy,
  orphans,
  bound,
  onClose,
  onSubmit,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const schema = useMemo(() => createCampaignSchema(t), [t]);
  const {
    control,
    handleSubmit,
    reset,
    formState: { isValid },
  } = useForm<CreateCampaignValues>({
    defaultValues: emptyValues(),
    resolver: zodResolver(schema),
    mode: 'onChange',
  });

  useEffect(() => {
    if (open) reset(emptyValues());
  }, [open, reset]);

  const submit = handleSubmit(async (values) => {
    const ok = await onSubmit(toCreateInput(values));
    if (ok) onClose();
  });

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
      <form noValidate onSubmit={submit}>
        <DialogTitle>{t('marketingWhatsapp.campaignDialogTitle')}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {orphans.length > 0 && (
              <Alert severity="warning">{t('marketingWhatsapp.needsCampaignBody')}</Alert>
            )}
            <RhfTextField
              control={control}
              name="template_name"
              label={t('marketingWhatsapp.templateNameLabel')}
              select
              required
              hint={t('marketingWhatsapp.templateNameHelp')}
            >
              {orphans.length > 0 && (
                <ListSubheader>{t('marketingWhatsapp.needsCampaignTitle')}</ListSubheader>
              )}
              {orphans.map(templateOption)}
              {bound.map(templateOption)}
            </RhfTextField>
            <RhfTextField
              control={control}
              name="campaign_name"
              label={t('marketingWhatsapp.campaignNameLabel')}
              required
              hint={t('marketingWhatsapp.campaignNameHelp')}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button type="button" onClick={onClose} disabled={busy}>
            {t('marketingWhatsapp.cancel')}
          </Button>
          <Button type="submit" variant="contained" disabled={busy || !isValid}>
            {busy ? t('marketingWhatsapp.submitting') : t('marketingWhatsapp.submitCampaign')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
