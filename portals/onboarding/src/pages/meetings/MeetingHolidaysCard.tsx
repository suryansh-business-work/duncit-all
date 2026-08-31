import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import BeachAccessIcon from '@mui/icons-material/BeachAccess';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { format } from 'date-fns';
import {
  ADD_MEETING_HOLIDAY,
  HOLIDAY_TYPE_LABELS,
  MEETING_HOLIDAYS,
  REMOVE_MEETING_HOLIDAY,
  type HolidayType,
  type MeetingHoliday,
} from './queries';
import { formatDate, useTranslation } from '@duncit/app-settings';

const TYPE_OPTIONS = Object.keys(HOLIDAY_TYPE_LABELS) as HolidayType[];

const prettyDate = (ymd: string) => {
  const d = new Date(`${ymd}T00:00:00`);
  return formatDate(d) || ymd;
};

/** Holidays / leave days — block bookable slots and show on the onboarding calendar. */
export default function MeetingHolidaysCard() {
  const { t } = useTranslation();
  const { data, refetch } = useQuery<{ meetingHolidays: MeetingHoliday[] }>(MEETING_HOLIDAYS, { fetchPolicy: 'cache-and-network' });
  const [addHoliday, { loading: adding }] = useMutation<any>(ADD_MEETING_HOLIDAY);
  const [removeHoliday] = useMutation<any>(REMOVE_MEETING_HOLIDAY);
  const [date, setDate] = useState<Date | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<HolidayType>('PUBLIC_HOLIDAY');
  const [error, setError] = useState<string | null>(null);

  const holidays = data?.meetingHolidays ?? [];

  const add = async () => {
    if (!date || Number.isNaN(date.getTime())) {
      setError(t('onboarding.meetings.pickADateForTheHoliday'));
      return;
    }
    setError(null);
    try {
      await addHoliday({ variables: { input: { date: format(date, 'yyyy-MM-dd'), name: name.trim(), type } } });
      setName('');
      setDate(null);
      await refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('onboarding.meetings.couldNotAddTheHoliday'));
    }
  };

  const remove = async (id: string) => {
    await removeHoliday({ variables: { id } });
    await refetch();
  };

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack
          direction="row"
          spacing={1}
          sx={{
            alignItems: "center",
            mb: 1.5
          }}>
          <BeachAccessIcon color="primary" fontSize="small" />
          <Box>
            <Typography variant="subtitle1" sx={{
              fontWeight: 800
            }}>{t('onboarding.meetings.holidaysAndAmpLeave')}</Typography>
            <Typography variant="body2" sx={{
              color: "text.secondary"
            }}>
              Public holidays, office holidays and official leave — slots on these days are blocked and they show on the calendar.
            </Typography>
          </Box>
        </Stack>

        {error && <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert>}

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{
          alignItems: "flex-start"
        }}>
          <DatePicker
            label={t('onboarding.meetings.date')}
            value={date}
            onChange={setDate}
            slotProps={{ textField: { size: 'small', fullWidth: true } }}
          />
          <TextField size="small" label={t('onboarding.meetings.nameOptional')} value={name} onChange={(e) => setName(e.target.value)} fullWidth />
          <TextField
            size="small"
            select
            label={t('shell.common.type')}
            value={type}
            onChange={(e) => setType(e.target.value as HolidayType)}
            sx={{ minWidth: 170 }}
          >
            {TYPE_OPTIONS.map((value) => (
              <MenuItem key={value} value={value}>{HOLIDAY_TYPE_LABELS[value]}</MenuItem>
            ))}
          </TextField>
          <DuncitButton variant="contained" onClick={add} disabled={adding} sx={{ flexShrink: 0 }}>
            {adding ? 'Adding…' : 'Add'}
          </DuncitButton>
        </Stack>

        <Stack spacing={1} sx={{ mt: 2 }}>
          {holidays.length === 0 && (
            <Typography variant="body2" sx={{
              color: "text.secondary"
            }}>{t('onboarding.meetings.noHolidaysAddedYet')}</Typography>
          )}
          {holidays.map((h) => (
            <Stack
              key={h.id}
              direction="row"
              spacing={1}
              sx={{
                alignItems: "center",
                borderBottom: 1,
                borderColor: 'divider',
                pb: 0.75
              }}>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 700,
                  minWidth: 170
                }}>{prettyDate(h.date)}</Typography>
              <Chip size="small" label={HOLIDAY_TYPE_LABELS[h.type]} />
              <Typography
                variant="body2"
                sx={{
                  color: "text.secondary",
                  flex: 1
                }}>{h.name || ''}</Typography>
              <DuncitIconButton size="small" color="error" onClick={() => remove(h.id)} aria-label={t('onboarding.meetings.removeHoliday')}>
                <DeleteOutlineIcon fontSize="small" />
              </DuncitIconButton>
            </Stack>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}
