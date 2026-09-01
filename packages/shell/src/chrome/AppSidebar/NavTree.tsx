import { useMemo, useState } from 'react';
import { Box, InputAdornment, List, TextField, Typography } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import { DuncitButton } from '@duncit/buttons';
import { useLocation } from 'react-router';
import { useTranslation } from '../../i18n/useTranslation';
import type { AppNavItem } from '../../types';
import { filterNav } from './helpers';
import { NavNode, type ExpandSignal } from './nav-items';

export interface NavTreeProps {
  nav: AppNavItem[];
  /** Called after a nav item is picked (closes the temporary drawer). */
  onNavigate?: () => void;
}

/** The full-width menu: search, expand-all, and the nav tree under them. */
export function NavTree({ nav: navItems, onNavigate }: Readonly<NavTreeProps>) {
  const { t } = useTranslation();
  const location = useLocation();
  const [query, setQuery] = useState('');
  const nav = useMemo(() => filterNav(navItems, query.trim()), [navItems, query]);
  // Expand-all / Collapse-all toggle: `allOpen` flips the label; `expandAll`
  // carries a nonce so every group re-syncs even after manual toggling.
  const [allOpen, setAllOpen] = useState(false);
  const [expandAll, setExpandAll] = useState<ExpandSignal>(null);
  const toggleAll = () => {
    const open = !allOpen;
    setAllOpen(open);
    setExpandAll({ open, nonce: Date.now() });
  };
  const toggleAllLabel = allOpen ? t('shell.chrome.collapseAll') : t('shell.chrome.expandAll');
  return (
    <>
      <Box sx={{ px: 1.5, pt: 1.5, pb: 0.5 }}>
        <TextField
          size="small"
          fullWidth
          placeholder={t('shell.chrome.searchMenu')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }
          }}
        />
        <DuncitButton
          size="small"
          fullWidth
          onClick={toggleAll}
          startIcon={allOpen ? <UnfoldLessIcon fontSize="small" /> : <UnfoldMoreIcon fontSize="small" />}
          sx={{ mt: 0.75, justifyContent: 'flex-start', color: 'text.secondary', fontWeight: 700 }}
        >
          {toggleAllLabel}
        </DuncitButton>
      </Box>
      <List sx={{ px: 1, py: 1, flex: 1, overflowY: 'auto' }}>
        {nav.length === 0 ? (
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              px: 1.5
            }}>
            {t('shell.chrome.noMenuMatch')}
          </Typography>
        ) : (
          nav.map((item) => (
            <NavNode
              key={item.label}
              item={item}
              pathname={location.pathname}
              onNavigate={onNavigate}
              searching={!!query.trim()}
              expandAll={expandAll}
            />
          ))
        )}
      </List>
    </>
  );
}
