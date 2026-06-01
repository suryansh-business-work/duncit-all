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
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import { ENV_ENTRIES, type EnvEntry } from './queries';
import { SET_PORTAL_ENV_ENTRIES, type PortalListItem } from './portal-env-queries';
import { notify } from '../../components/notify';
import { parseApiError } from '../../utils/parseApiError';

interface Props {
  portal: PortalListItem | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function PortalEnvDrawer({ portal, onClose, onSaved }: Props) {
  const { data, loading } = useQuery<{ envEntries: EnvEntry[] }>(ENV_ENTRIES, {
    variables: { filter: {} },
    skip: !portal,
    fetchPolicy: 'cache-and-network',
  });
  const [setMut, setState] = useMutation(SET_PORTAL_ENV_ENTRIES);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const entries = data?.envEntries ?? [];

  useEffect(() => {
    if (!portal) return;
    const preselected = entries.filter((e) => e.assigned_portals.includes(portal.key)).map((e) => e.id);
    setSelected(new Set(preselected));
    // Re-run when the entry list arrives for this portal.
  }, [portal, data]);

  const grouped = useMemo(() => {
    const map = new Map<string, EnvEntry[]>();
    for (const e of entries) {
      if (!map.has(e.category)) map.set(e.category, []);
      map.get(e.category)!.push(e);
    }
    return Array.from(map.entries());
  }, [entries]);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const save = async () => {
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
    <Drawer anchor="right" open={!!portal} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', sm: 420 } } }}>
      <Stack sx={{ height: '100%' }}>
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" fontWeight={800}>{portal?.name}</Typography>
          <Typography variant="body2" color="text.secondary">
            Select which environment entries are assigned to this portal.
          </Typography>
        </Box>
        <Divider />
        <Box sx={{ flex: 1, overflowY: 'auto' }}>
          {loading && !entries.length ? (
            <Box sx={{ py: 6, textAlign: 'center' }}><CircularProgress size={26} /></Box>
          ) : (
            grouped.map(([cat, list]) => (
              <Box key={cat}>
                <Typography variant="overline" color="text.secondary" sx={{ px: 2, pt: 1.5, display: 'block' }}>{cat}</Typography>
                <List dense disablePadding>
                  {list.map((e) => (
                    <ListItemButton key={e.id} onClick={() => toggle(e.id)}>
                      <Checkbox edge="start" checked={selected.has(e.id)} tabIndex={-1} disableRipple />
                      <ListItemText
                        primary={e.name}
                        secondary={e.is_default ? 'Default' : undefined}
                      />
                      {!e.is_active && <Chip size="small" label="Off" />}
                    </ListItemButton>
                  ))}
                </List>
              </Box>
            ))
          )}
        </Box>
        <Divider />
        <Stack direction="row" spacing={1} sx={{ p: 2 }} justifyContent="flex-end">
          <Button onClick={onClose} disabled={setState.loading}>Cancel</Button>
          <Button variant="contained" onClick={save} disabled={setState.loading}>
            {setState.loading ? 'Saving…' : `Save (${selected.size})`}
          </Button>
        </Stack>
      </Stack>
    </Drawer>
  );
}
