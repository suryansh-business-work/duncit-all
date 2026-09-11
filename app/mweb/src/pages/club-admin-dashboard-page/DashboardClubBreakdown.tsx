import { Link as RouterLink } from 'react-router';
import { Card, CardContent, Link, Skeleton, Stack, Typography } from '@mui/material';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import { formatCount, formatMoney, formatRating, type ClubAdminClubRow } from '@duncit/utils';
import SectionHeader from '../../components/SectionHeader';
import FactLine from '../../components/club-admin/FactLine';
import { useTranslation } from '../../i18n/useTranslation';

interface RowProps {
  club: ClubAdminClubRow;
  currencySymbol: string;
}

/** One club's figures inside the selected range; the row opens its pods. */
function ClubBreakdownRow({ club, currencySymbol }: Readonly<RowProps>) {
  const { t } = useTranslation();
  return (
    <Link
      component={RouterLink}
      to={`/clubs/${club.club_id}/pods`}
      underline="none"
      color="inherit"
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        py: 1.75,
        '& + &': { borderTop: 1, borderColor: 'divider' },
      }}
    >
      <Stack spacing={0.5} sx={{ flex: 1, minWidth: 0 }}>
        <Typography noWrap sx={{ fontSize: '1rem', fontWeight: 600 }}>
          {club.club_name}
        </Typography>
        <Stack direction="row" sx={{ flexWrap: 'wrap', columnGap: 1.25, rowGap: 0.25 }}>
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
      <ChevronRightRoundedIcon sx={{ color: 'text.secondary', flexShrink: 0 }} />
    </Link>
  );
}

const SKELETON_KEYS = ['a', 'b', 'c'];

interface Props {
  clubs: ClubAdminClubRow[];
  currencySymbol: string;
  loading: boolean;
}

/** The per-club breakdown — every club the admin runs, one row each, in one card. */
export default function DashboardClubBreakdown({ clubs, currencySymbol, loading }: Readonly<Props>) {
  const { t } = useTranslation();

  let body = (
    <Typography variant="body2" sx={{ color: 'text.secondary', py: 1 }}>
      {t('clubAdmin.dashboard.noClubs')}
    </Typography>
  );
  if (loading) {
    body = (
      <Stack spacing={1}>
        {SKELETON_KEYS.map((key) => (
          <Skeleton key={key} variant="rounded" height={56} sx={{ borderRadius: '14px' }} />
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
    <Stack spacing={1.5}>
      <SectionHeader title={t('clubAdmin.dashboard.perClubBreakdown')} />
      <Card>
        <CardContent sx={{ px: 2, py: 1, '&:last-child': { pb: 1 } }}>{body}</CardContent>
      </Card>
    </Stack>
  );
}
