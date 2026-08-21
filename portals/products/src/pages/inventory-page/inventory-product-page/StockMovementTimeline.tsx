import { Alert, Box, Chip, Stack, Typography } from '@mui/material';
import { formatDateTime } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';

interface StockMovement {
  id: string;
  user_name: string;
  type: string;
  quantity: number;
  reason: string;
  balance_after: number;
  created_at: string;
}

interface StockMovementTimelineProps {
  movements: StockMovement[];
  loading: boolean;
}

const movementColor: Record<string, 'success' | 'warning' | 'error' | 'default' | 'info'> = {
  IN: 'success',
  OUT: 'warning',
  RESERVE: 'info',
  RELEASE: 'default',
  DAMAGE: 'error',
  ADJUST: 'default',
};

export default function StockMovementTimeline({ movements, loading }: Readonly<StockMovementTimelineProps>) {
  const { t } = useTranslation();
  if (loading && movements.length === 0) {
    return <Typography variant="body2" color="text.secondary">{t('products.activity.loadingMovements')}</Typography>;
  }
  if (movements.length === 0) {
    return <Alert severity="info">{t('products.activity.noMovements')}</Alert>;
  }
  return (
    <Stack spacing={1.5}>
      {movements.map((m) => (
        <Box
          key={m.id}
          sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start', borderLeft: 2, borderColor: 'divider', pl: 1.5 }}
        >
          <Chip
            size="small"
            label={m.type}
            color={movementColor[m.type] ?? 'default'}
            sx={{ flexShrink: 0, mt: 0.25 }}
          />
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2">
              {m.quantity > 0 ? `+${m.quantity}` : m.quantity} • Balance after: {m.balance_after}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatDateTime(m.created_at)} · {m.user_name || 'system'}
              {m.reason ? ` · ${m.reason}` : ''}
            </Typography>
          </Box>
        </Box>
      ))}
    </Stack>
  );
}
