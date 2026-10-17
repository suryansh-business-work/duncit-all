import { Card, CardContent, Chip, Link, Stack, Typography } from '@mui/material';
import EventRepeatIcon from '@mui/icons-material/EventRepeat';
import { Link as RouterLink } from 'react-router';
import { SERIES_DATE_STATUS_KEY, type SeriesDateRow } from '@duncit/utils';
import { useTranslation } from '../../../i18n/useTranslation';
import { formatDateTime } from '../../../utils/dateFormat';
import { podUrl } from '../../../utils/seoUrls';
import type { SeriesBooking } from './useSeriesBooking';

interface Props {
  series: SeriesBooking;
  clubSlug: string;
  /** The page's own pod — its row is marked rather than linked. */
  currentPodId: string;
  /** Hosts open any date to run it (attendance, completion). */
  isHost: boolean;
}

/** Spots left on a date, or nothing for an unlimited one. */
function spotsText(row: SeriesDateRow, t: ReturnType<typeof useTranslation>['t']): string | null {
  if (row.status !== 'UPCOMING' || row.seats_available === null || row.seats_available === undefined) return null;
  return row.seats_available > 0
    ? t('mweb.podSeriesBooking.spotsLeft', { count: row.seats_available })
    : t('mweb.podSeriesBooking.full');
}

/**
 * Every date of a recurring pod on its details page: when it is, how it
 * stands, the spots it has left and whether the viewer booked it. A date the
 * viewer booked (or, for the host, any date) opens that date's own page —
 * its ticket, backout and attendance live there.
 */
export default function PodSeriesDatesSection({ series, clubSlug, currentPodId, isHost }: Readonly<Props>) {
  const { t } = useTranslation();
  if (!series.active || series.rows.length === 0) return null;
  const best = series.tiers.at(-1);
  return (
    <Card data-testid="pod-series-dates">
      <CardContent>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
          <EventRepeatIcon color="primary" fontSize="small" />
          <Typography component="h2" sx={{ fontWeight: 600, flex: 1 }}>
            {t('mweb.podSeriesBooking.datesTitle', { count: series.rows.length })}
          </Typography>
        </Stack>
        {best && (
          <Typography variant="body2" sx={{ color: 'success.main', mb: 1 }} data-testid="pod-series-discount-hint">
            {t('mweb.podSeriesBooking.discountHint', { vars: { pct: best.discount_pct, count: best.min_dates } })}
          </Typography>
        )}
        <Stack component="ul" spacing={1} sx={{ listStyle: 'none', p: 0, m: 0 }}>
          {series.rows.map((row) => {
            const when = formatDateTime(row.start_at);
            const linked = (isHost || row.my_seats > 0) && row.pod_doc_id !== currentPodId;
            const spots = spotsText(row, t);
            return (
              <Stack
                component="li"
                key={row.pod_doc_id}
                direction="row"
                spacing={1}
                data-testid={`pod-series-date-${row.pod_doc_id}`}
                sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 0.5 }}
              >
                {linked ? (
                  <Link component={RouterLink} to={podUrl(clubSlug, row.slug)} sx={{ flex: 1, minWidth: 0 }}>
                    {when}
                  </Link>
                ) : (
                  <Typography variant="body2" sx={{ flex: 1, minWidth: 0 }}>
                    {when}
                  </Typography>
                )}
                {row.my_seats > 0 && <Chip size="small" color="primary" label={t('mweb.podSeriesBooking.booked')} />}
                {spots && <Typography variant="caption" sx={{ color: 'text.secondary' }}>{spots}</Typography>}
                <Chip size="small" variant="outlined" label={t(SERIES_DATE_STATUS_KEY[row.status])} />
              </Stack>
            );
          })}
        </Stack>
      </CardContent>
    </Card>
  );
}
