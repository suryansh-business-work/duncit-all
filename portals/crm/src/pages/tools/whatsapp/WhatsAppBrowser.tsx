import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import {
  WA_COMMUNITIES,
  WA_CONTACTS,
  WA_GROUPS,
  WA_GROUP_MEMBERS,
  WA_REFRESH,
} from './whatsappQueries';

type Ref = { jid: string; name: string };

function Loading() {
  return (
    <Stack alignItems="center" sx={{ py: 4 }}>
      <CircularProgress size={24} />
    </Stack>
  );
}

function MembersDialog({ group, onClose }: Readonly<{ group: Ref | null; onClose: () => void }>) {
  const { data, loading } = useQuery(WA_GROUP_MEMBERS, {
    variables: { group_jid: group?.jid },
    skip: !group,
  });
  const members = data?.waGroupMembers ?? [];
  return (
    <Dialog open={!!group} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{group?.name || 'Members'}</DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Loading />
        ) : (
          <List dense>
            {members.map((m: any) => (
              <ListItemText
                key={m.jid}
                primary={m.name || `+${m.phone}`}
                secondary={`+${m.phone}${m.is_business ? ' · Business' : ''}`}
              />
            ))}
            {members.length === 0 && <Typography color="text.secondary">No members found.</Typography>}
          </List>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Connected-account browser: Communities → Groups → Members, plus all Users.
 * Refresh pulls the latest from the gateway into Mongo (bug WA-LeadGen P4). */
export default function WhatsAppBrowser() {
  const [tab, setTab] = useState(0);
  const [community, setCommunity] = useState<Ref | null>(null);
  const [members, setMembers] = useState<Ref | null>(null);

  const communities = useQuery(WA_COMMUNITIES, { skip: tab !== 0 });
  const groups = useQuery(WA_GROUPS, {
    variables: { community_jid: community?.jid ?? null },
    skip: tab !== 1,
  });
  const contacts = useQuery(WA_CONTACTS, { skip: tab !== 2 });
  const [refresh, refreshState] = useMutation(WA_REFRESH);

  const onRefresh = async () => {
    await refresh();
    await Promise.all([communities.refetch(), groups.refetch(), contacts.refetch()]);
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Tabs value={tab} onChange={(_e, v) => setTab(v)}>
          <Tab label="Communities" />
          <Tab label="Groups" />
          <Tab label="Users" />
        </Tabs>
        <Button
          size="small"
          startIcon={<RefreshIcon />}
          onClick={onRefresh}
          disabled={refreshState.loading}
        >
          Refresh
        </Button>
      </Stack>

      {tab === 0 &&
        (communities.loading ? (
          <Loading />
        ) : (
          <List>
            {(communities.data?.waCommunities ?? []).map((c: any) => (
              <ListItemButton
                key={c.id}
                onClick={() => {
                  setCommunity({ jid: c.community_jid, name: c.name });
                  setTab(1);
                }}
              >
                <ListItemText primary={c.name} secondary={`${c.groups_count} groups`} />
              </ListItemButton>
            ))}
          </List>
        ))}

      {tab === 1 && (
        <Box>
          {community && (
            <Chip
              sx={{ mb: 1 }}
              label={`Community: ${community.name}`}
              onDelete={() => setCommunity(null)}
            />
          )}
          {groups.loading ? (
            <Loading />
          ) : (
            <List>
              {(groups.data?.waGroups ?? []).map((g: any) => (
                <ListItemButton
                  key={g.id}
                  onClick={() => setMembers({ jid: g.group_jid, name: g.name })}
                >
                  <ListItemText primary={g.name} secondary="Tap to view members" />
                </ListItemButton>
              ))}
            </List>
          )}
        </Box>
      )}

      {tab === 2 &&
        (contacts.loading ? (
          <Loading />
        ) : (
          <List>
            {(contacts.data?.waContacts ?? []).map((u: any) => (
              <ListItemText
                key={u.id}
                primary={u.name || `+${u.phone}`}
                secondary={`+${u.phone}${u.is_business ? ' · Business' : ''}`}
              />
            ))}
          </List>
        ))}

      <MembersDialog group={members} onClose={() => setMembers(null)} />
    </Box>
  );
}
