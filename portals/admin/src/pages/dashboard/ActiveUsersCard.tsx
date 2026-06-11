import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import RangePicker, { type Granularity } from './RangePicker';
import ActiveUsersChart from './ActiveUsersChart';

interface Props {
  active: any;
  loading: boolean;
  from: string;
  to: string;
  granularity: Granularity;
  setFrom: (v: string) => void;
  setTo: (v: string) => void;
  setGranularity: (g: Granularity) => void;
}

export default function ActiveUsersCard({
  active,
  loading,
  from,
  to,
  granularity,
  setFrom,
  setTo,
  setGranularity,
}: Readonly<Props>) {
  return (
    <Card>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Active users (by device)
          </Typography>
          <Typography variant="overline" color="text.secondary">
            {active
              ? `${active.total_unique_devices} devices · ${active.total_unique_users} users`
              : ''}
          </Typography>
        </Stack>
        <RangePicker
          from={from}
          to={to}
          granularity={granularity}
          onFromChange={setFrom}
          onToChange={setTo}
          onGranularityChange={setGranularity}
        />
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        )}
        {!loading && <ActiveUsersChart buckets={active?.buckets ?? []} />}
      </CardContent>
    </Card>
  );
}
