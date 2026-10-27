import { List, ListItem, ListItemText, Typography } from '@mui/material';
import { SectionCard } from '@duncit/ui';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import { EventChip } from '../labels';
import type { PhysicalEventRow } from '../queries';

/** Everything that happened to this one card, newest first — including who read its passcode. */
export default function CardHistorySection({ events }: Readonly<{ events: PhysicalEventRow[] }>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();

  return (
    <SectionCard title={t('loyalty.physical.historyTitle')}>
      {events.length === 0 ? (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('loyalty.physical.historyEmpty')}
        </Typography>
      ) : (
        <List dense disablePadding aria-label={t('loyalty.physical.historyTitle')}>
          {events.map((event) => (
            <ListItem key={event.id} divider disableGutters data-testid={`card-event-${event.id}`}>
              <EventChip type={event.type} t={t} />
              <ListItemText
                sx={{ ml: 1.5 }}
                primary={event.actor_name || event.actor_email}
                secondary={[formatDateTime(event.created_at), event.note].filter(Boolean).join(' · ')}
              />
            </ListItem>
          ))}
        </List>
      )}
    </SectionCard>
  );
}
