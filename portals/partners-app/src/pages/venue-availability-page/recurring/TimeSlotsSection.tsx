import { Box, Stack, Typography } from '@mui/material';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { newTimeSlot, type TimeSlotRow } from './useRecurringDialog';
import { useTranslation } from '@duncit/shell';

interface Props {
  timeSlots: TimeSlotRow[];
  onChange: (next: TimeSlotRow[]) => void;
  openHours: { open: string; close: string };
  bufferMinutes: number;
}

/** The Time section — one or more start/end ranges per day. Adjacent ranges must
 * keep the venue's buffer gap (the generator validates; the hint states it). */
export default function TimeSlotsSection({ timeSlots, onChange, openHours, bufferMinutes }: Readonly<Props>) {
  const { t } = useTranslation();
  const setRow = (id: string, p: Partial<TimeSlotRow>) =>
    onChange(timeSlots.map((r) => (r.id === id ? { ...r, ...p } : r)));
  const addRow = () => onChange([...timeSlots, newTimeSlot('15:00', '16:00')]);
  const removeRow = (id: string) => onChange(timeSlots.filter((r) => r.id !== id));

  const gapHint = bufferMinutes > 0 ? `Keep a ${bufferMinutes}-min gap between slots.` : 'Slots must not overlap.';

  return (
    <Box>
      <Typography variant="body2" sx={{ fontWeight: 800, mb: 0.5 }}>
        Time slots
      </Typography>
      <Stack spacing={1}>
        {timeSlots.map((row, index) => (
          <Stack key={row.id} direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{
            alignItems: { sm: 'center' }
          }}>
            <TimePicker
              label={timeSlots.length > 1 ? `Start #${index + 1}` : t('partners.page.start')}
              value={row.start}
              onChange={(t) => setRow(row.id, { start: t })}
              slotProps={{ textField: { size: 'small', fullWidth: true } }}
            />
            <TimePicker
              label={t('partners.venueAvailabilityPage.end')}
              value={row.end}
              onChange={(t) => setRow(row.id, { end: t })}
              slotProps={{ textField: { size: 'small', fullWidth: true } }}
            />
            <DuncitIconButton
              size="small"
              aria-label={`Remove time slot ${index + 1}`}
              disabled={timeSlots.length === 1}
              onClick={() => removeRow(row.id)}
            >
              <DeleteOutlineIcon fontSize="small" />
            </DuncitIconButton>
          </Stack>
        ))}
      </Stack>
      <DuncitButton size="small" startIcon={<AddIcon />} onClick={addRow} sx={{ mt: 1 }}>
        Add time slot
      </DuncitButton>
      <Stack
        direction="row"
        spacing={0.5}
        sx={{
          alignItems: "center",
          mt: 0.5
        }}>
        <InfoOutlinedIcon fontSize="inherit" color="action" />
        <Typography variant="caption" sx={{
          color: "text.secondary"
        }}>
          Venue hours {openHours.open}–{openHours.close}. {gapHint}
        </Typography>
      </Stack>
    </Box>
  );
}
