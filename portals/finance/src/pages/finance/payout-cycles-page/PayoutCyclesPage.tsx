import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import { notifySuccess } from '@duncit/dialogs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { PAYOUT_SETTINGS, PAYOUT_MODES, UPDATE_PAYOUT_SETTINGS, WEEKDAYS } from './queries';

const timeToDate = (hhmm: string) => {
  const [h, m] = (hhmm || '18:00').split(':').map(Number);
  const d = new Date();
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
};
const dateToTime = (d: Date | null) =>
  d && !Number.isNaN(d.getTime()) ? `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` : '18:00';

export default function PayoutCyclesPage() {
  const { data, loading, refetch } = useQuery(PAYOUT_SETTINGS, { fetchPolicy: 'cache-and-network' });
  const [updateMut, { loading: saving }] = useMutation(UPDATE_PAYOUT_SETTINGS);
  const [venueMode, setVenueMode] = useState('IMMEDIATE');
  const [hostMode, setHostMode] = useState('IMMEDIATE');
  const [day, setDay] = useState(1);
  const [time, setTime] = useState<Date | null>(timeToDate('18:00'));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fs = data?.financeSettings;
    if (!fs) return;
    setVenueMode(fs.venue_payout_mode);
    setHostMode(fs.host_payout_mode);
    setDay(fs.payout_day_of_week);
    setTime(timeToDate(fs.payout_time));
  }, [data]);

  const scheduled = venueMode !== 'IMMEDIATE' || hostMode !== 'IMMEDIATE';
  const weekly = venueMode === 'WEEKLY' || hostMode === 'WEEKLY';

  const save = async () => {
    setError(null);
    try {
      await updateMut({
        variables: {
          input: {
            venue_payout_mode: venueMode,
            host_payout_mode: hostMode,
            payout_day_of_week: day,
            payout_time: dateToTime(time),
          },
        },
      });
      notifySuccess('Payout cycle saved');
      await refetch();
    } catch (e: any) {
      setError(e.message);
    }
  };

  if (loading && !data) {
    return (
      <Box sx={{ p: 6, textAlign: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box>
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
          <CalendarMonthIcon color="primary" sx={{ fontSize: 28 }} />
          <Box sx={{ flex: 1 }}>
            <Typography variant="h5" fontWeight={700}>
              Payout Cycles
            </Typography>
            <Typography variant="body2" color="text.secondary">
              When approved venue and host payouts are disbursed.
            </Typography>
          </Box>
        </Stack>

        <Stack spacing={2}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                Disbursement schedule
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 1 }}>
                <TextField select label="Venue payout" value={venueMode} onChange={(e) => setVenueMode(e.target.value)} fullWidth>
                  {PAYOUT_MODES.map((m) => (
                    <MenuItem key={m.value} value={m.value}>
                      {m.label}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField select label="Host payout" value={hostMode} onChange={(e) => setHostMode(e.target.value)} fullWidth>
                  {PAYOUT_MODES.map((m) => (
                    <MenuItem key={m.value} value={m.value}>
                      {m.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>

              {scheduled && (
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2 }}>
                  {weekly && (
                    <TextField select label="Payout day (weekly)" value={day} onChange={(e) => setDay(Number(e.target.value))} sx={{ minWidth: 200 }}>
                      {WEEKDAYS.map((w, i) => (
                        <MenuItem key={w} value={i}>
                          {w}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                  <TimePicker label="Payout time" value={time} onChange={setTime} slotProps={{ textField: { sx: { minWidth: 200 } } }} />
                </Stack>
              )}

              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 2 }}>
                Immediate releases as soon as Finance approves a payout. Weekly runs on the chosen day; Month end on the
                last day of the month — both at the chosen time.
              </Typography>
            </CardContent>
          </Card>

          {error && <Alert severity="error">{error}</Alert>}

          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="contained" size="large" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save cycle'}
            </Button>
          </Box>
        </Stack>
      </Box>
    </LocalizationProvider>
  );
}
