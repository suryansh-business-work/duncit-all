import { Box, ButtonBase, Typography } from '@mui/material';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import { categoryTileGroup, categoryTileName } from '@duncit/utils';
import { renderSuperCategoryMark } from '../../../../components/app-header/superCategoryIcon';
import type { CreatePodHostCategory } from '../create-pod.types';

const ICON_SIZE = 40;

interface Props {
  category: CreatePodHostCategory;
  /** The admin-set icon (Category Management); empty falls back to a generic mark. */
  icon: string;
  selected: boolean;
  testId: string;
  onPick: () => void;
}

/** One category the host may run the pod in: its real icon on a light plate
 * (admin icons are drawn for a light ground), its name and its parent. */
export default function CategoryTile({ category, icon, selected, testId, onPick }: Readonly<Props>) {
  const name = categoryTileName(category);
  return (
    <ButtonBase
      data-testid={testId}
      aria-pressed={selected}
      onClick={onPick}
      sx={{
        minHeight: 124,
        px: 0.75,
        py: 1.5,
        borderRadius: 3,
        border: selected ? 2 : 1,
        borderColor: selected ? 'primary.main' : 'divider',
        bgcolor: selected ? 'action.selected' : 'action.hover',
        display: 'flex',
        flexDirection: 'column',
        gap: 0.5,
        textAlign: 'center',
        transition: (theme) => theme.transitions.create(['border-color', 'background-color']),
      }}
    >
      <Box
        aria-hidden
        sx={{
          width: 60,
          height: 60,
          mb: 0.5,
          borderRadius: '50%',
          bgcolor: 'common.white',
          color: 'primary.main',
          display: 'grid',
          placeItems: 'center',
          border: 3,
          borderColor: selected ? 'primary.main' : 'transparent',
        }}
      >
        {renderSuperCategoryMark(icon, ICON_SIZE) ?? <CategoryOutlinedIcon sx={{ fontSize: ICON_SIZE * 0.75 }} />}
      </Box>
      <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, lineHeight: 1.2 }}>{name}</Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.2 }}>
        {categoryTileGroup(category)}
      </Typography>
    </ButtonBase>
  );
}
