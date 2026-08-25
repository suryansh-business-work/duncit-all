import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
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
import EventRepeatIcon from '@mui/icons-material/EventRepeat';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { format } from 'date-fns';
import { MY_SLOT_TEMPLATES, UPDATE_VENUE_SETTINGS } from '../recurring.queries';
import type { VenueAutoExtendForm } from '../settings-map';
import { useTranslation } from '@duncit/shell';

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
  const [save, { loading, error }] = useMutation(UPDATE_VENUE_SETTINGS);
  const { data } = useQuery(MY_SLOT_TEMPLATES, { variables: { venue_id: venueId } });
  const hasDefault = (data?.mySlotTemplates ?? []).some((t: { is_default: boolean }) => t.is_default);

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
    <Accordion disableGutters elevation={0} sx={{ border: 1, borderColor: 'divider', borderRadius: 2, '&:before': { display: 'none' } }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Stack direction="row" spacing={1.5} sx={{
          alignItems: "center"
        }}>
          <EventRepeatIcon fontSize="small" color="action" />
          <div>
            <Typography sx={{
              fontWeight: 800
            }}>{t('partners.venueAvailabilityPage.futureAvailability')}</Typography>
            <Typography variant="caption" sx={{
              color: "text.secondary"
            }}>
              Keep slots published automatically
            </Typography>
          </div>
        </Stack>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={2}>
          <FormControlLabel
            control={<Switch checked={draft.enabled} onChange={(e) => patch({ enabled: e.target.checked })} />}
            label={t('partners.venueAvailabilityPage.autoExtendAvailability')}
          />
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            A daily job keeps slots published ahead using your default slot template — no need to re-open this
            dialog. Slots are added up to the window below (max {maxAdvanceDays} days, set under Venue rules).
          </Typography>
          {draft.enabled && !hasDefault && (
            <Alert severity="warning">
              You don&apos;t have a default template yet. Save one under “Save as template” and mark it default —
              auto-extend rolls that template forward.
            </Alert>
          )}
          <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
            <TextField
              label={`Keep published ahead (days, max ${maxAdvanceDays})`}
              type="number"
              size="small"
              value={horizonText}
              onChange={(e) => {
                setSaved(false);
                setHorizonText(e.target.value);
              }}
              onBlur={commitHorizon}
              disabled={!draft.enabled}
              slotProps={{
                htmlInput: { min: 1, max: maxAdvanceDays }
              }}
            />
            <Stack direction="row" spacing={1} sx={{
              alignItems: "center"
            }}>
              <DatePicker
                label={t('partners.venueAvailabilityPage.stopOnOptional')}
                value={untilToDate(draft.until)}
                onChange={(d) => patch({ until: d ? format(d, 'yyyy-MM-dd') : '' })}
                minDate={new Date()}
                disabled={!draft.enabled}
                slotProps={{ textField: { fullWidth: true, size: 'small' } }}
              />
              {draft.enabled && draft.until && (
                <Button size="small" onClick={() => patch({ until: '' })}>
                  Clear
                </Button>
              )}
            </Stack>
          </Box>
          {error && <Alert severity="error">{t('partners.venueAvailabilityPage.couldNotSaveAutoExtendPlease')}</Alert>}
          {saved && !loading && <Alert severity="success">{t('partners.venueAvailabilityPage.autoExtendSaved')}</Alert>}
          <Box>
            <Button variant="outlined" onClick={onSave} disabled={loading}>
              {loading ? 'Saving…' : 'Save auto-extend'}
            </Button>
          </Box>
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
