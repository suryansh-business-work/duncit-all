import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import BeachAccessIcon from '@mui/icons-material/BeachAccess';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { format } from 'date-fns';
import {
  ADD_MEETING_HOLIDAY,
  HOLIDAY_TYPE_LABELS,
  MEETING_HOLIDAYS,
  REMOVE_MEETING_HOLIDAY,
  type HolidayType,
  type MeetingHoliday,
} from './queries';

const TYPE_OPTIONS = Object.keys(HOLIDAY_TYPE_LABELS) as HolidayType[];

const prettyDate = (ymd: string) => {
  const d = new Date(`${ymd}T00:00:00`);
  return Number.isNaN(d.getTime()) ? ymd : format(d, 'EEE, d MMM yyyy');
};

/** Holidays / leave days — block bookable slots and show on the onboarding calendar. */
export default function MeetingHolidaysCard() {
  const { data, refetch } = useQuery<{ meetingHolidays: MeetingHoliday[] }>(MEETING_HOLIDAYS, { fetchPolicy: 'cache-and-network' });
  const [addHoliday, { loading: adding }] = useMutation(ADD_MEETING_HOLIDAY);
  const [removeHoliday] = useMutation(REMOVE_MEETING_HOLIDAY);
  const [date, setDate] = useState<Date | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<HolidayType>('PUBLIC_HOLIDAY');
  const [error, setError] = useState<string | null>(null);

  const holidays = data?.meetingHolidays ?? [];

  const add = async () => {
    if (!date || Number.isNaN(date.getTime())) {
      setError('Pick a date for the holiday');
      return;
    }
    setError(null);
    try {
      await addHoliday({ variables: { input: { date: format(date, 'yyyy-MM-dd'), name: name.trim(), type } } });
      setName('');
      setDate(null);
      await refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add the holiday');
    }
  };

  const remove = async (id: string) => {
    await removeHoliday({ variables: { id } });
    await refetch();
  };

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
          <BeachAccessIcon color="primary" fontSize="small" />
          <Box>
            <Typography variant="subtitle1" fontWeight={800}>Holidays &amp; leave</Typography>
            <Typography variant="body2" color="text.secondary">
              Public holidays, office holidays and official leave — slots on these days are blocked and they show on the calendar.
            </Typography>
          </Box>
        </Stack>

        {error && <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert>}

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems="flex-start">
          <DatePicker
            label="Date"
            value={date}
            onChange={setDate}
            slotProps={{ textField: { size: 'small', fullWidth: true } }}
          />
          <TextField size="small" label="Name (optional)" value={name} onChange={(e) => setName(e.target.value)} fullWidth />
          <TextField
            size="small"
            select
            label="Type"
            value={type}
            onChange={(e) => setType(e.target.value as HolidayType)}
            sx={{ minWidth: 170 }}
          >
            {TYPE_OPTIONS.map((value) => (
              <MenuItem key={value} value={value}>{HOLIDAY_TYPE_LABELS[value]}</MenuItem>
            ))}
          </TextField>
          <Button variant="contained" onClick={add} disabled={adding} sx={{ flexShrink: 0 }}>
            {adding ? 'Adding…' : 'Add'}
          </Button>
        </Stack>

        <Stack spacing={1} sx={{ mt: 2 }}>
          {holidays.length === 0 && (
            <Typography variant="body2" color="text.secondary">No holidays added yet.</Typography>
          )}
          {holidays.map((h) => (
            <Stack key={h.id} direction="row" alignItems="center" spacing={1} sx={{ borderBottom: 1, borderColor: 'divider', pb: 0.75 }}>
              <Typography variant="body2" fontWeight={700} sx={{ minWidth: 170 }}>{prettyDate(h.date)}</Typography>
              <Chip size="small" label={HOLIDAY_TYPE_LABELS[h.type]} />
              <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>{h.name || ''}</Typography>
              <IconButton size="small" color="error" onClick={() => remove(h.id)} aria-label="Remove holiday">
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Stack>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}
