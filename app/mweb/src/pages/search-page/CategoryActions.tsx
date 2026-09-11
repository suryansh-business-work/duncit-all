import { Box, ButtonBase, Stack, Typography } from '@mui/material';
import CategoryIcon from '@mui/icons-material/CategoryOutlined';
import { renderSuperCategoryMark } from '../../components/app-header/superCategoryIcon';
import SectionHeader from '../../components/SectionHeader';
import { SURFACE_SX } from '../../theme';
import type { SearchCategory } from './useSearchDiscovery';

interface Props {
  categories: SearchCategory[];
  onSelect: (categoryId: string) => void;
}

/** The default (nothing typed) search landing — quick-access category tiles so
 * users can explore communities by interest instead of facing a blank screen. */
export default function CategoryActions({ categories, onSelect }: Readonly<Props>) {
  return (
    <Stack component="section" spacing={1.5}>
      <SectionHeader title="Discover Experiences by Interest" />
      {categories.length === 0 ? (
        <Typography variant="body2" sx={{
          color: "text.secondary"
        }}>
          Categories are on their way — check back soon.
        </Typography>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(104px, 1fr))',
            gap: 1.5,
          }}
        >
          {categories.map((category) => (
            <ButtonBase
              key={category.id}
              onClick={() => onSelect(category.id)}
              sx={{ ...SURFACE_SX, flexDirection: 'column', gap: 1, p: 2, minWidth: 0 }}
            >
              <Box
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
                {renderSuperCategoryMark(category.icon) ?? <CategoryIcon color="inherit" />}
              </Box>
              <Typography
                noWrap
                sx={{
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  textAlign: "center",
                  width: '100%'
                }}>
                {category.name}
              </Typography>
            </ButtonBase>
          ))}
        </Box>
      )}
    </Stack>
  );
}
