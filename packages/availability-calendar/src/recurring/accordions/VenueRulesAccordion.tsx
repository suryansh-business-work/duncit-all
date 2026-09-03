import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Alert, Box, FormControlLabel, Stack, Switch, TextField } from '@mui/material';
import RuleIcon from '@mui/icons-material/Rule';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation, type Translator } from '@duncit/app-settings';
import type { VenueRulesForm } from '@duncit/slots';
import { UPDATE_VENUE_SETTINGS } from '../../queries';
import AdvancedAccordion from './AdvancedAccordion';

type NumKey = 'buffer_minutes' | 'min_notice_minutes' | 'max_advance_days' | 'max_bookings_per_slot';
type BoolKey =
  | 'allow_instant_booking'
  | 'allow_waitlist'
  | 'booking_approval_required'
  | 'allow_multiple_bookings';

type Translate = Translator['t'];

const numFields = (t: Translate): ReadonlyArray<{ key: NumKey; label: string; max?: number }> => [
  { key: 'buffer_minutes', label: t('availability.rules.bufferMinutes') },
  { key: 'min_notice_minutes', label: t('availability.rules.minNotice') },
  // A venue may schedule availability at most 60 days ahead.
  { key: 'max_advance_days', label: t('availability.rules.maxAdvance'), max: 60 },
  { key: 'max_bookings_per_slot', label: t('availability.rules.maxBookings') },
];

const toggleFields = (t: Translate): ReadonlyArray<{ key: BoolKey; label: string }> => [
  { key: 'allow_instant_booking', label: t('availability.rules.allowInstant') },
  { key: 'allow_waitlist', label: t('availability.rules.allowWaitlist') },
  { key: 'booking_approval_required', label: t('availability.rules.approvalRequired') },
  { key: 'allow_multiple_bookings', label: t('availability.rules.allowMultiple') },
];

interface Props {
  venueId: string;
  rules: VenueRulesForm;
  onSaved: () => Promise<void> | void;
}

export default function VenueRulesAccordion({ venueId, rules, onSaved }: Readonly<Props>) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<VenueRulesForm>(rules);
  const [saved, setSaved] = useState(false);
  const [save, { loading, error }] = useMutation<{ updateVenueSettings: { id: string } }>(UPDATE_VENUE_SETTINGS);

  const setNum = (key: NumKey, value: string, max?: number) =>
    setDraft((d) => ({
      ...d,
      [key]: Math.min(max ?? Number.POSITIVE_INFINITY, Math.max(0, Math.round(Number(value) || 0))),
    }));
  const setBool = (key: BoolKey, value: boolean) => setDraft((d) => ({ ...d, [key]: value }));

  const onSave = async () => {
    setSaved(false);
    await save({ variables: { venue_doc_id: venueId, input: { rules: draft } } });
    setSaved(true);
    await onSaved();
  };

  return (
    <AdvancedAccordion
      icon={<RuleIcon fontSize="small" color="action" />}
      title={t('availability.rules.title')}
      caption={t('availability.rules.caption')}
    >
      <Stack spacing={2}>
        <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
          {numFields(t).map((f) => (
            <TextField
              key={f.key}
              label={f.label}
              type="number"
              size="small"
              value={draft[f.key]}
              onChange={(e) => setNum(f.key, e.target.value, f.max)}
              slotProps={{ htmlInput: { min: 0, max: f.max } }}
            />
          ))}
        </Box>
        <Box sx={{ display: 'grid', gap: 0.5, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
          {toggleFields(t).map((f) => (
            <FormControlLabel
              key={f.key}
              control={<Switch checked={draft[f.key]} onChange={(e) => setBool(f.key, e.target.checked)} />}
              label={f.label}
            />
          ))}
        </Box>
        {error && <Alert severity="error">{error.message}</Alert>}
        {saved && !loading && <Alert severity="success">{t('availability.rules.saved')}</Alert>}
        <Box>
          <DuncitButton variant="outlined" onClick={onSave} disabled={loading}>
            {loading ? t('availability.rules.saving') : t('availability.rules.save')}
          </DuncitButton>
        </Box>
      </Stack>
    </AdvancedAccordion>
  );
}
