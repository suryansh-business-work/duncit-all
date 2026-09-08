import {
  InputAdornment,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Close';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import SwapVertIcon from '@mui/icons-material/SwapVert';
import { DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '../../i18n';
import type { LayoutDirection } from './layout';

interface Props {
  search: string;
  onSearch: (next: string) => void;
  direction: LayoutDirection;
  onDirection: (next: LayoutDirection) => void;
  /** Boxes lit by the current search, and how many there are in total. */
  hits: number;
  total: number;
}

/**
 * The canvas's own controls: what to look for, and which way the tree runs.
 *
 * Both are held in the URL (see `useRegionView`), so this component owns no
 * state — it reads and reports, which is what lets a reload land on the same
 * view and a pasted link open somebody else's.
 */
export default function CanvasToolbar({
  search,
  onSearch,
  direction,
  onDirection,
  hits,
  total,
}: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1.5}
      useFlexGap
      sx={{ flexWrap: 'wrap', alignItems: { sm: 'center' } }}
    >
      <TextField
        size="small"
        value={search}
        onChange={(event) => onSearch(event.target.value)}
        label={t('partners.regional.searchCanvas')}
        helperText={search ? undefined : t('partners.regional.searchCanvasHint')}
        sx={{ flex: '1 1 280px', minWidth: 240 }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
            endAdornment: search ? (
              <InputAdornment position="end">
                <DuncitIconButton
                  size="small"
                  aria-label={t('partners.regional.clearSearch')}
                  onClick={() => onSearch('')}
                >
                  <ClearIcon fontSize="small" />
                </DuncitIconButton>
              </InputAdornment>
            ) : undefined,
          },
        }}
      />

      {search && (
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {t('partners.regional.matchCount', { vars: { count: hits, total } })}
        </Typography>
      )}

      <ToggleButtonGroup
        exclusive
        size="small"
        value={direction}
        onChange={(_event, next: LayoutDirection | null) => next && onDirection(next)}
        aria-label={t('partners.regional.layout')}
      >
        <ToggleButton value="LR" aria-label={t('partners.regional.layoutHorizontal')}>
          <SwapHorizIcon fontSize="small" sx={{ mr: 0.75 }} />
          {t('partners.regional.layoutHorizontal')}
        </ToggleButton>
        <ToggleButton value="TB" aria-label={t('partners.regional.layoutVertical')}>
          <SwapVertIcon fontSize="small" sx={{ mr: 0.75 }} />
          {t('partners.regional.layoutVertical')}
        </ToggleButton>
      </ToggleButtonGroup>
    </Stack>
  );
}
