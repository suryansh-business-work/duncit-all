import { Link as RouterLink } from 'react-router';
import { Chip, Stack } from '@mui/material';
import type { LiteCategory } from '../../../shared/graphql/documents';
import { useWebT } from '../../../shared/i18n';
import { paths } from '../../lib/paths';
import { categoryIcon } from './categoryIcon';

/** One pill per category, each a link to its list. */
export function CategoryChips({ categories }: Readonly<{ categories: readonly LiteCategory[] }>) {
  const { t } = useWebT();
  return (
    <Stack component="ul" direction="row" sx={{ flexWrap: 'wrap', gap: 1, listStyle: 'none', p: 0, m: 0 }}>
      {categories.map((category) => (
        <li key={category.id}>
          <Chip
            component={RouterLink}
            to={paths.category(category.slug)}
            clickable
            icon={categoryIcon(category.icon)}
            label={`${category.name} · ${t('liteWeb.discover.eventsCount', { count: category.events_count ?? 0 })}`}
            sx={{ height: 44, px: 0.5, fontSize: '0.95rem', bgcolor: 'background.paper', border: 1, borderColor: 'divider' }}
            data-testid={`category-chip-${category.slug}`}
          />
        </li>
      ))}
    </Stack>
  );
}
