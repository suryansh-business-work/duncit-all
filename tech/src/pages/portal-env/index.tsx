import { useState } from 'react';
import { useQuery } from '@apollo/client';
import {
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import HubIcon from '@mui/icons-material/Hub';
import { PORTAL_LIST, type PortalListItem } from './queries';
import PortalEnvDrawer from './PortalEnvDrawer';

const KIND_LABEL: Record<string, string> = { PORTAL: 'Portal', WEBSITE: 'Website', APP: 'App' };

export default function PortalEnvMappingPage() {
  const { data, loading, refetch } = useQuery<{ portalModes: PortalListItem[] }>(PORTAL_LIST, {
    fetchPolicy: 'cache-and-network',
  });
  const [active, setActive] = useState<PortalListItem | null>(null);
  const portals = data?.portalModes ?? [];

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <HubIcon color="primary" />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h5" fontWeight={800}>Portal → Environment Mapping</Typography>
          <Typography variant="body2" color="text.secondary">
            Click a portal to open its panel and multi-select which environment entries it uses.
          </Typography>
        </Box>
      </Stack>

      <Card>
        <CardContent sx={{ p: 0 }}>
          {loading && !portals.length ? (
            <Box sx={{ py: 6, textAlign: 'center' }}><CircularProgress size={28} /></Box>
          ) : (
            <List disablePadding>
              {portals.map((p) => (
                <ListItemButton key={p.key} onClick={() => setActive(p)} divider>
                  <ListItemText primary={p.name} secondary={p.key} />
                  <Chip size="small" variant="outlined" label={KIND_LABEL[p.kind] ?? p.kind} sx={{ mr: 1 }} />
                  <ChevronRightIcon color="action" />
                </ListItemButton>
              ))}
            </List>
          )}
        </CardContent>
      </Card>

      <PortalEnvDrawer portal={active} onClose={() => setActive(null)} onSaved={() => refetch()} />
    </Stack>
  );
}
