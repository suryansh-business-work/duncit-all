import { Chip, Stack, Typography } from '@mui/material';
import { PageHeader } from '@duncit/ui';
import type { LiteEvent } from '../../../shared/graphql/documents';
import { useWebT } from '../../../shared/i18n';
import { LiteImage } from '../../components/LiteImage';
import { EventStatusChip } from '../../components/StatusChips';
import { ShareButton } from './ShareButton';

/** The cover, the category, the status when it is not simply published, and the title. */
export function EventHero({ event }: Readonly<{ event: LiteEvent }>) {
  const { t } = useWebT();
  return (
    <Stack spacing={2} data-testid="event-hero">
      <LiteImage src={event.cover_url} alt="" width={1200} height={630} eager sx={{ borderRadius: 4 }} testId="event-cover" />
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        {event.category ? <Chip size="small" label={event.category.name} /> : null}
        {event.status === 'PUBLISHED' ? null : <EventStatusChip status={event.status} />}
        <Chip size="small" variant="outlined" label={t(`lite.visibility.${event.visibility}`)} />
      </Stack>
      <PageHeader
        title={event.title}
        titleVariant="h4"
        actions={<ShareButton title={event.title} slug={event.slug} />}
        subtitle={event.city_name ? <Typography component="span">{event.city_name}</Typography> : undefined}
      />
    </Stack>
  );
}
