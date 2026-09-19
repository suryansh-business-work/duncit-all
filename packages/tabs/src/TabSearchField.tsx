import ClearIcon from '@mui/icons-material/Clear';
import SearchIcon from '@mui/icons-material/Search';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import { DuncitIconButton } from '@duncit/buttons';

export interface TabSearchFieldProps {
  value: string;
  onChange: (next: string) => void;
  /** Placeholder AND accessible name — the strip has no visible label to spare. */
  placeholder: string;
  clearLabel: string;
  testId: string;
}

/**
 * Narrow on a phone and steady beside the tabs: the box may not grow into the
 * strip's scroll room, and may not shrink below a couple of typed words either.
 */
const FIELD_SX = { width: { xs: 132, sm: 180 }, flexShrink: 0 } as const;

/** The search box at the head of a tab strip. */
export function TabSearchField({
  value,
  onChange,
  placeholder,
  clearLabel,
  testId,
}: Readonly<TabSearchFieldProps>) {
  const clear = value === '' ? undefined : (
    <InputAdornment position="end">
      <DuncitIconButton size="small" aria-label={clearLabel} onClick={() => onChange('')}>
        <ClearIcon fontSize="small" />
      </DuncitIconButton>
    </InputAdornment>
  );
  return (
    <TextField
      size="small"
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      sx={FIELD_SX}
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
          endAdornment: clear,
        },
        htmlInput: { 'aria-label': placeholder, 'data-testid': testId },
      }}
    />
  );
}
