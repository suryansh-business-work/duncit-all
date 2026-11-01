import { useQuery } from '@apollo/client/react';
import { Link as RouterLink } from 'react-router';
import { Link, Stack } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { EM_DASH } from '@duncit/table';
import { InfoRow } from '@duncit/ui';
import DetailDrawer from '../DetailDrawer';
import EventTimeline, { type TimelineItem } from '../EventTimeline';
import { asCount, asDuration, platformLabel } from '../labels';
import { PRODUCT_SESSION, type ProductEvent } from '../queries';

const toItem = (event: ProductEvent): TimelineItem => ({
  id: event.id,
  at: event.occurred_at,
  event: event.event_name,
  screen: event.screen_name,
  label: event.element_name || event.element_id || event.element_text,
  source: 'CLIENT',
  durationMs: event.duration_ms,
});

/** One session, start to end: who, on what, and every event in order. */
export default function SessionDetail({ sessionId, onClose }: Readonly<{ sessionId: string | null; onClose: () => void }>) {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery(PRODUCT_SESSION, {
    variables: { session_id: sessionId ?? '' },
    skip: !sessionId,
  });
  const detail = data?.productSession;
  const session = detail?.session;
  const person = session?.user_id ? (
    <Link component={RouterLink} to={`/product/users?user=${session.user_id}`}>
      {session.user_name || session.user_id}
    </Link>
  ) : (
    t('analytics.product.visitor')
  );
  return (
    <DetailDrawer
      open={Boolean(sessionId)}
      title={t('analytics.product.sessions.detailTitle')}
      subtitle={sessionId ?? undefined}
      loading={loading && !detail}
      error={error ?? (data && !detail ? new Error(t('analytics.product.sessions.notFound')) : undefined)}
      onClose={onClose}
      testId="product-session-detail"
    >
      {session && detail && (
        <Stack spacing={2}>
          <Stack spacing={0.5}>
            <InfoRow label={t('analytics.product.col.person')} value={person} />
            <InfoRow label={t('analytics.product.col.platform')} value={platformLabel(session.platform, t)} />
            <InfoRow label={t('analytics.product.col.appVersion')} value={session.app_version || EM_DASH} />
            <InfoRow label={t('analytics.product.col.duration')} value={asDuration(session.duration_ms)} />
            <InfoRow label={t('analytics.product.col.screens')} value={asCount(session.screen_views)} />
            <InfoRow label={t('analytics.product.col.entryScreen')} value={session.entry_screen || EM_DASH} />
            <InfoRow label={t('analytics.product.col.exitScreen')} value={session.exit_screen || EM_DASH} />
          </Stack>
          <EventTimeline items={detail.events.map(toItem)} testId="product-session-timeline" />
        </Stack>
      )}
    </DetailDrawer>
  );
}
