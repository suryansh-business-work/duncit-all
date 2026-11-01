import { Box, ButtonBase, Typography } from '@mui/material';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import { categoryTileName } from '@duncit/utils';
import { renderSuperCategoryMark } from '../../../../components/app-header/superCategoryIcon';
import { useTranslation } from '../../../../i18n/useTranslation';
import type { CreatePodHostCategory } from '../create-pod.types';

const ICON_SIZE = 24;

interface Props {
  category: CreatePodHostCategory;
  /** The admin-set icon (Category Management); empty falls back to a generic mark. */
  icon: string;
  selected: boolean;
  /** Clubs this sub-category has where the pod would run; none disables the chip. */
  clubCount: number;
  testId: string;
  onPick: () => void;
}

/** One sub-category the host may run the pod in, as a chip: its icon on a light
 * plate (admin icons are drawn for a light ground) on the left, its name and
 * how many clubs it has on the right. */
export default function CategoryTile({ category, icon, selected, clubCount, testId, onPick }: Readonly<Props>) {
  const { t } = useTranslation();
  const empty = clubCount === 0;
  return (
    <ButtonBase
      data-testid={testId}
      aria-pressed={selected}
      disabled={empty}
      onClick={onPick}
      sx={{
        flexShrink: 0,
        minHeight: 48,
        pl: 0.5,
        pr: 1.5,
        gap: 1,
        borderRadius: 999,
        border: 1,
        borderColor: selected ? 'primary.main' : 'divider',
        bgcolor: selected ? 'action.selected' : 'action.hover',
        opacity: empty ? 0.5 : 1,
        display: 'flex',
        alignItems: 'center',
        textAlign: 'left',
        transition: (theme) => theme.transitions.create(['border-color', 'background-color']),
      }}
    >
      <Box
        aria-hidden
        sx={{
          width: 38,
          height: 38,
          flexShrink: 0,
          borderRadius: '50%',
          bgcolor: 'common.white',
          color: 'primary.main',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        {renderSuperCategoryMark(icon, ICON_SIZE) ?? <CategoryOutlinedIcon sx={{ fontSize: ICON_SIZE * 0.8 }} />}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography noWrap sx={{ fontSize: '0.8125rem', fontWeight: 600, lineHeight: 1.2 }}>
          {categoryTileName(category)}
        </Typography>
        <Typography noWrap variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.2, display: 'block' }}>
          {empty ? t('mweb.createPod.categoryNoClubs') : t('mweb.createPod.categoryClubs', { count: clubCount })}
        </Typography>
      </Box>
    </ButtonBase>
  );
}
