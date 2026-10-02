import { Box, ButtonBase, Stack, Typography } from '@mui/material';
import CategoryIcon from '@mui/icons-material/CategoryOutlined';
import type { SuperCategoryGroup } from '@duncit/utils';
import { renderSuperCategoryMark } from '../../components/app-header/superCategoryIcon';
import SectionHeader from '../../components/SectionHeader';
import { SURFACE_SX } from '../../theme';
import type { SearchCategory } from './useSearchDiscovery';

interface Props {
  groups: SuperCategoryGroup<SearchCategory>[];
  onSelect: (categoryId: string) => void;
}

interface TileProps {
  category: SearchCategory;
  onSelect: (categoryId: string) => void;
}

/** One category tile: the admin's icon (image, MUI name or emoji) over its name. */
function CategoryTile({ category, onSelect }: Readonly<TileProps>) {
  return (
    <ButtonBase
      data-testid={`category-actions-item-${category.id}`}
      onClick={() => onSelect(category.id)}
      sx={{ ...SURFACE_SX, flexDirection: 'column', gap: 1, p: 2, minWidth: 0 }}
    >
      <Box
        aria-hidden
        sx={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          bgcolor: 'action.hover',
          color: 'secondary.main',
          display: 'grid',
          placeItems: 'center',
          fontSize: 22,
        }}
      >
        {renderSuperCategoryMark(category.icon, 22) ?? <CategoryIcon color="inherit" />}
      </Box>
      <Typography noWrap sx={{ fontSize: '0.875rem', fontWeight: 600, textAlign: 'center', width: '100%' }}>
        {category.name}
      </Typography>
    </ButtonBase>
  );
}

interface GroupProps {
  group: SuperCategoryGroup<SearchCategory>;
  onSelect: (categoryId: string) => void;
}

/** A super category's heading (its icon + name) and the category tiles under it. */
function SuperCategorySection({ group, onSelect }: Readonly<GroupProps>) {
  const { superCategory, categories } = group;
  const headingId = `category-actions-group-${superCategory.id}-title`;
  return (
    <Stack data-testid={`category-actions-group-${superCategory.id}`} component="section" aria-labelledby={headingId} spacing={1.25}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', color: 'text.secondary' }}>
        {renderSuperCategoryMark(superCategory.icon)}
        <Typography id={headingId} component="h3" sx={{ fontSize: '0.95rem', fontWeight: 600, color: 'text.primary' }}>
          {superCategory.name}
        </Typography>
      </Stack>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(104px, 1fr))', gap: 1.5 }}>
        {categories.map((category) => (
          <CategoryTile key={category.id} category={category} onSelect={onSelect} />
        ))}
      </Box>
    </Stack>
  );
}

/** The default (nothing typed) search landing — category tiles grouped under
 * their super category, so users explore communities by interest instead of
 * facing a blank screen. */
export default function CategoryActions({ groups, onSelect }: Readonly<Props>) {
  return (
    <Stack data-testid="category-actions" component="section" spacing={1.5}>
      <SectionHeader testId="category-actions-header" title="Discover Experiences by Interest" />
      {groups.length === 0 ? (
        <Typography data-testid="category-actions-empty" variant="body2" sx={{
          color: "text.secondary"
        }}>
          Categories are on their way — check back soon.
        </Typography>
      ) : (
        <Stack data-testid="category-actions-grid" spacing={2.5}>
          {groups.map((group) => (
            <SuperCategorySection key={group.superCategory.id} group={group} onSelect={onSelect} />
          ))}
        </Stack>
      )}
    </Stack>
  );
}
