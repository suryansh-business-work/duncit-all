import { Box, Card, Divider, Grid, Skeleton, Stack, Typography } from '@mui/material';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import { useTranslation } from '@duncit/shell';
import type { ClubAdminCategoryRow } from './queries';
import { formatCount } from './format';

/** One labelled figure inside a tile — the club and pod counts read the same. */
function TileStat({ value, label }: Readonly<{ value: number; label: string }>) {
  return (
    <Stack spacing={0.25}>
      <Typography variant="subtitle2" sx={{ fontWeight: 950, lineHeight: 1.2 }}>
        {formatCount(value)}
      </Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {label}
      </Typography>
    </Stack>
  );
}

interface TileProps {
  row: ClubAdminCategoryRow;
  clubsLabel: string;
  podsLabel: string;
}

/**
 * One category the admin's clubs run under: its super category above the name,
 * then how many of their clubs sit in it and how many pods those clubs ran in
 * the selected range.
 */
function CategoryTile({ row, clubsLabel, podsLabel }: Readonly<TileProps>) {
  return (
    <Card variant="outlined" sx={{ p: 1.75, borderRadius: 2, height: '100%' }}>
      <Stack spacing={1.25} sx={{ height: '100%' }}>
        <Stack direction="row" spacing={1.25} sx={{ alignItems: 'flex-start' }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 1.5,
              display: 'grid',
              placeItems: 'center',
              bgcolor: 'action.hover',
              flex: '0 0 auto',
            }}
          >
            <CategoryOutlinedIcon fontSize="small" color="primary" />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            {row.super_category && (
              <Typography
                variant="overline"
                component="div"
                noWrap
                sx={{ color: 'text.secondary', fontWeight: 800, letterSpacing: 0.4, lineHeight: 1.4 }}
              >
                {row.super_category}
              </Typography>
            )}
            <Typography variant="body2" component="div" noWrap sx={{ fontWeight: 900 }}>
              {row.name}
            </Typography>
          </Box>
        </Stack>
        <Divider />
        <Stack direction="row" spacing={3} sx={{ mt: 'auto' }}>
          <TileStat value={row.clubs} label={clubsLabel} />
          <TileStat value={row.pods} label={podsLabel} />
        </Stack>
      </Stack>
    </Card>
  );
}

const SKELETON_KEYS = ['a', 'b', 'c', 'd'];

interface Props {
  categories: ClubAdminCategoryRow[];
  loading: boolean;
}

/**
 * The categories a Club Admin actually works in, read off the clubs assigned to
 * them rather than off their account: the role carries no category of its own,
 * so "which category am I an admin of" is only answerable club by club.
 *
 * It sits in the dashboard header rather than in the widget grid on purpose —
 * a widget added after someone has saved a layout is appended at the BOTTOM,
 * and this is meant to be the first thing on the page.
 */
export default function ClubAdminCategoryCard({ categories, loading }: Readonly<Props>) {
  const { t } = useTranslation();

  let body = (
    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
      {t('partners.clubAdminDashboardPage.noCategoryOnYourClubs')}
    </Typography>
  );
  if (loading) {
    body = (
      <Grid container spacing={1.5}>
        {SKELETON_KEYS.map((key) => (
          <Grid key={key} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
            <Skeleton variant="rounded" height={104} />
          </Grid>
        ))}
      </Grid>
    );
  } else if (categories.length > 0) {
    body = (
      <Grid container spacing={1.5}>
        {categories.map((row) => (
          <Grid key={row.category_id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
            <CategoryTile
              row={row}
              clubsLabel={t('partners.clubAdminDashboardPage.clubs')}
              podsLabel={t('shell.nav.pods')}
            />
          </Grid>
        ))}
      </Grid>
    );
  }

  return (
    <Card variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
      <Stack spacing={1.5}>
        <Stack spacing={0.25}>
          <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>
            {t('partners.clubAdminDashboardPage.yourCategories')}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {t('partners.clubAdminDashboardPage.yourCategoriesHint')}
          </Typography>
        </Stack>
        {body}
      </Stack>
    </Card>
  );
}
