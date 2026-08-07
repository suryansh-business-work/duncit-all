import { Alert, Box } from '@mui/material';
import ChatBody from './ChatBody';
import PanelHeader from './PanelHeader';
import type { Coworker, StaffMessage } from './queries';
import type { ChatFormats, ChatSettings } from './useChatSettings';
import type { useStaffChatData } from './useStaffChatData';

/**
 * Full width on a phone, a fixed column beside the page on anything wider.
 *
 * The shell pins itself to the viewport, so 100% height is the space under the
 * header — which is what gives the thread inside its own scrollbar.
 */
const PANEL_SX = {
  width: { xs: '100%', sm: 380 },
  flexShrink: 0,
  borderLeft: 1,
  borderColor: 'divider',
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  minHeight: 0,
  bgcolor: 'background.paper',
} as const;

interface Props {
  data: ReturnType<typeof useStaffChatData>;
  meId: string;
  peer: Coworker | null;
  onOpenPeer: (peer: Coworker | null) => void;
  search: string;
  onSearch: (value: string) => void;
  role: string;
  onRole: (value: string) => void;
  settings: ChatSettings;
  onSettingChange: <K extends keyof ChatSettings>(key: K, value: ChatSettings[K]) => void;
  formats: ChatFormats;
  spacing: number;
  replyTo: StaffMessage | null;
  onReplyTo: (message: StaffMessage | null) => void;
  onCall: (kind: 'AUDIO' | 'VIDEO') => void;
  onPlayRecording: (url: string) => void;
  /** True while a recording is still uploading or converting. */
  busy: boolean;
  onClose: () => void;
  settingsOpen: boolean;
  onOpenSettings: () => void;
  onCloseSettings: () => void;
  canSeeEditHistory: boolean;
}

/** The docked panel itself: its own header, its errors, and its middle. */
export default function ChatSidebar({
  data,
  meId,
  peer,
  onOpenPeer,
  search,
  onSearch,
  role,
  onRole,
  settings,
  onSettingChange,
  formats,
  spacing,
  replyTo,
  onReplyTo,
  onCall,
  onPlayRecording,
  busy,
  onClose,
  settingsOpen,
  onOpenSettings,
  onCloseSettings,
  canSeeEditHistory,
}: Readonly<Props>) {
  return (
    <Box sx={PANEL_SX}>
      <PanelHeader
        settings={settings}
        onSettings={onSettingChange}
        status={data.presence.mine}
        onStatus={data.presence.choose}
        busy={busy}
        onClose={onClose}
        settingsOpen={settingsOpen}
        onOpenSettings={onOpenSettings}
        onCloseSettings={onCloseSettings}
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
        onOpenPeer={onOpenPeer}
        search={search}
        onSearch={onSearch}
        role={role}
        onRole={onRole}
        settings={settings}
        formats={formats}
        spacing={spacing}
        replyTo={replyTo}
        onReplyTo={onReplyTo}
        onCall={onCall}
        onPlayRecording={onPlayRecording}
        onSettings={onOpenSettings}
        canSeeEditHistory={canSeeEditHistory}
      />
    </Box>
  );
}
