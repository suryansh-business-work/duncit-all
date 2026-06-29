import { useState } from 'react';
import { useQuery } from '@apollo/client';
import {
  Box,
  ClickAwayListener,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import { SEARCH_SUGGESTIONS } from './queries';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';

interface Suggestion {
  text: string;
  kind: string;
}

interface Props {
  value: string;
  onChange: (next: string) => void;
  onPick: (next: string) => void;
}

const kindLabel: Record<string, string> = {
  CLUB: 'Club',
  CATEGORY: 'Category',
  POD: 'Pod',
  ACTIVITY: 'Activity',
};

export default function SearchBar({ value, onChange, onPick }: Readonly<Props>) {
  const [focused, setFocused] = useState(false);
  const debounced = useDebouncedValue(value.trim());
  const { data } = useQuery(SEARCH_SUGGESTIONS, {
    variables: { query: debounced },
    skip: debounced.length < 2,
    fetchPolicy: 'cache-and-network',
  });
  const suggestions: Suggestion[] = data?.searchSuggestions ?? [];
  const showSuggestions = focused && debounced.length >= 2 && suggestions.length > 0;

  const pick = (next: string) => {
    onPick(next);
    setFocused(false);
  };

  return (
    <ClickAwayListener onClickAway={() => setFocused(false)}>
      <Box sx={{ position: 'relative', width: '100%' }}>
        <TextField
          fullWidth
          size="small"
          autoFocus
          value={value}
          placeholder="Search clubs, pods, categories or activities…"
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          inputProps={{ 'aria-label': 'Search Duncit', enterKeyHint: 'search' }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
            endAdornment: value ? (
              <InputAdornment position="end">
                <IconButton aria-label="Clear search" size="small" onClick={() => onChange('')}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 999, bgcolor: 'background.paper', minHeight: 48 } }}
        />
        {showSuggestions && (
          <Paper
            elevation={6}
            sx={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 6, borderRadius: 3, overflow: 'hidden' }}
          >
            <List dense disablePadding>
              {suggestions.map((s) => (
                <ListItemButton key={`${s.kind}:${s.text}`} onClick={() => pick(s.text)}>
                  <SearchIcon fontSize="small" color="action" sx={{ mr: 1.25 }} />
                  <ListItemText primary={s.text} primaryTypographyProps={{ fontWeight: 700, noWrap: true }} />
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 1, flex: '0 0 auto' }}>
                    {kindLabel[s.kind] ?? s.kind}
                  </Typography>
                </ListItemButton>
              ))}
            </List>
          </Paper>
        )}
      </Box>
    </ClickAwayListener>
  );
}
