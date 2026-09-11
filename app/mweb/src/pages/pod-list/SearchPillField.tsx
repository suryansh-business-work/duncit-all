import type { ReactNode } from 'react';
import { InputAdornment, TextField } from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';

interface Props {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  /** Accessible name for the input, when the placeholder is not enough. */
  ariaLabel?: string;
  /** 52 on the Search page, 48 on the in-page list searches. */
  height?: number;
  autoFocus?: boolean;
  onFocus?: () => void;
  /** Trailing control inside the pill (a clear button). */
  endAdornment?: ReactNode;
  enterKeyHint?: 'search';
}

/**
 * The calm search pill every Discover list shares: a surface pill with a muted
 * leading glass, borderless on the light ground (the card hairline in dark),
 * green only while focused. Native twin: components/pod-list/SearchPill.
 */
export default function SearchPillField({
  value,
  onChange,
  placeholder,
  ariaLabel,
  height = 48,
  autoFocus,
  onFocus,
  endAdornment,
  enterKeyHint,
}: Readonly<Props>) {
  return (
    <TextField
      fullWidth
      size="small"
      autoFocus={autoFocus}
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      onFocus={onFocus}
      sx={{
        '& .MuiOutlinedInput-root': {
          borderRadius: 999,
          bgcolor: 'background.paper',
          minHeight: height,
          pl: 2,
        },
        '& .MuiOutlinedInput-root fieldset': { borderColor: 'var(--duncit-card-border)' },
        '& .MuiOutlinedInput-root:hover fieldset': { borderColor: 'divider' },
        '& .MuiOutlinedInput-root.Mui-focused fieldset': { borderColor: 'primary.main' },
      }}
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <SearchRoundedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
            </InputAdornment>
          ),
          endAdornment: endAdornment ? <InputAdornment position="end">{endAdornment}</InputAdornment> : null,
        },
        htmlInput: { 'aria-label': ariaLabel, enterKeyHint },
      }}
    />
  );
}
