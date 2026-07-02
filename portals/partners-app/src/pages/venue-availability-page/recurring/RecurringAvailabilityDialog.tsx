import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EventRepeatIcon from '@mui/icons-material/EventRepeat';
import BasicSection from './BasicSection';
import PreviewBar from './PreviewBar';
import VenueRulesAccordion from './accordions/VenueRulesAccordion';
import FutureAvailabilityAccordion from './accordions/FutureAvailabilityAccordion';
import SaveAsTemplateAccordion from './accordions/SaveAsTemplateAccordion';
import BulkActionsAccordion from './accordions/BulkActionsAccordion';
import { useRecurringDialog } from './useRecurringDialog';
import { effectiveMaxAdvance } from './settings-map';

interface Props {
  open: boolean;
  onClose: () => void;
  venueId: string;
  settings: unknown;
  onDone: () => Promise<void> | void;
}

export default function RecurringAvailabilityDialog({ open, onClose, venueId, settings, onDone }: Readonly<Props>) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));
  const { form, patch, reset, venueSettings, result, submit, submitting, serverError, setServerError } =
    useRecurringDialog(venueId, settings, onDone);

  const close = () => {
    reset();
    onClose();
  };
  const handleCreate = async () => {
    const ok = await submit();
    if (ok) close();
  };
  const canCreate = result.errors.length === 0 && result.summary.total > 0 && !submitting;
  const datesPicked = !!form.startDate && !!form.endDate;
  const advanceCap = effectiveMaxAdvance(venueSettings.rules.max_advance_days);

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="lg" fullScreen={fullScreen} scroll="paper">
      <DialogTitle sx={{ pr: 6 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <EventRepeatIcon color="primary" />
          <Box>
            <Typography variant="h6" fontWeight={900} sx={{ lineHeight: 1.1 }}>
              Recurring availability
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Create slots with custom timing, pricing and venue settings.
            </Typography>
          </Box>
        </Stack>
        <IconButton onClick={close} aria-label="Close" sx={{ position: 'absolute', right: 8, top: 8 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ py: 3 }}>
        <Stack spacing={3}>
          <BasicSection form={form} patch={patch} settings={venueSettings} />
          {serverError && (
            <Alert severity="error" onClose={() => setServerError(null)}>
              {serverError}
            </Alert>
          )}
          {datesPicked && result.errors.length > 0 && <Alert severity="warning">{result.errors[0]}</Alert>}

          <Typography variant="overline" color="text.secondary" fontWeight={800} sx={{ pt: 0.5 }}>
            Advanced settings
          </Typography>
          <VenueRulesAccordion venueId={venueId} rules={venueSettings.rules} onSaved={onDone} />
          <FutureAvailabilityAccordion
            venueId={venueId}
            autoExtend={venueSettings.auto_extend}
            maxAdvanceDays={advanceCap}
            onSaved={onDone}
          />
          <SaveAsTemplateAccordion venueId={venueId} form={form} patch={patch} />
          <BulkActionsAccordion venueId={venueId} onDone={onDone} />
        </Stack>
      </DialogContent>

      <Box sx={{ px: 3, pt: 2 }}>
        <PreviewBar summary={result.summary} maxAdvanceDays={advanceCap} />
      </Box>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={close}>Cancel</Button>
        <Button variant="contained" disabled={!canCreate} onClick={handleCreate}>
          {submitting ? 'Creating…' : `Create ${result.summary.total} slot${result.summary.total === 1 ? '' : 's'}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
