import { useState } from 'react';
import { Avatar, Box, Button, Stack, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ReplayIcon from '@mui/icons-material/Replay';
import ConfirmDialog from '../../../components/ConfirmDialog';
import TranscriptMenu from '../../../components/TranscriptMenu';
import type { SupportChatSession, TranscriptFormat } from '../../../graphql/supportChat';

interface Props {
  session: SupportChatSession;
  onResolve: () => void;
  onReopen: () => void;
  onDownload: (format: TranscriptFormat) => void;
  onEmail: (email: string) => void;
  busy: boolean;
}

/** Live-chat thread header: user identity + resolve / re-open actions + export. */
export default function ChatHeader({ session, onResolve, onReopen, onDownload, onEmail, busy }: Readonly<Props>) {
  const [confirmResolve, setConfirmResolve] = useState(false);
  const isResolved = session.status === 'CLOSED';

  return (
    <Stack direction="row" alignItems="center" spacing={1.25} sx={{ px: 2, py: 1, borderBottom: 1, borderColor: 'divider' }}>
      <Avatar src={session.user.avatar_url || undefined} sx={{ width: 32, height: 32, fontSize: 13 }}>
        {session.user.name?.[0]?.toUpperCase() || '?'}
      </Avatar>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 800 }} noWrap>
          {session.user.name}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap>
          {session.ticket_no}
          {session.user.phone ? ` · ${session.user.phone}` : ''}
        </Typography>
      </Box>

      {isResolved ? (
        <Button size="small" startIcon={<ReplayIcon />} disabled={busy} onClick={onReopen}>
          Re-open
        </Button>
      ) : (
        <Button
          size="small"
          color="success"
          startIcon={<CheckCircleIcon />}
          disabled={busy}
          onClick={() => setConfirmResolve(true)}
        >
          Resolve
        </Button>
      )}

      <TranscriptMenu onDownload={onDownload} onEmail={onEmail} busy={busy} />

      <ConfirmDialog
        open={confirmResolve}
        title="Mark this chat resolved?"
        message="The conversation will be closed and the user will be asked to leave feedback. You can re-open it later if needed."
        confirmLabel="Mark resolved"
        confirmColor="success"
        onConfirm={() => {
          setConfirmResolve(false);
          onResolve();
        }}
        onClose={() => setConfirmResolve(false)}
      />
    </Stack>
  );
}
