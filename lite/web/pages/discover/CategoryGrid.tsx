import { Link as RouterLink } from 'react-router';
import { Box, Card, CardActionArea, Stack, Typography } from '@mui/material';
import type { LiteCategory } from '../../../shared/graphql/documents';
import { useWebT } from '../../../shared/i18n';
import { tintAt } from '../../../shared/tokens';
import { paths } from '../../lib/paths';
import { categoryIcon } from './categoryIcon';

const GRID = { display: 'grid', gap: 1.5, gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(4, 1fr)' } } as const;

interface CategoryGridProps {
  categories: readonly LiteCategory[];
  /** Show "N events" under each name (Discover) or just the name (the landing page). */
  showCounts?: boolean;
}

/** Every category as a tile with its own coloured glyph. */
export function CategoryGrid({ categories, showCounts = true }: Readonly<CategoryGridProps>) {
  const { t } = useWebT();
  return (
    <Box component="ul" sx={{ ...GRID, listStyle: 'none', p: 0, m: 0 }} data-testid="category-grid">
      {categories.map((category, index) => (
        <Box component="li" key={category.id} sx={{ minWidth: 0 }}>
          <Card sx={{ height: '100%' }}>
            <CardActionArea component={RouterLink} to={paths.category(category.slug)} sx={{ p: 1.75, height: '100%' }} data-testid={`category-${category.slug}`}>
              <Stack spacing={showCounts ? 1 : 2.5}>
                <Box aria-hidden sx={{ color: tintAt(index), display: 'flex', '& svg': { fontSize: 26 } }}>
                  {categoryIcon(category.icon)}
                </Box>
                <Stack>
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
