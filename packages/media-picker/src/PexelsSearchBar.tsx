import { Button, CircularProgress, InputAdornment, Stack, TextField } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

interface Props {
  value: string;
  placeholder: string;
  /** True while a search is in flight — the button says so and refuses a second. */
  searching: boolean;
  onChange: (value: string) => void;
  onSearch: () => void;
}

/**
 * The search row both Pexels tabs use.
 *
 * One component rather than two copies: photos and videos had the same input,
 * the same Enter handling and the same button, and only one of them ever got a
 * fix. The button carries the in-flight state because a search that returns the
 * same-looking grid is otherwise indistinguishable from one that never ran.
 */
export default function PexelsSearchBar({
  value,
  placeholder,
  searching,
  onChange,
  onSearch,
}: Readonly<Props>) {
  return (
    <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
      <TextField
        fullWidth
        size="small"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') onSearch();
        }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
        }}
      />
      <Button
        variant="contained"
        onClick={onSearch}
        disabled={searching}
        startIcon={searching ? <CircularProgress size={14} color="inherit" /> : null}
      >
        Search
      </Button>
    </Stack>
  );
}
