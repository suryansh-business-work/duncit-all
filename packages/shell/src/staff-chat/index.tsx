import { useEffect, useState } from 'react';
import { Alert, Box } from '@mui/material';
import ChatBody from './ChatBody';
import ChatWindows from './ChatWindows';
import PanelHeader from './PanelHeader';
import { useCall } from './useCall';
import { useCallRecorder } from './useCallRecorder';
import { useChatState } from './useChatState';
import { usePanelRestore } from './usePanelRestore';
import { useRecordingAttach } from './useRecordingAttach';
import { useStaffChatData } from './useStaffChatData';
import type { Coworker, StaffMessage } from './queries';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Show the panel — a call arrived, or it was open when they last left. */
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
 * on the screen you are already looking at, so a chat that greys that screen
 * out is a chat you close before you can quote it.
 *
 * It stays MOUNTED whether or not it is showing, because the socket that
 * carries an incoming call lives inside it — a chat that only listens while its
 * sidebar is open is a phone that only rings while you are holding it.
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
  const [peer, setPeer] = useState<Coworker | null>(null);
  const [replyTo, setReplyTo] = useState<StaffMessage | null>(null);
  const [sharingWith, setSharingWith] = useState(false);
  const [playingRecording, setPlayingRecording] = useState<string | null>(null);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(id);
  }, [search]);

  const chat = useChatState();
  const { settings, update: updateSettings, formats, spacing, panel } = chat;
  const data = useStaffChatData({
    open,
    peer,
    meId,
    meName,
    search: debounced,
    role: panel.role,
  });

  usePanelRestore({
    ready: chat.ready,
    wasOpen: panel.panelOpen,
    savedPeerId: panel.openPeerId,
    open,
    peer,
    threads: data.threads,
    coworkers: data.coworkers,
    onRequestOpen,
    // Restoring is not a change worth saving — it IS the saved value.
    onPeer: setPeer,
    onPanelOpen: chat.setPanelOpen,
  });

  /** Opening or leaving a conversation is state worth keeping. */
  const openPeer = (next: Coworker | null) => {
    setPeer(next);
    chat.setOpenPeerId(next?.id ?? null);
  };

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

  useRecordingAttach({
    readyUrl: recorder.stage === 'READY' ? recorder.url : null,
    callId: call.lastCallId,
    attach: data.attachRecording,
    onAttached: data.refetchCalls,
  });

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
            onOpenPeer={openPeer}
            search={search}
            onSearch={setSearch}
            role={panel.role}
            onRole={chat.setRole}
            settings={settings}
            formats={formats}
            spacing={spacing}
            replyTo={replyTo}
            onReplyTo={setReplyTo}
            onCall={(kind) => {
              if (!peer) return;
              // The window reads this while it rings, before any answer.
              call.setPeerName(peer.name);
              call.call(peer.id, kind).catch(() => undefined);
            }}
            onShareScreen={() => setSharingWith(true)}
            onPlayRecording={setPlayingRecording}
          />
        </Box>
      )}
    </>
  );
}
