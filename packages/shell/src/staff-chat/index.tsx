import { useEffect, useState } from 'react';
import { Alert, Box } from '@mui/material';
import ChatBody from './ChatBody';
import ChatWindows from './ChatWindows';
import PanelHeader from './PanelHeader';
import { useCall } from './useCall';
import { useCallRecorder } from './useCallRecorder';
import { useChatSettings } from './useChatSettings';
import { useStaffChatData } from './useStaffChatData';
import type { Coworker, StaffMessage } from './queries';

interface Props {
  open: boolean;
  onClose: () => void;
  /**
   * Show the panel — a call arrived while it was closed.
   *
   * The panel stays MOUNTED whether or not it is on screen, because the socket
   * that carries an incoming call lives inside it: a chat that only listens
   * while its sidebar is open is a phone that only rings while you are holding
   * it.
   */
  onRequestOpen?: () => void;
  /** Your own id, so the conversation can tell your lines from theirs. */
  meId: string;
  /** Your own name, for the export's header. */
  meName?: string;
}

/**
 * Chat with a coworker.
 *
 * A docked panel, not a drawer: no backdrop, and the page beside it is pushed
 * rather than covered. The reason to message someone is almost always something
 * on the screen you are already looking at, so a chat that greys that screen out
 * is a chat you close before you can quote it.
 *
 * Reading and writing live in useStaffChatData; what is on screen lives here.
 */
export function StaffChatPanel({
  open,
  onClose,
  onRequestOpen,
  meId,
  meName,
}: Readonly<Props>) {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [role, setRole] = useState('');
  const [peer, setPeer] = useState<Coworker | null>(null);
  const [replyTo, setReplyTo] = useState<StaffMessage | null>(null);
  const [sharingWith, setSharingWith] = useState(false);
  const [playingRecording, setPlayingRecording] = useState<string | null>(null);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(id);
  }, [search]);

  const { settings, update: updateSettings, formats, spacing } = useChatSettings();
  const data = useStaffChatData({ open, peer, meId, meName, search: debounced, role });

  const call = useCall(data.socket, meId);
  const recorder = useCallRecorder({
    connected: call.phase === 'connected',
    localStream: call.localStream,
    remoteStream: call.remoteStream,
  });

  // A call arriving is a reason to show the panel. Only on the way IN: opening
  // it every render while ringing would fight anyone who closed it deliberately.
  const incoming = call.phase === 'incoming';
  useEffect(() => {
    if (incoming) onRequestOpen?.();
  }, [incoming, onRequestOpen]);

  /**
   * A finished recording belongs to the call it came from.
   *
   * Attached automatically rather than waiting for somebody to press "send to
   * chat": a recording nobody remembered to post is a recording nobody can
   * find. The call row in the thread then carries it, and the chat message is
   * an extra, not the only copy.
   */
  const readyUrl = recorder.stage === 'READY' ? recorder.url : null;
  const { lastCallId } = call;
  const { attachRecording, refetchCalls } = data;
  useEffect(() => {
    if (!readyUrl || !lastCallId) return;
    attachRecording({ variables: { callId: lastCallId, url: readyUrl } })
      .then(() => refetchCalls())
      .catch(() => undefined);
  }, [readyUrl, lastCallId, attachRecording, refetchCalls]);

  /** The call window is up for anything that is not "nothing happening". */
  const callWindowOpen =
    call.phase !== 'idle' || Boolean(call.error) || recorder.stage !== 'IDLE';

  /**
   * A recording being saved pins the panel open.
   *
   * The upload and the FFmpeg pass run in this component, so closing it while
   * either is in flight throws the recording away — and it would look exactly
   * like a successful close.
   */
  const busyStage = recorder.stage === 'UPLOADING' || recorder.stage === 'CONVERTING';

  return (
    <>
      <ChatWindows
        peer={peer}
        call={call}
        recorder={recorder}
        callOpen={callWindowOpen}
        sharing={sharingWith}
        onStopSharing={() => setSharingWith(false)}
        playingRecording={playingRecording}
        onClosePlayer={() => setPlayingRecording(null)}
        onSendRecording={(url) => {
          data.send('', { url, name: 'Call recording.mp4', type: 'video/mp4' });
          recorder.reset();
        }}
      />

      {open && (
        <Box
          sx={{
            width: { xs: '100%', sm: 380 },
            flexShrink: 0,
            borderLeft: 1,
            borderColor: 'divider',
            display: 'flex',
            flexDirection: 'column',
            // The shell pins itself to the viewport, so 100% here is the space
            // under the header and nothing more — which is what gives the
            // thread inside a scrollbar of its own.
            height: '100%',
            minHeight: 0,
            bgcolor: 'background.paper',
          }}
        >
          <PanelHeader
            settings={settings}
            onSettings={updateSettings}
            status={data.presence.mine}
            onStatus={data.presence.choose}
            busy={busyStage}
            onClose={onClose}
          />

          {data.error && (
            <Alert severity="error" onClose={() => data.setError(null)} sx={{ m: 1 }}>
              {data.error}
            </Alert>
          )}

          <ChatBody
            data={data}
            meId={meId}
            peer={peer}
            onOpenPeer={setPeer}
            search={search}
            onSearch={setSearch}
            role={role}
            onRole={setRole}
            settings={settings}
            formats={formats}
            spacing={spacing}
            replyTo={replyTo}
            onReplyTo={setReplyTo}
            onCall={(kind) => peer && call.call(peer.id, kind).catch(() => undefined)}
            onShareScreen={() => setSharingWith(true)}
            onPlayRecording={setPlayingRecording}
          />
        </Box>
      )}
    </>
  );
}
