import { Card, CardContent, List, ListItem, ListItemText, Stack, Typography } from '@mui/material';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import { historyLabels } from '../labels';
import type { GiftCardOrderHistoryEntry } from '../queries';

/** The order's audit trail: every business moment, who caused it, and when — newest first. */
export default function OrderHistorySection({ history }: Readonly<{ history: readonly GiftCardOrderHistoryEntry[] }>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const labels = historyLabels(t);
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
            {t('loyalty.giftOrders.historyTitle')}
          </Typography>
          <List dense disablePadding data-testid="gift-order-history">
            {history.map((h) => (
              <ListItem key={h.id} disableGutters>
                <ListItemText
                  primary={labels[h.action] ?? h.action}
                  secondary={[formatDateTime(h.created_at), h.actor_name || t('loyalty.giftOrders.system'), h.note]
                    .filter(Boolean)
                    .join(' · ')}
                />
              </ListItem>
            ))}
          </List>
        </Stack>
      </CardContent>
    </Card>
  );
}
