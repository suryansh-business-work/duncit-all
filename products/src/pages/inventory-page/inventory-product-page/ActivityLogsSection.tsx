import {
  Alert,
  Box,
  Chip,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import InventoryAnalyticsChart from './InventoryAnalyticsChart';
import StockMovementTimeline from './StockMovementTimeline';

interface ActivityLog {
  id: string;
  user_name: string;
  action: string;
  changed_fields: string[];
  notes: string;
  created_at: string;
}

interface StockMovement {
  id: string;
  user_name: string;
  type: string;
  quantity: number;
  reason: string;
  balance_after: number;
  created_at: string;
}

interface AnalyticsPoint {
  date: string;
  in_qty: number;
  out_qty: number;
  net_qty: number;
}

interface ActivityLogsSectionProps {
  logs: ActivityLog[];
  movements: StockMovement[];
  analytics: AnalyticsPoint[];
  loading: boolean;
  isNew: boolean;
}

export default function ActivityLogsSection({
  logs,
  movements,
  analytics,
  loading,
  isNew,
}: ActivityLogsSectionProps) {
  if (isNew) {
    return (
      <Alert severity="info">
        Save the product first — activity logs, stock movements, and analytics start tracking once it exists.
      </Alert>
    );
  }
  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Last 30-day stock movement
        </Typography>
        <InventoryAnalyticsChart points={analytics} loading={loading} />
      </Box>
      <Divider />
      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Stock movement timeline
        </Typography>
        <StockMovementTimeline movements={movements} loading={loading} />
      </Box>
      <Divider />
      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Activity logs
        </Typography>
        {logs.length === 0 ? (
          <Alert severity="info">No activity logged yet.</Alert>
        ) : (
          <Stack spacing={1}>
            {logs.map((log) => (
              <Box
                key={log.id}
                sx={{
                  display: 'flex',
                  gap: 1,
                  alignItems: 'flex-start',
                  borderLeft: 2,
                  borderColor: 'divider',
                  pl: 1.5,
                }}
              >
                <Chip size="small" label={log.action} sx={{ flexShrink: 0, mt: 0.25 }} />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2">
                    {log.changed_fields.length > 0
                      ? `Changed: ${log.changed_fields.join(', ')}`
                      : log.notes || 'No additional detail'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(log.created_at).toLocaleString()} · {log.user_name || 'system'}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Stack>
        )}
      </Box>
    </Stack>
  );
}
