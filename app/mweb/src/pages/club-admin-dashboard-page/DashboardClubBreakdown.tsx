import { Link as RouterLink } from 'react-router';
import { Card, CardContent, Link, Skeleton, Stack, Typography } from '@mui/material';
import { formatCount, formatMoney, formatRating, type ClubAdminClubRow } from '@duncit/utils';
import FactLine from '../../components/club-admin/FactLine';
import { useTranslation } from '../../i18n/useTranslation';

interface RowProps {
  club: ClubAdminClubRow;
  currencySymbol: string;
}

/** One club's figures inside the selected range; the name opens its pods. */
function ClubBreakdownRow({ club, currencySymbol }: Readonly<RowProps>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={0.5} sx={{ py: 1, borderTop: 1, borderColor: 'divider' }}>
      <Link
        component={RouterLink}
        to={`/clubs/${club.club_id}/pods`}
        underline="hover"
        variant="subtitle2"
        sx={{ fontWeight: 700 }}
      >
        {club.club_name}
      </Link>
      <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1.25 }}>
        <FactLine value={formatCount(club.total_pods)} label={t('clubAdmin.dashboard.column.totalPods')} />
        <FactLine value={formatCount(club.upcoming_pods)} label={t('clubAdmin.clubs.upcoming')} />
        <FactLine value={formatCount(club.completed_pods)} label={t('clubAdmin.podStatus.completed')} />
        <FactLine value={formatCount(club.followers)} label={t('clubAdmin.clubs.followers')} />
        <FactLine value={formatRating(club.rating)} label={t('clubAdmin.dashboard.column.rating')} />
        <FactLine
          value={formatMoney(club.revenue, { symbol: currencySymbol })}
          label={t('clubAdmin.dashboard.column.revenue')}
        />
      </Stack>
    </Stack>
  );
}

const SKELETON_KEYS = ['a', 'b', 'c'];

interface Props {
  clubs: ClubAdminClubRow[];
  currencySymbol: string;
  loading: boolean;
}

/** The per-club breakdown — every club the admin runs, with its own figures. */
export default function DashboardClubBreakdown({ clubs, currencySymbol, loading }: Readonly<Props>) {
  const { t } = useTranslation();

  let body = (
    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
      {t('clubAdmin.dashboard.noClubs')}
    </Typography>
  );
  if (loading) {
    body = (
      <Stack spacing={1}>
        {SKELETON_KEYS.map((key) => (
          <Skeleton key={key} variant="rounded" height={56} />
        ))}
      </Stack>
    );
  } else if (clubs.length > 0) {
    body = (
      <Stack>
        {clubs.map((club) => (
          <ClubBreakdownRow key={club.club_id} club={club} currencySymbol={currencySymbol} />
        ))}
      </Stack>
    );
  }

  return (
    <Card variant="outlined" sx={{ borderRadius: '16px' }}>
      <CardContent>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
          {t('clubAdmin.dashboard.perClubBreakdown')}
        </Typography>
        {body}
      </CardContent>
    </Card>
  );
}
