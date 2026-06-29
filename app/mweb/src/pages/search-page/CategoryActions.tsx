import { Box, ButtonBase, Typography } from '@mui/material';
import CategoryIcon from '@mui/icons-material/CategoryOutlined';
import { renderSuperCategoryMark } from '../../components/app-header/superCategoryIcon';
import type { SearchCategory } from './useSearchDiscovery';

interface Props {
  categories: SearchCategory[];
  onSelect: (categoryId: string) => void;
}

/** The default (nothing typed) search landing — quick-access category buttons so
 * users can explore communities by interest instead of facing a blank screen. */
export default function CategoryActions({ categories, onSelect }: Readonly<Props>) {
  return (
    <Box component="section">
      <Typography variant="h6" fontWeight={900} sx={{ lineHeight: 1.2, mt: 2 }}>
        ✨ Discover Experiences by Interest
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Not sure what to search for? Explore communities by category and discover experiences happening around you.
      </Typography>
      {categories.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Categories are on their way — check back soon.
        </Typography>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(104px, 1fr))',
            gap: 1.25,
          }}
        >
          {categories.map((category) => (
            <ButtonBase
              key={category.id}
              onClick={() => onSelect(category.id)}
              sx={{
                flexDirection: 'column',
                gap: 0.75,
                p: 1.5,
                borderRadius: 3,
                border: 1,
                borderColor: 'divider',
                bgcolor: 'background.paper',
                transition: 'transform 160ms ease, border-color 160ms ease',
                '&:hover': { transform: 'translateY(-2px)', borderColor: 'primary.main' },
              }}
            >
              {renderSuperCategoryMark(category.icon) ?? <CategoryIcon color="primary" />}
              <Typography variant="caption" fontWeight={800} textAlign="center" noWrap sx={{ width: '100%' }}>
                {category.name}
              </Typography>
            </ButtonBase>
          ))}
        </Box>
      )}
    </Box>
  );
}
