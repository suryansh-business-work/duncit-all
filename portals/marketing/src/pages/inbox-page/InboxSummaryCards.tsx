import { useEffect, type RefObject } from 'react';
import { useQuery } from '@apollo/client/react';
import { Alert, Grid, Stack } from '@mui/material';
import { notify } from '@duncit/dialogs';
import { EM_DASH } from '@duncit/table';
import { StatCard } from '@duncit/ui';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import { INBOX_CARDS } from './copy';
import { SOCIAL_DM_SUMMARY, type InboxChannel } from './dm.queries';
import { SOCIAL_INBOX_SUMMARY, type SocialInboxSummary } from './queries';

interface Props {
  /** The tab the cards count for: DMs, comments, or both on All. */
  channel: InboxChannel;
  /** Hands back a reload, so an action in the drawer refreshes the counts too. */
  refetchRef: RefObject<(() => void) | null>;
}

const add = (a: SocialInboxSummary, b: SocialInboxSummary): SocialInboxSummary => ({
  open: a.open + b.open,
  flagged: a.flagged + b.flagged,
  unassigned: a.unassigned + b.unassigned,
  mine: a.mine + b.mine,
});

/** What is waiting on this tab; each card opens the queue on its slice, on the same tab. */
export default function InboxSummaryCards({ channel, refetchRef }: Readonly<Props>) {
  const { t, locale } = useTranslation();
  const wantComments = channel !== 'dms';
  const wantDms = channel === 'dms' || channel === 'all';
  const comments = useQuery<{ socialInboxSummary: SocialInboxSummary }>(SOCIAL_INBOX_SUMMARY, {
    fetchPolicy: 'cache-and-network',
    skip: !wantComments,
  });
  const dms = useQuery<{ socialDmSummary: SocialInboxSummary }>(SOCIAL_DM_SUMMARY, { fetchPolicy: 'cache-and-network', skip: !wantDms });
  const commentSummary = comments.data?.socialInboxSummary;
  const dmSummary = dms.data?.socialDmSummary;
  let summary: SocialInboxSummary | undefined;
  if (channel === 'all') summary = commentSummary && dmSummary ? add(commentSummary, dmSummary) : undefined;
  else summary = channel === 'dms' ? dmSummary : commentSummary;
  const error = comments.error ?? dms.error;
  const loading = comments.loading || dms.loading;
  const { refetch: refetchComments } = comments;
  const { refetch: refetchDms } = dms;

  useEffect(() => {
    refetchRef.current = () => {
      const reloads = [wantComments ? refetchComments() : null, wantDms ? refetchDms() : null].filter((reload) => reload !== null);
      Promise.all(reloads).catch((err: unknown) => notify(parseApiError(err), 'error'));
    };
  }, [refetchRef, refetchComments, refetchDms, wantComments, wantDms]);

  return (
    <Stack spacing={1} data-tour="inbox-cards">
      {error && <Alert severity="error">{parseApiError(error)}</Alert>}
      <Grid container spacing={2} data-testid="inbox-summary-cards">
        {INBOX_CARDS.map((card) => (
          <Grid key={card.view} size={{ xs: 6, md: 3 }}>
            <StatCard
              label={t(card.label)}
              value={summary ? summary[card.field].toLocaleString(locale) : EM_DASH}
              to={`/social/inbox?channel=${channel}&view=${card.view}`}
              loading={loading && !summary}
              testId={`inbox-card-${card.view}`}
              sx={{ height: '100%' }}
            />
          </Grid>
        ))}
      </Grid>
    </Stack>
  );
}
