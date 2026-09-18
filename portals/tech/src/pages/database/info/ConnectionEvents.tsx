import { Box, Chip, Stack, Typography } from '@mui/material';
import { SectionCard } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';
import { formatDateTime } from '../../server/format';
import { EVENT_LABEL } from './labels';
import type { DatabaseEvent } from './queries';

function EventRow({ event }: Readonly<{ event: DatabaseEvent }>) {
  const { t } = useTranslation();
  const label = EVENT_LABEL[event.kind] ?? EVENT_LABEL.ERROR;
  return (
    <Stack
      component="li"
      direction={{ xs: 'column', sm: 'row' }}
      spacing={{ xs: 0.5, sm: 1.5 }}
      sx={{ py: 1, borderTop: 1, borderColor: 'divider', '&:first-of-type': { borderTop: 0 } }}
    >
      <Typography variant="body2" sx={{ color: 'text.secondary', minWidth: 170, flexShrink: 0 }}>
        {formatDateTime(event.at)}
      </Typography>
      <Box sx={{ flexShrink: 0 }}>
        <Chip size="small" color={label.color} label={t(label.key)} />
      </Box>
      <Typography variant="body2" sx={{ wordBreak: 'break-word', minWidth: 0 }}>
        {event.attempt !== null && t('tech.dbInfo.eventAttempt', { vars: { attempt: event.attempt } })}
        {event.attempt !== null && event.message && ' · '}
        {event.message}
      </Typography>
    </Stack>
  );
}

/** What the API's connection went through since the process started, newest first. */
export default function ConnectionEvents({ events }: Readonly<{ events: DatabaseEvent[] }>) {
  const { t } = useTranslation();
  return (
    <SectionCard title={t('tech.dbInfo.eventsTitle')} subtitle={t('tech.dbInfo.eventsSubtitle')}>
      {events.length === 0 ? (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('tech.dbInfo.eventsEmpty')}
        </Typography>
      ) : (
        <Box
          component="ul"
          data-testid="db-info-events"
          sx={{ listStyle: 'none', m: 0, p: 0, maxHeight: 360, overflowY: 'auto' }}
        >
          {events.map((event) => (
            <EventRow key={`${event.at}-${event.kind}`} event={event} />
          ))}
        </Box>
      )}
    </SectionCard>
  );
}
