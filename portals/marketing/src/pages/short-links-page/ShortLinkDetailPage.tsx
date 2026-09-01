import { useCallback, useMemo, useRef, useState } from 'react';
import { useApolloClient, useMutation, useQuery } from '@apollo/client/react';
import { useNavigate, useParams } from 'react-router';
import { Alert, Box, Skeleton, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { DuncitTable, useApolloTableFetch } from '@duncit/table';
import { BackHeader } from '@duncit/ui';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import { notifySuccess } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import ShortLinkSummary from './detail/ShortLinkSummary';
import ClicksOverTime from './detail/ClicksOverTime';
import BreakdownCard from './detail/BreakdownCard';
import { getClickColumns } from './detail/clickColumns';
import FunnelCard from './detail/FunnelCard';
import { getJourneyColumns } from './detail/journeyColumns';
import JourneyTimelineDialog from './detail/JourneyTimelineDialog';
import {
  SET_SHORT_LINK_ACTIVE,
  SHORT_LINK,
  SHORT_LINK_CLICKS,
  SHORT_LINK_QR,
  SHORT_LINK_FUNNEL,
  SHORT_LINK_JOURNEYS,
  SHORT_LINK_STATS,
  type ShortLinkClickRow,
  type ShortLinkFunnel,
  type ShortLinkJourneyRow,
  type ShortLinkRow,
  type ShortLinkStats,
} from './queries';

const getRowId = (row: ShortLinkClickRow) => row.id;
const getJourneyRowId = (row: ShortLinkJourneyRow) => row.id;

const NOTHING_YET = 'No clicks recorded yet.';

/** Everything one short link has done: who followed it, from where, on what. */
export default function ShortLinkDetailPage() {
  const { t } = useTranslation();
  const { linkId = '' } = useParams();
  const navigate = useNavigate();
  const client = useApolloClient();
  const { formatDateTime, formatDate } = useDateFormat();
  const refetchRef = useRef<(() => void) | null>(null);

  const link = useQuery<{ shortLink: ShortLinkRow }>(SHORT_LINK, { variables: { id: linkId } });
  const stats = useQuery<{ shortLinkStats: ShortLinkStats }>(SHORT_LINK_STATS, {
    variables: { id: linkId },
    fetchPolicy: 'cache-and-network',
  });
  const qr = useQuery<{ shortLinkQr: string }>(SHORT_LINK_QR, { variables: { id: linkId } });
  const funnel = useQuery<{ shortLinkFunnel: ShortLinkFunnel }>(SHORT_LINK_FUNNEL, {
    variables: { id: linkId },
    fetchPolicy: 'cache-and-network',
  });
  const [openJourney, setOpenJourney] = useState<ShortLinkJourneyRow | null>(null);
  const [setActive, { loading: toggling }] = useMutation<any>(SET_SHORT_LINK_ACTIVE);

  const fetchRows = useApolloTableFetch<ShortLinkClickRow>(
    client,
    SHORT_LINK_CLICKS,
    'shortLinkClicks',
    { extraVariables: { id: linkId } },
    [linkId],
  );

  const journeyFetchRows = useApolloTableFetch<ShortLinkJourneyRow>(
    client,
    SHORT_LINK_JOURNEYS,
    'shortLinkJourneys',
    { extraVariables: { id: linkId } },
    [linkId],
  );

  const columns = useMemo(() => getClickColumns(t), [t]);
  const journeyColumns = useMemo(() => getJourneyColumns(t), [t]);
  const goBack = useCallback(() => navigate('/short-links'), [navigate]);

  const toggleActive = async (current: ShortLinkRow) => {
    await setActive({ variables: { id: current.id, is_active: !current.is_active } });
    notifySuccess(
      current.is_active ? `“${current.label}” retired` : `“${current.label}” reactivated`,
    );
    await link.refetch();
  };

  const error = link.error ?? stats.error;
  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <BackHeader title={t('marketing.shortLinks.shortLink')} onBack={goBack} />
        <Alert severity="error">{parseApiError(error, 'Could not load this link')}</Alert>
      </Box>
    );
  }

  const row = link.data?.shortLink;
  const summary = stats.data?.shortLinkStats;

  return (
    // Capped and centred: the summary reads as a column of facts, and on a wide
    // monitor an uncapped one stretches its labels metres from their values.
    <Box sx={{ p: 2, maxWidth: 1400, mx: 'auto'}}>
      <BackHeader
        title={row?.label ?? 'Short link'}
        sx={{ mb: 4}}
        onBack={goBack}
        actions={
          row && (
            <DuncitButton
              variant="outlined"
              color={row.is_active ? 'warning' : 'primary'}
              disabled={toggling}
              onClick={() => {
                toggleActive(row).catch(() => undefined);
              }}
            >
              {row.is_active ? 'Retire link' : 'Reactivate link'}
            </DuncitButton>
          )
        }
      />

      {(!row || !summary) && <Skeleton variant="rectangular" height={220} sx={{ borderRadius: 1 }} />}

      {row && summary && (
        <Stack spacing={2}>
          <ShortLinkSummary
            link={row}
            stats={summary}
            qr={qr.data?.shortLinkQr}
            formatDateTime={formatDateTime}
          />

          <ClicksOverTime daily={summary.daily} formatDate={formatDate} />

          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
            }}
          >
            <BreakdownCard title={t('marketing.shortLinks.cameFrom')} rows={summary.platforms} emptyText={NOTHING_YET} />
            <BreakdownCard title={t('marketing.common.country')} rows={summary.countries} emptyText={NOTHING_YET} />
            <BreakdownCard title={t('marketing.common.city')} rows={summary.cities} emptyText={NOTHING_YET} />
            <BreakdownCard title={t('marketing.shortLinks.device')} rows={summary.devices} emptyText={NOTHING_YET} />
            <BreakdownCard title={t('marketing.shortLinks.operatingSystem')} rows={summary.oses} emptyText={NOTHING_YET} />
            <BreakdownCard title={t('marketing.shortLinks.browser')} rows={summary.browsers} emptyText={NOTHING_YET} />
          </Box>

          {funnel.data && <FunnelCard funnel={funnel.data.shortLinkFunnel} />}

          <Box>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 700,
                mb: 0.5
              }}>
              Who followed this link
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: "text.secondary",
                mb: 1
              }}>
              One row per click. Open a row for that person's timeline.
            </Typography>
            <DuncitTable<ShortLinkJourneyRow>
              tableId="marketing-short-link-journeys"
              columns={journeyColumns}
              fetchRows={journeyFetchRows}
              getRowId={getJourneyRowId}
              onRowClick={setOpenJourney}
              emptyText={NOTHING_YET}
              searchPlaceholder="Search by platform, country or city"
              defaultSort={{ field: 'clicked_at', dir: 'desc' }}
            />
          </Box>

          <Box>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 700,
                mb: 1
              }}>
              Every click
            </Typography>
            <DuncitTable<ShortLinkClickRow>
              tableId="marketing-short-link-clicks"
              columns={columns}
              fetchRows={fetchRows}
              getRowId={getRowId}
              refetchRef={refetchRef}
              emptyText={NOTHING_YET}
              searchPlaceholder="Search by platform, country, city or browser"
              defaultSort={{ field: 'clicked_at', dir: 'desc' }}
            />
          </Box>

          <JourneyTimelineDialog
            journey={openJourney}
            formatDateTime={formatDateTime}
            onClose={() => setOpenJourney(null)}
          />
        </Stack>
      )}
    </Box>
  );
}
