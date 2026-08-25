import { useEffect, useRef, useState } from 'react';
import { useTranslation } from '../i18n/useTranslation';
import { useWorkspaceWindow } from '../workspace';
import ChatSidebar from './ChatSidebar';
import ChatWindows from './ChatWindows';
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
  /** Your own roles — SUPER_ADMIN may read a message's edit history. */
  meRoles?: string[];
}

/**
 * Chat with a coworker.
 *
 * A docked panel, not a drawer: no backdrop, and the page beside it is pushed
 * rather than covered — a chat that greys out the screen you wanted to quote
 * is a chat you close first.
 *
 * It stays MOUNTED whether or not it is showing, because the socket that
 * carries an incoming call lives inside it: a chat that only listens while its
 * sidebar is open is a phone that only rings while you hold it.
 *
 * Reading and writing live in useStaffChatData; what is on screen lives here.
 */
export function StaffChatPanel({
  open,
  onClose,
  onRequestOpen,
  meId,
  meName,
  meRoles = [],
}: Readonly<Props>) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [peer, setPeer] = useState<Coworker | null>(null);
  const [replyTo, setReplyTo] = useState<StaffMessage | null>(null);
  const [playingRecording, setPlayingRecording] = useState<string | null>(null);
  /** Owned here because two places open it — the header and a conversation. */
  const [settingsOpen, setSettingsOpen] = useState(false);

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

  const call = useCall(
    data.socket,
    meId,
    {
      micId: panel.micId,
      camId: panel.camId,
      micLabel: panel.micLabel,
      camLabel: panel.camLabel,
      onChoose: chat.setDevice,
    },
    data.iceServers
  );
  const recorder = useCallRecorder({
    connected: call.phase === 'connected',
    localStream: call.localStream,
    remoteStream: call.remoteStream,
  });

  /*
    A call arriving is a reason to show the panel — on the way IN, once.

    Held in a ref so the effect depends on the PHASE and nothing else. With the
    callback in the dependencies, a caller passing an inline arrow re-ran this
    on every render, and a phone that is still ringing would reopen the panel
    the instant anyone closed it. A hook should not be that easy for its caller
    to break by accident.
  */
  const requestOpen = useRef(onRequestOpen);
  requestOpen.current = onRequestOpen;
  const incoming = call.phase === 'incoming';
  useEffect(() => {
    if (incoming) requestOpen.current?.();
  }, [incoming]);

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

  /*
    The panel is a running window, so it belongs on the taskbar too.

    Minimising is not closing: the socket stays up, the conversation stays
    where it was, and the page beside it gets its full width back — which is
    the thing people actually want when they say the chat is in the way.
  */
  const taskbar = useWorkspaceWindow(
    open ? { id: 'staff-chat', title: t('shell.chat.panel.title'), icon: 'CHAT' } : null
  );

  return (
    <>
      <ChatWindows
        peer={peer}
        call={call}
        recorder={recorder}
        callOpen={callWindowOpen}
        playingRecording={playingRecording}
        onClosePlayer={() => setPlayingRecording(null)}
        onSendRecording={(url) => {
          data.send('', { url, name: 'Call recording.mp4', type: 'video/mp4' });
          recorder.reset();
        }}
      />

      {open && !taskbar.minimised && (
        <ChatSidebar
          data={data}
          meId={meId}
          peer={peer}
          onOpenPeer={openPeer}
          search={search}
          onSearch={setSearch}
          role={panel.role}
          onRole={chat.setRole}
          settings={settings}
          onSettingChange={updateSettings}
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
          onPlayRecording={setPlayingRecording}
          busy={busyStage}
          onClose={onClose}
          onMinimise={taskbar.docked ? taskbar.minimise : undefined}
          settingsOpen={settingsOpen}
          onOpenSettings={() => setSettingsOpen(true)}
          onCloseSettings={() => setSettingsOpen(false)}
          canSeeEditHistory={meRoles.includes('SUPER_ADMIN')}
        />
      )}
    </>
  );
}
