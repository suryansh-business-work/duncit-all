import { cloneElement, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { ActivityCalendar } from 'react-activity-calendar';
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
import DeleteIcon from '@mui/icons-material/Delete';
import {
  DELETE_USER_ACTIVITY_DAY,
  DELETE_USER_ACTIVITY_YEAR,
  USER_ACTIVITY_YEAR,
} from './queries';
import ActivityJourneyDialog from './ActivityJourneyDialog';
import { useConfirm } from '../../components/useConfirm';
import DateField from '../../components/DateField';

interface Props {
  userId: string;
}

const levelForCount = (count: number) => {
  if (count <= 0) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  if (count <= 10) return 3;
  return 4;
};

const activityTheme = {
  light: ['#ecfdf3', '#bbf7d0', '#86efac', '#22c55e', '#15803d'],
};

function buildYearData(year: number, days: any[]) {
  const countByDate = new Map(days.map((day) => [day.date, day.count]));
  const result = [];
  const currentDate = new Date(Date.UTC(year, 0, 1));
  while (currentDate.getUTCFullYear() === year) {
    const date = currentDate.toISOString().slice(0, 10);
    const count = countByDate.get(date) ?? 0;
    result.push({ date, count, level: levelForCount(count) });
    currentDate.setUTCDate(currentDate.getUTCDate() + 1);
  }
  return result;
}

export default function UserActivitySection({ userId }: Props) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState('');
  const [journeyDate, setJourneyDate] = useState('');
  const { data, loading, error, refetch } = useQuery(USER_ACTIVITY_YEAR, {
    variables: { user_id: userId, year },
    skip: !userId,
    fetchPolicy: 'cache-and-network',
  });
  const [deleteDay] = useMutation(DELETE_USER_ACTIVITY_DAY);
  const [deleteYear] = useMutation(DELETE_USER_ACTIVITY_YEAR);
  const confirm = useConfirm();

  const activity = data?.userActivityYear;
  const years = activity?.available_years?.length ? activity.available_years : [year];
  const calendarData = useMemo(
    () => buildYearData(year, activity?.days ?? []),
    [year, activity?.days]
  );

  const removeDay = async () => {
    if (!selectedDate) return;
    await deleteDay({ variables: { user_id: userId, date: selectedDate } });
    setSelectedDate('');
    await refetch();
  };

  const removeYear = async () => {
    const ok = await confirm({
      title: 'Delete activity',
      message: `Delete all ${year} activity for this user?`,
      destructive: true,
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    await deleteYear({ variables: { user_id: userId, year } });
    await refetch();
  };

  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2}>
            <Box>
              <Typography variant="subtitle1">App Visit Activity</Typography>
              <Typography variant="body2" color="text.secondary">
                {activity?.total_visits ?? 0} visits recorded in {year}.
              </Typography>
            </Box>
            <TextField
              select
              size="small"
              label="Year"
              value={year}
              onChange={(event) => setYear(Number(event.target.value))}
              sx={{ minWidth: 140 }}
            >
              {years.map((option: number) => <MenuItem key={option} value={option}>{option}</MenuItem>)}
            </TextField>
          </Stack>
          {loading && !data ? <CircularProgress size={22} /> : null}
          {error && <Alert severity="error">{error.message}</Alert>}
          <Box sx={{ overflowX: 'auto', pb: 1 }}>
            <ActivityCalendar
              data={calendarData as any}
              blockSize={12}
              blockMargin={4}
              fontSize={12}
              colorScheme="light"
              theme={activityTheme}
              renderBlock={(block, activity) =>
                cloneElement(block, {
                  role: 'button',
                  tabIndex: 0,
                  onClick: () => {
                    setSelectedDate(activity.date);
                    setJourneyDate(activity.date);
                  },
                  style: { ...(block.props.style || {}), cursor: 'pointer' },
                })
              }
              tooltips={{ activity: { text: (activity) => `${activity.count} events on ${activity.date}` } }}
            />
          </Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <DateField
              size="small"
              label="Delete day"
              value={selectedDate}
              onChange={(iso) => setSelectedDate(iso)}
              maxDate={new Date()}
            />
            <Button variant="outlined" color="error" startIcon={<DeleteIcon />} disabled={!selectedDate} onClick={removeDay}>
              Delete Day
            </Button>
            <Button variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={removeYear}>
              Delete Year
            </Button>
          </Stack>
          <ActivityJourneyDialog
            open={!!journeyDate}
            userId={userId}
            date={journeyDate}
            onClose={() => setJourneyDate('')}
          />
        </Stack>
      </CardContent>
    </Card>
  );
}