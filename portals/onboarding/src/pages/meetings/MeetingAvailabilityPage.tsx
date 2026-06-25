import { useEffect, useState } from 'react';
import { gql, useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { format, parse } from 'date-fns';
import MeetingHolidaysCard from './MeetingHolidaysCard';

// "HH:mm" string ↔ Date for the MUIX TimePicker (kept as strings for the API).
const toTime = (hhmm: string): Date | null => {
  if (!hhmm) return null;
  const d = parse(hhmm, 'HH:mm', new Date());
  return Number.isNaN(d.getTime()) ? null : d;
};
const fromTime = (d: Date | null): string =>
  d && !Number.isNaN(d.getTime()) ? format(d, 'HH:mm') : '';

const AVAILABILITY = gql`
  query MeetingAvailability {
    meetingAvailability {
      id
      week_days
      start_time
      end_time
      slot_minutes
      horizon_days
      timezone_offset_minutes
    }
  }
`;
const UPDATE = gql`
  mutation UpdateMeetingAvailability($input: MeetingAvailabilityInput!) {
    updateMeetingAvailability(input: $input) {
      id
      week_days
      start_time
      end_time
      slot_minutes
      horizon_days
    }
  }
`;

const DAYS = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
];

/** Global onboarding-meeting availability — drives the slot grid users book from. */
export default function MeetingAvailabilityPage() {
  const { data, loading, error } = useQuery(AVAILABILITY, { fetchPolicy: 'cache-and-network' });
  const [save, { loading: saving }] = useMutation(UPDATE);
  const [weekDays, setWeekDays] = useState<number[]>([]);
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('19:00');
  const [slotMinutes, setSlotMinutes] = useState('30');
  const [horizonDays, setHorizonDays] = useState('7');
  const [toast, setToast] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const av = data?.meetingAvailability;
  useEffect(() => {
    if (!av) return;
    setWeekDays(av.week_days ?? []);
    setStartTime(av.start_time ?? '10:00');
    setEndTime(av.end_time ?? '19:00');
    setSlotMinutes(String(av.slot_minutes ?? 30));
    setHorizonDays(String(av.horizon_days ?? 7));
  }, [av]);

  const toggleDay = (day: number) =>
    setWeekDays((days) => (days.includes(day) ? days.filter((d) => d !== day) : [...days, day]));

  const submit = async () => {
    setSaveError(null);
    try {
      await save({
        variables: {
          input: {
            week_days: weekDays,
            start_time: startTime,
            end_time: endTime,
            slot_minutes: Number(slotMinutes) || 30,
            horizon_days: Number(horizonDays) || 7,
          },
        },
      });
      setToast('Availability saved');
    } catch (e: any) {
      setSaveError(e?.message ?? 'Could not save');
    }
  };

  if (loading && !av) {
    return <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}><CircularProgress /></Box>;
  }
  if (error) return <Alert severity="error">{error.message}</Alert>;

  return (
    <Stack spacing={2.5} sx={{ maxWidth: 720 }}>
      <Stack direction="row" spacing={1.25} alignItems="center">
        <EventAvailableIcon color="primary" />
        <Box>
          <Typography variant="h5" fontWeight={800}>Meeting Availability</Typography>
          <Typography variant="body2" color="text.secondary">
            Working hours that generate the bookable onboarding slots (times are IST). Booked slots are disabled for other applicants automatically.
          </Typography>
        </Box>
      </Stack>

      <Card variant="outlined">
        <CardContent>
          <Stack spacing={2}>
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Working days</Typography>
              <Stack direction="row" flexWrap="wrap" useFlexGap>
                {DAYS.map((day) => (
                  <FormControlLabel
                    key={day.value}
                    control={<Checkbox checked={weekDays.includes(day.value)} onChange={() => toggleDay(day.value)} />}
                    label={day.label}
                  />
                ))}
              </Stack>
            </Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TimePicker
                label="Start time (IST)"
                value={toTime(startTime)}
                onChange={(d) => setStartTime(fromTime(d))}
                slotProps={{ textField: { size: 'small', fullWidth: true } }}
              />
              <TimePicker
                label="End time (IST)"
                value={toTime(endTime)}
                onChange={(d) => setEndTime(fromTime(d))}
                slotProps={{ textField: { size: 'small', fullWidth: true } }}
              />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                size="small"
                type="number"
                label="Slot length (minutes)"
                value={slotMinutes}
                onChange={(e) => setSlotMinutes(e.target.value)}
                inputProps={{ min: 10, max: 240 }}
                fullWidth
              />
              <TextField
                size="small"
                type="number"
                label="Booking horizon (days)"
                value={horizonDays}
                onChange={(e) => setHorizonDays(e.target.value)}
                inputProps={{ min: 1, max: 60 }}
                fullWidth
              />
            </Stack>
            {saveError && <Alert severity="error">{saveError}</Alert>}
            <Stack direction="row" justifyContent="flex-end">
              <Button variant="contained" onClick={submit} disabled={saving}>
                {saving ? 'Saving…' : 'Save availability'}
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <MeetingHolidaysCard />

      <Snackbar open={!!toast} autoHideDuration={3000} onClose={() => setToast(null)} message={toast ?? ''} />
    </Stack>
  );
}
