import { Link as RouterLink } from 'react-router';
import { Box, Card, CardActionArea, Stack, Typography } from '@mui/material';
import type { LiteCategory } from '../../../shared/graphql/documents';
import { useWebT } from '../../../shared/i18n';
import { tintAt } from '../../../shared/tokens';
import { paths } from '../../lib/paths';
import { categoryIcon } from './categoryIcon';

export const CATEGORY_GRID = { display: 'grid', gap: 1.5, gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(3, minmax(0, 1fr))' } } as const;

interface CategoryGridProps {
  categories: readonly LiteCategory[];
  /** Show "N events" under each name (Discover) or just the name (the landing page). */
  showCounts?: boolean;
}

/** Every category as a tile: its own coloured glyph beside the name (and the count under it). */
export function CategoryGrid({ categories, showCounts = true }: Readonly<CategoryGridProps>) {
  const { t } = useWebT();
  return (
    <Box component="ul" sx={{ ...CATEGORY_GRID, listStyle: 'none', p: 0, m: 0 }} data-testid="category-grid">
      {categories.map((category, index) => (
        <Box component="li" key={category.id} sx={{ minWidth: 0 }}>
          <Card sx={{ height: '100%' }}>
            <CardActionArea component={RouterLink} to={paths.category(category.slug)} sx={{ px: 1.75, py: 1.5, height: '100%' }} data-testid={`category-${category.slug}`}>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', minWidth: 0 }}>
                <Box aria-hidden sx={{ color: tintAt(index), display: 'flex', flexShrink: 0, '& svg': { fontSize: 28 } }}>
                  {categoryIcon(category.icon)}
                </Box>
                <Stack sx={{ minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                    {category.name}
                  </Typography>
                  {showCounts ? (
                    <Typography variant="caption" color="text.secondary">
                      {t('liteWeb.discover.eventsCount', { count: category.events_count ?? 0 })}
                    </Typography>
                  ) : null}
                </Stack>
              </Stack>
            </CardActionArea>
          </Card>
        </Box>
      ))}
    </Box>
  );
}
