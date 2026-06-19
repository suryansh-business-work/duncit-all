import { useQuery } from '@apollo/client';
import {
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  List,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import { WA_GROUP_MEMBERS } from './whatsappQueries';

export type GroupRef = { jid: string; name: string };

/** Live-fetches a group's members (server also imports them as leads). */
export default function GroupMembersDialog({
  group,
  onClose,
}: Readonly<{ group: GroupRef | null; onClose: () => void }>) {
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
          <Stack alignItems="center" sx={{ py: 4 }}>
            <CircularProgress size={24} />
          </Stack>
        ) : (
          <List dense>
            {members.map((m: { jid: string; phone: string; name: string; is_business: boolean }) => (
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
