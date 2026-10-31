import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Alert, Stack, TextField, MenuItem } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { DuncitButton } from '@duncit/buttons';
import { SectionCard } from '@duncit/ui';
import { parseApiError } from '@duncit/utils';
import EventTimeline, { type TimelineItem } from '../EventTimeline';
import { PRODUCT_USER_TIMELINE, type ProductTimelineEntry } from '../queries';

const PAGE = 100;

/** The kinds a reader can narrow the timeline to — what the app sends, and what the server records. */
const KINDS: ReadonlyArray<{ value: string; label: string; names: string[] }> = [
  { value: '', label: 'analytics.product.timeline.all', names: [] },
  { value: 'screens', label: 'analytics.product.timeline.screens', names: ['screen_view'] },
  { value: 'clicks', label: 'analytics.product.timeline.clicks', names: ['element_click'] },
  { value: 'app', label: 'analytics.product.timeline.app', names: ['app_open', 'app_background', 'app_foreground'] },
  { value: 'search', label: 'analytics.product.timeline.search', names: ['search_performed'] },
  {
    value: 'outcomes',
    label: 'analytics.product.timeline.outcomes',
    names: ['signed_up', 'pod_created', 'pod_joined', 'payment_succeeded', 'payment_failed', 'payment_refunded'],
  },
];

const toItem = (entry: ProductTimelineEntry): TimelineItem => ({
  id: entry.id,
  at: entry.at,
  event: entry.event_name,
  screen: entry.screen_name,
  label: entry.label,
  source: entry.source === 'SERVER' ? 'SERVER' : 'CLIENT',
});

/** A member's activity, newest first, a page at a time; narrowed to one kind of event when asked. */
export default function UserTimeline({ userId }: Readonly<{ userId: string }>) {
  const { t } = useTranslation();
  const [kind, setKind] = useState('');
  const [exhausted, setExhausted] = useState(false);
  const [olderError, setOlderError] = useState<unknown>(null);
  const names = KINDS.find((one) => one.value === kind)?.names ?? [];
  const { data, loading, error, fetchMore } = useQuery(PRODUCT_USER_TIMELINE, {
    variables: { user_id: userId, limit: PAGE, event_names: names.length ? names : null },
  });
  const entries = data?.productUserTimeline ?? [];
  const loadOlder = () => {
    setOlderError(null);
    fetchMore({
      variables: { before: entries.at(-1)?.at },
      updateQuery: (previous, { fetchMoreResult }) => ({
        productUserTimeline: [...previous.productUserTimeline, ...fetchMoreResult.productUserTimeline],
      }),
    })
      .then((result) => setExhausted((result.data?.productUserTimeline.length ?? 0) < PAGE))
      .catch(setOlderError);
  };
  return (
    <SectionCard
      title={t('analytics.product.timeline.title')}
      action={
        <TextField
          select
          size="small"
          label={t('analytics.product.timeline.kind')}
          value={kind}
          onChange={(event) => {
            setKind(event.target.value);
            setExhausted(false);
          }}
          sx={{ minWidth: 200 }}
          slotProps={{ htmlInput: { 'data-testid': 'product-timeline-kind' } }}
        >
          {KINDS.map((one) => (
            <MenuItem key={one.value} value={one.value}>
              {t(one.label)}
            </MenuItem>
          ))}
        </TextField>
      }
    >
      <Stack spacing={1}>
        {Boolean(error ?? olderError) && <Alert severity="error">{parseApiError(error ?? olderError)}</Alert>}
        <EventTimeline items={entries.map(toItem)} testId="product-user-timeline" />
        {!exhausted && entries.length > 0 && entries.length % PAGE === 0 && (
          <DuncitButton variant="outlined" onClick={loadOlder} loading={loading} data-testid="product-timeline-older">
            {t('analytics.product.timeline.older')}
          </DuncitButton>
        )}
      </Stack>
    </SectionCard>
  );
}
