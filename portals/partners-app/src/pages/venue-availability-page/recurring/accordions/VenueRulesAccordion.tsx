import { useState } from 'react';
import { useMutation } from '@apollo/client';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import RuleIcon from '@mui/icons-material/Rule';
import { UPDATE_VENUE_SETTINGS } from '../recurring.queries';
import type { VenueRulesForm } from '../settings-map';

type NumKey = 'buffer_minutes' | 'min_notice_minutes' | 'max_advance_days' | 'max_bookings_per_slot';
type BoolKey =
  | 'allow_instant_booking'
  | 'allow_waitlist'
  | 'booking_approval_required'
  | 'allow_multiple_bookings';

const NUM_FIELDS: ReadonlyArray<{ key: NumKey; label: string; max?: number }> = [
  { key: 'buffer_minutes', label: 'Buffer between slots (min)' },
  { key: 'min_notice_minutes', label: 'Minimum booking notice (min)' },
  // A venue may schedule availability at most 60 days ahead.
  { key: 'max_advance_days', label: 'Maximum advance booking (days)', max: 60 },
  { key: 'max_bookings_per_slot', label: 'Maximum bookings per slot' },
];

const TOGGLE_FIELDS: ReadonlyArray<{ key: BoolKey; label: string }> = [
  { key: 'allow_instant_booking', label: 'Allow instant booking' },
  { key: 'allow_waitlist', label: 'Allow waitlist' },
  { key: 'booking_approval_required', label: 'Booking approval required' },
  { key: 'allow_multiple_bookings', label: 'Allow multiple bookings' },
];

interface Props {
  venueId: string;
  rules: VenueRulesForm;
  onSaved: () => Promise<void> | void;
}

export default function VenueRulesAccordion({ venueId, rules, onSaved }: Readonly<Props>) {
  const [draft, setDraft] = useState<VenueRulesForm>(rules);
  const [saved, setSaved] = useState(false);
  const [save, { loading, error }] = useMutation(UPDATE_VENUE_SETTINGS);

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
    <Accordion disableGutters elevation={0} sx={{ border: 1, borderColor: 'divider', borderRadius: 2, '&:before': { display: 'none' } }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <RuleIcon fontSize="small" color="action" />
          <div>
            <Typography fontWeight={800}>Venue rules</Typography>
            <Typography variant="caption" color="text.secondary">
              Buffer, booking window and advance-booking limits
            </Typography>
          </div>
        </Stack>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={2}>
          <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
            {NUM_FIELDS.map((f) => (
              <TextField
                key={f.key}
                label={f.label}
                type="number"
                size="small"
                value={draft[f.key]}
                onChange={(e) => setNum(f.key, e.target.value, f.max)}
                inputProps={{ min: 0, max: f.max }}
              />
            ))}
          </Box>
          <Box sx={{ display: 'grid', gap: 0.5, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
            {TOGGLE_FIELDS.map((f) => (
              <FormControlLabel
                key={f.key}
                control={<Switch checked={draft[f.key]} onChange={(e) => setBool(f.key, e.target.checked)} />}
                label={f.label}
              />
            ))}
          </Box>
          {error && <Alert severity="error">{error.message}</Alert>}
          {saved && !loading && <Alert severity="success">Venue rules saved.</Alert>}
          <Box>
            <Button variant="outlined" onClick={onSave} disabled={loading}>
              {loading ? 'Saving…' : 'Save rules'}
            </Button>
          </Box>
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
