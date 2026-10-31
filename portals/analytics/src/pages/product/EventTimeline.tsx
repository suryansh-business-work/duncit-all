import { Chip, List, ListItem, ListItemText, Stack, Typography } from '@mui/material';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import { asDuration } from './labels';

/** One line of a timeline: an event the app recorded, or an outcome the server holds. */
export interface TimelineItem {
  id: string;
  at: string;
  event: string;
  screen: string;
  label: string;
  /** CLIENT is what the app sent; SERVER is a record — a payment, a booking. */
  source: 'CLIENT' | 'SERVER';
  durationMs?: number | null;
}

interface Props {
  items: readonly TimelineItem[];
  testId: string;
}

/**
 * Events in time order, each with what it was, where, and on what. An outcome
 * from the server is marked apart from what the app recorded, so a tap on
 * "Pay" is never read as a payment.
 */
export default function EventTimeline({ items, testId }: Readonly<Props>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat({ timeZoneAware: true });
  if (items.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" data-testid={`${testId}-empty`}>
        {t('analytics.product.timeline.empty')}
      </Typography>
    );
  }
  return (
    <List dense data-testid={testId} aria-label={t('analytics.product.timeline.label')}>
      {items.map((item) => {
        const where = [item.screen, item.label].filter(Boolean).join(' · ');
        const spent = item.durationMs ? t('analytics.product.timeline.spent', { vars: { time: asDuration(item.durationMs) } }) : '';
        return (
          <ListItem key={item.id} divider disableGutters>
            <ListItemText
              primary={
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {item.event}
                  </Typography>
                  <Chip
                    size="small"
                    variant="outlined"
                    color={item.source === 'SERVER' ? 'success' : 'default'}
                    label={t(item.source === 'SERVER' ? 'analytics.product.timeline.server' : 'analytics.product.timeline.client')}
                  />
                </Stack>
              }
              secondary={[formatDateTime(item.at), where, spent].filter(Boolean).join(' — ')}
            />
          </ListItem>
        );
      })}
    </List>
  );
}
