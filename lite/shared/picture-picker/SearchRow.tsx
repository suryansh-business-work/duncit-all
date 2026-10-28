import { InputAdornment, Stack, TextField, ToggleButton, ToggleButtonGroup } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useCommonT } from '../i18n';
import type { PictureOrientation } from './picture.graphql';

const SHAPE_CHOICES = ['ANY', 'SQUARE', 'LANDSCAPE', 'PORTRAIT'] as const;
type ShapeChoice = (typeof SHAPE_CHOICES)[number];

interface SearchRowProps {
  value: string;
  onChange: (value: string) => void;
  /** Enter runs the search; an empty box goes back to the featured picks. */
  onSubmit: () => void;
  orientation: PictureOrientation | null;
  onOrientation: (orientation: PictureOrientation | null) => void;
  /** Only a search can lean one way; the featured picks and earlier covers cannot. */
  showShape: boolean;
}

/** The stock photo search box, with the shape filter beside it while a search or topic is showing. */
export function SearchRow({ value, onChange, onSubmit, orientation, onOrientation, showShape }: Readonly<SearchRowProps>) {
  const { t } = useCommonT();
  return (
    <Stack
      component="form"
      role="search"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1}
    >
      <TextField
        type="search"
        size="small"
        fullWidth
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={t('lite.picture.searchPlaceholder')}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          },
          htmlInput: { 'aria-label': t('lite.picture.searchLabel'), maxLength: 100, enterKeyHint: 'search', 'data-testid': 'picture-search' },
        }}
      />
      {showShape ? (
        <ToggleButtonGroup
          exclusive
          size="small"
          value={orientation ?? 'ANY'}
          onChange={(_event, next: ShapeChoice | null) => {
            if (next) onOrientation(next === 'ANY' ? null : next);
          }}
          aria-label={t('lite.picture.shape')}
          data-testid="picture-shape"
          sx={{ flexShrink: 0 }}
        >
          {SHAPE_CHOICES.map((choice) => (
            <ToggleButton key={choice} value={choice} sx={{ px: 1.5 }} data-testid={`picture-shape-${choice}`}>
              {t(`lite.picture.shapes.${choice}`)}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      ) : null}
    </Stack>
  );
}
