import type { ReactNode } from 'react';
import { Stack } from '@mui/material';
import EventBusyOutlinedIcon from '@mui/icons-material/EventBusyOutlined';
import { Loader } from '@duncit/ui';
import type { LiteEventCard as LiteEventCardData } from '../../../shared/graphql/documents';
import { useWebT } from '../../../shared/i18n';
import { EmptyState } from '../EmptyState';
import { EventDayGroup } from './EventDayGroup';
import { groupEventsByDay } from './groupByDay';

interface EventListProps {
  events: readonly LiteEventCardData[];
  loading?: boolean;
  emptyTitle: string;
  emptyBody?: string;
  emptyAction?: ReactNode;
  showStatus?: boolean;
  cardTo?: (event: LiteEventCardData) => string;
}

/** Events grouped by day, or a spinner, or an empty state — the same three answers on every list. */
export function EventList({ events, loading = false, emptyTitle, emptyBody, emptyAction, showStatus, cardTo }: Readonly<EventListProps>) {
  const { t } = useWebT();
  if (loading && events.length === 0) return <Loader label={t('lite.common.loading')} />;
  if (events.length === 0) return <EmptyState icon={<EventBusyOutlinedIcon />} title={emptyTitle} body={emptyBody} action={emptyAction} />;
  return (
    <Stack spacing={4} data-testid="event-list">
      {groupEventsByDay(events).map((group) => (
        <EventDayGroup key={group.key} label={group.label} events={group.events} showStatus={showStatus} cardTo={cardTo} />
      ))}
    </Stack>
  );
}
