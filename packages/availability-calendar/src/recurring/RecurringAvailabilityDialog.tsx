import {
  Alert,
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EventRepeatIcon from '@mui/icons-material/EventRepeat';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import { effectiveMaxAdvance, recurringErrorMessage } from '@duncit/slots';
import BasicSection from './BasicSection';
import PreviewBar from './PreviewBar';
import VenueRulesAccordion from './accordions/VenueRulesAccordion';
import FutureAvailabilityAccordion from './accordions/FutureAvailabilityAccordion';
import SaveAsTemplateAccordion from './accordions/SaveAsTemplateAccordion';
import BulkActionsAccordion from './accordions/BulkActionsAccordion';
import { useRecurringDialog } from './useRecurringDialog';
import type { VenueSpace } from '../types';

interface Props {
  open: boolean;
  onClose: () => void;
  venueId: string;
  /** The venue's GraphQL `settings`, read leniently — old venues carry none. */
  settings: unknown;
  capacityItems: VenueSpace[];
  venueCapacity: number;
  /** After anything is written: the batch, a rule, a template, a bulk edit. */
  onDone: () => Promise<void> | void;
}

/**
 * The rich recurring-availability dialog: date range, weekdays, one or more
 * daily windows (or whole days), a price per space, what to do on a clash,
 * plus the venue-rule, auto-extend, template and bulk-action accordions. The
 * preview and the batch it sends come from the same generator call.
 */
export default function RecurringAvailabilityDialog({
  open,
  onClose,
  venueId,
  settings,
  capacityItems,
  venueCapacity,
  onDone,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));
  const { form, patch, reset, venueSettings, result, submit, submitting, serverError, setServerError } =
    useRecurringDialog(venueId, settings, capacityItems, venueCapacity, onDone);

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
  const firstError = result.errors[0];
  const total = result.summary.total;
  const createLabel =
    total === 1
      ? t('availability.recurring.createSlot')
      : t('availability.recurring.createSlots', { vars: { count: total } });

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="lg" fullScreen={fullScreen} scroll="paper">
      <DialogTitle sx={{ pr: 6 }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <EventRepeatIcon color="primary" />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 900, lineHeight: 1.1 }}>
              {t('availability.recurring.title')}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {t('availability.recurring.subtitle')}
            </Typography>
          </Box>
        </Stack>
        <DuncitIconButton
          onClick={close}
          aria-label={t('availability.close')}
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <CloseIcon />
        </DuncitIconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ py: 3 }}>
        <Stack spacing={3}>
          <BasicSection form={form} patch={patch} settings={venueSettings} />
          {serverError && (
            <Alert severity="error" onClose={() => setServerError(null)}>
              {serverError}
            </Alert>
          )}
          {datesPicked && firstError && (
            <Alert severity="warning">{recurringErrorMessage(firstError, t, venueSettings)}</Alert>
          )}

          <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 800, pt: 0.5 }}>
            {t('availability.recurring.advancedSettings')}
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
        <DuncitButton onClick={close}>{t('availability.cancel')}</DuncitButton>
        <DuncitButton variant="contained" disabled={!canCreate} onClick={handleCreate}>
          {submitting ? t('availability.recurring.creating') : createLabel}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
