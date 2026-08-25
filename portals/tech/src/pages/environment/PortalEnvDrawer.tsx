import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Divider,
  Drawer,
  InputAdornment,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { ENV_ENTRIES, type EnvEntry } from './queries';
import { SET_PORTAL_ENV_ENTRIES, type PortalListItem } from './portal-env-queries';
import { notify } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';

interface Props {
  portal: PortalListItem | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function PortalEnvDrawer({ portal, onClose, onSaved }: Readonly<Props>) {
  const { t } = useTranslation();
  const { data, loading } = useQuery<{ envEntries: EnvEntry[] }>(ENV_ENTRIES, {
    variables: { filter: {} },
    skip: !portal,
    fetchPolicy: 'cache-and-network',
  });
  const [setMut, setState] = useMutation(SET_PORTAL_ENV_ENTRIES);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');

  const entries = data?.envEntries ?? [];

  useEffect(() => {
    if (!portal) return;
    setSearch('');
    const preselected = entries.filter((e) => e.assigned_portals.includes(portal.key)).map((e) => e.id);
    setSelected(new Set(preselected));
    // Re-run when the entry list arrives for this portal.
  }, [portal, data]);

  const grouped = useMemo(() => {
    const term = search.trim().toLowerCase();
    const map = new Map<string, EnvEntry[]>();
    for (const e of entries) {
      if (term && !e.name.toLowerCase().includes(term) && !e.category.toLowerCase().includes(term)) continue;
      if (!map.has(e.category)) map.set(e.category, []);
      map.get(e.category)!.push(e);
    }
    return Array.from(map.entries());
  }, [entries, search]);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const save = async () => {
    /* v8 ignore next -- the Save button only renders inside the open drawer, which requires a non-null portal */
    if (!portal) return;
    try {
      await setMut({ variables: { portalKey: portal.key, entryIds: Array.from(selected) } });
      notify(`Saved ${selected.size} entr${selected.size === 1 ? 'y' : 'ies'} for ${portal.name}`, 'success');
      onSaved();
      onClose();
    } catch (err) {
      notify(parseApiError(err), 'error');
    }
  };

  return (
    <Drawer anchor="right" open={!!portal} onClose={onClose} slotProps={{
      paper: { sx: { width: { xs: '100%', sm: 420 } } }
    }}>
      <Stack sx={{ height: '100%' }}>
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" sx={{
            fontWeight: 800
          }}>{portal?.name}</Typography>
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            Select which environment entries are assigned to this portal.
          </Typography>
        </Box>
        <Divider />
        <Box sx={{ px: 2, pt: 1.5 }}>
          <TextField
            size="small"
            fullWidth
            placeholder={t('tech.environment.searchConfigs')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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
        </Box>
        <Box sx={{ flex: 1, overflowY: 'auto' }}>
          {loading && !entries.length ? (
            <Box sx={{ py: 6, textAlign: 'center' }}><CircularProgress size={26} /></Box>
          ) : (
            grouped.map(([cat, list]) => (
              <Box key={cat}>
                <Typography
                  variant="overline"
                  sx={{
                    color: "text.secondary",
                    px: 2,
                    pt: 1.5,
                    display: 'block'
                  }}>{cat}</Typography>
                <List dense disablePadding>
                  {list.map((e) => (
                    <ListItemButton key={e.id} onClick={() => toggle(e.id)}>
                      <Checkbox edge="start" checked={selected.has(e.id)} tabIndex={-1} disableRipple />
                      <ListItemText
                        primary={e.name}
                        secondary={e.is_default ? 'Default' : undefined}
                      />
                      {!e.is_active && <Chip size="small" label={t('tech.environment.off')} />}
                    </ListItemButton>
                  ))}
                </List>
              </Box>
            ))
          )}
        </Box>
        <Divider />
        <Stack
          direction="row"
          spacing={1}
          sx={{
            justifyContent: "flex-end",
            p: 2
          }}>
          <Button onClick={onClose} disabled={setState.loading}>{t('shell.common.cancel')}</Button>
          <Button variant="contained" onClick={save} disabled={setState.loading}>
            {setState.loading ? 'Saving…' : `Save (${selected.size})`}
          </Button>
        </Stack>
      </Stack>
    </Drawer>
  );
}
