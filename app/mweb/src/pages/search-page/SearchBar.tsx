import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import {
  Box,
  ClickAwayListener,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Typography,
} from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import CloseIcon from '@mui/icons-material/Close';
import { DuncitIconButton } from '@duncit/buttons';
import { SEARCH_SUGGESTIONS } from './queries';
import SearchPillField from '../pod-list/SearchPillField';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useTranslation } from '../../i18n/useTranslation';
import { SURFACE_SX } from '../../theme';

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
  const { t } = useTranslation();
  const [focused, setFocused] = useState(false);
  const debounced = useDebouncedValue(value.trim());
  const { data } = useQuery<any>(SEARCH_SUGGESTIONS, {
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
        <SearchPillField
          autoFocus
          height={52}
          value={value}
          placeholder={t('mweb.search.searchClubsPodsCategoriesOrActivities')}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          ariaLabel="Search Duncit"
          enterKeyHint="search"
          endAdornment={
            value ? (
              <DuncitIconButton aria-label={t('mweb.common.clearSearch')} size="small" onClick={() => onChange('')}>
                <CloseIcon fontSize="small" />
              </DuncitIconButton>
            ) : null
          }
        />
        {showSuggestions && (
          <Paper
            elevation={0}
            sx={{ ...SURFACE_SX, position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0, zIndex: 6, overflow: 'hidden', py: 0.5 }}
          >
            <List dense disablePadding>
              {suggestions.map((s) => (
                <ListItemButton key={`${s.kind}:${s.text}`} onClick={() => pick(s.text)} sx={{ py: 1.25, px: 2, borderRadius: 0 }}>
                  <SearchRoundedIcon fontSize="small" sx={{ mr: 1.25, color: 'text.secondary' }} />
                  <ListItemText primary={s.text} slotProps={{
                    primary: { noWrap: true, sx: { fontWeight: 600 } }
                  }} />
                  <Typography
                    variant="caption"
                    sx={{
                      color: "text.secondary",
                      ml: 1,
                      flex: '0 0 auto'
                    }}>
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
