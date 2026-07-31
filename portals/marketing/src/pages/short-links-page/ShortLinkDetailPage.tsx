import { useCallback, useMemo, useRef } from 'react';
import { useApolloClient, useMutation, useQuery } from '@apollo/client';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Box, Button, Grid, Skeleton, Stack, Typography } from '@mui/material';
import { DuncitTable, useApolloTableFetch } from '@duncit/table';
import { BackHeader } from '@duncit/ui';
import { useDateFormat } from '@duncit/app-settings';
import { notifySuccess } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import ShortLinkSummary from './detail/ShortLinkSummary';
import ClicksOverTime from './detail/ClicksOverTime';
import BreakdownCard from './detail/BreakdownCard';
import { getClickColumns } from './detail/clickColumns';
import {
  SET_SHORT_LINK_ACTIVE,
  SHORT_LINK,
  SHORT_LINK_CLICKS,
  SHORT_LINK_QR,
  SHORT_LINK_STATS,
  type ShortLinkClickRow,
  type ShortLinkRow,
  type ShortLinkStats,
} from './queries';

const getRowId = (row: ShortLinkClickRow) => row.id;

const NOTHING_YET = 'No clicks recorded yet.';

/** Everything one short link has done: who followed it, from where, on what. */
export default function ShortLinkDetailPage() {
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
  const [setActive, { loading: toggling }] = useMutation(SET_SHORT_LINK_ACTIVE);

  const fetchRows = useApolloTableFetch<ShortLinkClickRow>(
    client,
    SHORT_LINK_CLICKS,
    'shortLinkClicks',
    { extraVariables: { id: linkId } },
    [linkId],
  );

  const columns = useMemo(() => getClickColumns(), []);
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
        <BackHeader title="Short link" onBack={goBack} />
        <Alert severity="error">{parseApiError(error, 'Could not load this link')}</Alert>
      </Box>
    );
  }

  const row = link.data?.shortLink;
  const summary = stats.data?.shortLinkStats;

  return (
    // Capped and centred: the summary reads as a column of facts, and on a wide
    // monitor an uncapped one stretches its labels metres from their values.
    <Box sx={{ p: 2, maxWidth: 1400, mx: 'auto' }}>
      <BackHeader
        title={row?.label ?? 'Short link'}
        onBack={goBack}
        actions={
          row && (
            <Button
              variant="outlined"
              color={row.is_active ? 'warning' : 'primary'}
              disabled={toggling}
              onClick={() => {
                toggleActive(row).catch(() => undefined);
              }}
            >
              {row.is_active ? 'Retire link' : 'Reactivate link'}
            </Button>
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

          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <BreakdownCard
                title="Came from"
                rows={summary.platforms}
                emptyText={NOTHING_YET}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <BreakdownCard title="Country" rows={summary.countries} emptyText={NOTHING_YET} />
            </Grid>
            <Grid item xs={12} md={4}>
              <BreakdownCard title="City" rows={summary.cities} emptyText={NOTHING_YET} />
            </Grid>
            <Grid item xs={12} md={4}>
              <BreakdownCard title="Device" rows={summary.devices} emptyText={NOTHING_YET} />
            </Grid>
            <Grid item xs={12} md={4}>
              <BreakdownCard title="Operating system" rows={summary.oses} emptyText={NOTHING_YET} />
            </Grid>
            <Grid item xs={12} md={4}>
              <BreakdownCard title="Browser" rows={summary.browsers} emptyText={NOTHING_YET} />
            </Grid>
          </Grid>

          <Box>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
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
        </Stack>
      )}
    </Box>
  );
}
