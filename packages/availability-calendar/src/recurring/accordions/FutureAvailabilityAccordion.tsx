import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Box, FormControlLabel, Stack, Switch, TextField, Typography } from '@mui/material';
import EventRepeatIcon from '@mui/icons-material/EventRepeat';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { DuncitButton } from '@duncit/buttons';
import { format } from 'date-fns';
import { useTranslation } from '@duncit/app-settings';
import type { VenueAutoExtendForm } from '@duncit/slots';
import { MY_SLOT_TEMPLATES, UPDATE_VENUE_SETTINGS } from '../../queries';
import AdvancedAccordion from './AdvancedAccordion';

interface Props {
  venueId: string;
  autoExtend: VenueAutoExtendForm;
  maxAdvanceDays: number;
  onSaved: () => Promise<void> | void;
}

const clampDays = (value: string, max: number) => Math.min(max, Math.max(1, Math.round(Number(value) || 1)));
const untilToDate = (s: string) => (s ? new Date(`${s}T00:00:00`) : null);

export default function FutureAvailabilityAccordion({
  venueId,
  autoExtend,
  maxAdvanceDays,
  onSaved,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<VenueAutoExtendForm>(autoExtend);
  // Free-text while typing so multi-digit entry isn't snapped to 1 mid-keystroke;
  // clamped on blur and on save.
  const [horizonText, setHorizonText] = useState(String(autoExtend.horizon_days));
  const [saved, setSaved] = useState(false);
  const [save, { loading, error }] = useMutation<{ updateVenueSettings: { id: string } }>(UPDATE_VENUE_SETTINGS);
  const { data } = useQuery<{ mySlotTemplates: { is_default: boolean }[] }>(MY_SLOT_TEMPLATES, {
    variables: { venue_id: venueId },
  });
  const hasDefault = (data?.mySlotTemplates ?? []).some((template) => template.is_default);

  const patch = (p: Partial<VenueAutoExtendForm>) => {
    setSaved(false);
    setDraft((d) => ({ ...d, ...p }));
  };

  const commitHorizon = () => {
    const n = clampDays(horizonText, maxAdvanceDays);
    setHorizonText(String(n));
    patch({ horizon_days: n });
    return n;
  };

  const onSave = async () => {
    setSaved(false);
    const horizon = commitHorizon();
    await save({
      variables: {
        venue_doc_id: venueId,
        input: {
          auto_extend: {
            enabled: draft.enabled,
            horizon_days: horizon,
            until: draft.until,
            template_id: draft.template_id,
          },
        },
      },
    });
    setSaved(true);
    await onSaved();
  };

  return (
    <AdvancedAccordion
      icon={<EventRepeatIcon fontSize="small" color="action" />}
      title={t('availability.autoExtend.title')}
      caption={t('availability.autoExtend.caption')}
    >
      <Stack spacing={2}>
        <FormControlLabel
          control={<Switch checked={draft.enabled} onChange={(e) => patch({ enabled: e.target.checked })} />}
          label={t('availability.autoExtend.toggle')}
        />
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('availability.autoExtend.body', { vars: { days: maxAdvanceDays } })}
        </Typography>
        {draft.enabled && !hasDefault && (
          <Alert severity="warning">{t('availability.autoExtend.noDefaultTemplate')}</Alert>
        )}
        <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
          <TextField
            label={t('availability.autoExtend.horizon', { vars: { days: maxAdvanceDays } })}
            type="number"
            size="small"
            value={horizonText}
            onChange={(e) => {
              setSaved(false);
              setHorizonText(e.target.value);
            }}
            onBlur={commitHorizon}
            disabled={!draft.enabled}
            slotProps={{ htmlInput: { min: 1, max: maxAdvanceDays } }}
          />
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <DatePicker
              label={t('availability.autoExtend.stopOn')}
              value={untilToDate(draft.until)}
              onChange={(d) => patch({ until: d ? format(d, 'yyyy-MM-dd') : '' })}
              minDate={new Date()}
              disabled={!draft.enabled}
              slotProps={{ textField: { fullWidth: true, size: 'small' } }}
            />
            {draft.enabled && draft.until && (
              <DuncitButton size="small" onClick={() => patch({ until: '' })}>
                {t('availability.autoExtend.clear')}
              </DuncitButton>
            )}
          </Stack>
        </Box>
        {error && <Alert severity="error">{t('availability.autoExtend.saveFailed')}</Alert>}
        {saved && !loading && <Alert severity="success">{t('availability.autoExtend.saved')}</Alert>}
        <Box>
          <DuncitButton variant="outlined" onClick={onSave} disabled={loading}>
            {loading ? t('availability.autoExtend.saving') : t('availability.autoExtend.save')}
          </DuncitButton>
        </Box>
      </Stack>
    </AdvancedAccordion>
  );
}
