import { Box, Card, CardContent, Skeleton, Stack, Typography } from '@mui/material';
import { formatCount, type ClubAdminCategoryRow } from '@duncit/utils';
import SectionHeader from '../../components/SectionHeader';
import FactLine from '../../components/club-admin/FactLine';
import { useTranslation } from '../../i18n/useTranslation';

/**
 * One category the admin's clubs run under: the name over its super category,
 * then how many of their clubs sit in it and how many pods those clubs ran in
 * the selected range.
 */
function CategoryTile({ row }: Readonly<{ row: ClubAdminCategoryRow }>) {
  const { t } = useTranslation();
  return (
    <Box sx={{ flex: '1 1 45%', minWidth: 140, p: 1.5, borderRadius: '16px', bgcolor: 'action.hover' }}>
      <Typography variant="subtitle2" noWrap sx={{ fontWeight: 600 }}>
        {row.name}
      </Typography>
      {row.super_category && (
        <Typography variant="caption" component="div" noWrap sx={{ color: 'text.secondary' }}>
          {row.super_category}
        </Typography>
      )}
      <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1.25, mt: 0.75 }}>
        <FactLine value={formatCount(row.clubs)} label={t('clubAdmin.dashboard.clubs')} />
        <FactLine value={formatCount(row.pods)} label={t('clubAdmin.dashboard.pods')} />
      </Stack>
    </Box>
  );
}

const SKELETON_KEYS = ['a', 'b'];

interface Props {
  categories: ClubAdminCategoryRow[];
  loading: boolean;
}

/**
 * The categories a Club Admin works in, read off the clubs assigned to them:
 * the role carries no category of its own, so the question is only answerable
 * club by club.
 */
export default function DashboardCategoryTiles({ categories, loading }: Readonly<Props>) {
  const { t } = useTranslation();

  let body = (
    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
      {t('clubAdmin.dashboard.categoriesEmpty')}
    </Typography>
  );
  if (loading) {
    body = (
      <Stack direction="row" sx={{ gap: 1 }}>
        {SKELETON_KEYS.map((key) => (
          <Skeleton key={key} variant="rounded" height={88} sx={{ flex: 1, borderRadius: '16px' }} />
        ))}
      </Stack>
    );
  } else if (categories.length > 0) {
    body = (
      <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
        {categories.map((row) => (
          <CategoryTile key={row.category_id} row={row} />
        ))}
      </Stack>
    );
  }

  return (
    <Stack spacing={1.5}>
      <SectionHeader title={t('clubAdmin.dashboard.yourCategories')} />
      <Card>
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>{body}</CardContent>
      </Card>
    </Stack>
  );
}
