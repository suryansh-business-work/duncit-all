import { Card, CardContent, Skeleton, Stack, Typography } from '@mui/material';
import { formatCount, type ClubAdminCategoryRow } from '@duncit/utils';
import FactLine from '../../components/club-admin/FactLine';
import { useTranslation } from '../../i18n/useTranslation';

/**
 * One category the admin's clubs run under: the super category over the
 * name, then how many of their clubs sit in it and how many pods those clubs
 * ran in the selected range.
 */
function CategoryTile({ row }: Readonly<{ row: ClubAdminCategoryRow }>) {
  const { t } = useTranslation();
  return (
    <Card variant="outlined" sx={{ flex: '1 1 45%', minWidth: 140, borderRadius: '16px' }}>
      <CardContent sx={{ p: 1.25, '&:last-child': { pb: 1.25 } }}>
        {row.super_category && (
          <Typography variant="overline" component="div" noWrap sx={{ color: 'text.secondary', lineHeight: 1.4 }}>
            {row.super_category}
          </Typography>
        )}
        <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700, mb: 0.5 }}>
          {row.name}
        </Typography>
        <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1.25 }}>
          <FactLine value={formatCount(row.clubs)} label={t('clubAdmin.dashboard.clubs')} />
          <FactLine value={formatCount(row.pods)} label={t('clubAdmin.dashboard.pods')} />
        </Stack>
      </CardContent>
    </Card>
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
          <Skeleton key={key} variant="rounded" height={88} sx={{ flex: 1 }} />
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
    <Card variant="outlined" sx={{ borderRadius: '16px' }}>
      <CardContent>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {t('clubAdmin.dashboard.yourCategories')}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
          {t('clubAdmin.dashboard.yourCategoriesHint')}
        </Typography>
        {body}
      </CardContent>
    </Card>
  );
}
