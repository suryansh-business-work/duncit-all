import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Autocomplete, Box, InputAdornment, TextField, Typography } from '@mui/material';
import { createFilterOptions } from '@mui/material/Autocomplete';
import SearchIcon from '@mui/icons-material/Search';
import type { AppNavItem, SearchItem } from '../types';

const filterOptions = createFilterOptions<SearchItem>({
  stringify: (option) => [option.label, option.to, option.section ?? '', ...(option.keywords ?? [])].join(' '),
});

/** Flattens the sidebar nav tree into search entries (leaf label + parent section). */
export function deriveSearchItems(nav: AppNavItem[], section?: string): SearchItem[] {
  return nav.flatMap((item) => {
    const children = item.children?.length ? deriveSearchItems(item.children, item.label) : [];
    if (!item.to) return children;
    return [{ label: item.label, to: item.to, section }, ...children];
  });
}

/** '/' only focuses the search when the user isn't already typing somewhere. */
const TYPING_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

export interface HeaderSearchProps {
  /** Explicit search entries; derived from `nav` when omitted. */
  items?: SearchItem[];
  /** Nav tree to derive entries from when `items` isn't passed. */
  nav?: AppNavItem[];
  placeholder?: string;
  autoFocus?: boolean;
  /** The always-mounted header instance owns the '/' shortcut; overlays opt out. */
  disableSlashShortcut?: boolean;
  /** Called after navigating to a picked result (e.g. close the mobile overlay). */
  onNavigated?: () => void;
}

/** Config-driven global search rendered in the AppBar: pick a result to navigate. */
export function HeaderSearch({
  items,
  nav,
  placeholder = 'Search',
  autoFocus,
  disableSlashShortcut,
  onNavigated,
}: Readonly<HeaderSearchProps>) {
  const navigate = useNavigate();
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const options = useMemo(() => (items?.length ? items : deriveSearchItems(nav ?? [])), [items, nav]);

  useEffect(() => {
    if (disableSlashShortcut) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== '/') return;
      const target = event.target as HTMLElement | null;
      if (target && (TYPING_TAGS.has(target.tagName) || target.isContentEditable)) return;
      event.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [disableSlashShortcut]);

  return (
    <Autocomplete
      size="small"
      options={options}
      value={null}
      inputValue={inputValue}
      filterOptions={filterOptions}
      getOptionLabel={(option) => option.label}
      onInputChange={(_, nextValue) => setInputValue(nextValue)}
      onChange={(_, option) => {
        if (!option) return;
        setInputValue('');
        navigate(option.to);
        onNavigated?.();
      }}
      blurOnSelect
      noOptionsText="No matches"
      sx={{ width: '100%', maxWidth: 420, '& .MuiInputBase-root': { bgcolor: 'background.default' } }}
      renderInput={(params) => (
        <TextField
          {...params}
          placeholder={placeholder}
          autoFocus={autoFocus}
          inputRef={inputRef}
          InputProps={{
            ...params.InputProps,
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
      )}
      renderOption={(props, option) => (
        <Box component="li" {...props} key={option.to} sx={{ alignItems: 'flex-start' }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" fontWeight={700} noWrap>
              {option.label}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
              {option.section ? `${option.section} · ${option.to}` : option.to}
            </Typography>
          </Box>
        </Box>
      )}
    />
  );
}
