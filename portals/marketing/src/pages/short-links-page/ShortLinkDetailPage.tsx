import { useCallback, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { Alert, Box, Skeleton, Stack } from '@mui/material';
import { BackHeader } from '@duncit/ui';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import { parseApiError } from '@duncit/utils';
import ShortLinkSummary from './detail/ShortLinkSummary';
import ClicksOverTime from './detail/ClicksOverTime';
import BreakdownGrid from './detail/BreakdownGrid';
import ClickTables from './detail/ClickTables';
import DetailActions from './detail/DetailActions';
import ExternalLinkNote from './detail/ExternalLinkNote';
import FunnelCard from './detail/FunnelCard';
import StatsRange from './detail/StatsRange';
import {
  SHORT_LINK,
  SHORT_LINK_QR,
  SHORT_LINK_FUNNEL,
  SHORT_LINK_STATS,
  type ShortLinkFunnel,
  type ShortLinkRow,
  type ShortLinkStats,
} from './queries';

/**
 * Where Back goes, and which list this link belongs to.
 *
 * The same page serves /short-links/:id and /external-links/:id, because the
 * analytics are identical — only the destination differs. Reading it off the
 * path is what keeps Back pointing at the list the reader actually came from.
 */
const listPathOf = (pathname: string) =>
  pathname.startsWith('/external-links') ? '/external-links' : '/short-links';

/** Everything one short link has done: who followed it, from where, on what. */
export default function ShortLinkDetailPage() {
  const { t } = useTranslation();
  const { linkId = '' } = useParams();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { formatDateTime, formatDate } = useDateFormat();
  const [days, setDays] = useState(0);

  const link = useQuery<{ shortLink: ShortLinkRow }>(SHORT_LINK, { variables: { id: linkId } });
  const stats = useQuery<{ shortLinkStats: ShortLinkStats }>(SHORT_LINK_STATS, {
    variables: { id: linkId, days },
    fetchPolicy: 'cache-and-network',
  });
  const qr = useQuery<{ shortLinkQr: string }>(SHORT_LINK_QR, { variables: { id: linkId } });

  const row = link.data?.shortLink;
  const external = !!row?.is_external;

  // Asked for only when it can be answered: the funnel past the click is
  // reported BY the landing page, and an external link lands on a page we do
  // not run.
  const funnel = useQuery<{ shortLinkFunnel: ShortLinkFunnel }>(SHORT_LINK_FUNNEL, {
    variables: { id: linkId },
    fetchPolicy: 'cache-and-network',
    skip: !row || external,
  });

  const goBack = useCallback(
    () => navigate(listPathOf(pathname)),
    [navigate, pathname],
  );

  const reload = useCallback(() => {
    link.refetch().catch(() => undefined);
    stats.refetch().catch(() => undefined);
  }, [link, stats]);

  const error = link.error ?? stats.error;
  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <BackHeader title={t('marketing.shortLinks.shortLink')} onBack={goBack} />
        <Alert severity="error">{parseApiError(error, 'Could not load this link')}</Alert>
      </Box>
    );
  }

  const summary = stats.data?.shortLinkStats;

  return (
    // Capped and centred: the summary reads as a column of facts, and on a wide
    // monitor an uncapped one stretches its labels metres from their values.
    <Box sx={{ p: 2, maxWidth: 1400, mx: 'auto' }}>
      <BackHeader
        title={row?.label ?? 'Short link'}
        sx={{ mb: 4 }}
        onBack={goBack}
        actions={row && <DetailActions link={row} onChanged={reload} />}
      />

      {(!row || !summary) && (
        <Skeleton variant="rectangular" height={220} sx={{ borderRadius: 1 }} />
      )}

      {row && summary && (
        <Stack spacing={2}>
          {external && <ExternalLinkNote destination={row.destination_url} />}

          <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
            <StatsRange days={days} onChange={setDays} />
          </Stack>

          <ShortLinkSummary
            link={row}
            stats={summary}
            qr={qr.data?.shortLinkQr}
            formatDateTime={formatDateTime}
          />

          <ClicksOverTime daily={summary.daily} formatDate={formatDate} />

          <BreakdownGrid stats={summary} />

          {funnel.data && <FunnelCard funnel={funnel.data.shortLinkFunnel} />}

          <ClickTables linkId={linkId} external={external} />
        </Stack>
      )}
    </Box>
  );
}
