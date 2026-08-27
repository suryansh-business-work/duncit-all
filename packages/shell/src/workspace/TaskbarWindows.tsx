import { Stack, Tooltip } from '@mui/material';
import CallIcon from '@mui/icons-material/Call';
import ChatBubbleOutlinedIcon from '@mui/icons-material/ChatBubbleOutlined';
import WebAssetIcon from '@mui/icons-material/WebAsset';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '../i18n/useTranslation';
import { useWorkspace, type WindowIcon, type WorkspaceWindow } from './context';

/** Icon key to the icon itself — the registry stores keys, not elements. */
const ICONS: Record<WindowIcon, typeof WebAssetIcon> = {
  CALL: CallIcon,
  CHAT: ChatBubbleOutlinedIcon,
  WINDOW: WebAssetIcon,
};

interface ButtonProps {
  window: WorkspaceWindow;
  minimised: boolean;
  onToggle: (id: string) => void;
}

/**
 * One running thing, drawn the way a desktop taskbar draws it: raised while it
 * is on screen, flat while it is rolled up, and a click toggles between the two.
 */
function TaskbarWindowButton({ window, minimised, onToggle }: Readonly<ButtonProps>) {
  const { t } = useTranslation();
  const Icon = ICONS[window.icon];
  const action = minimised ? 'shell.taskbar.restore' : 'shell.taskbar.minimise';
  const label = t(action, { vars: { name: window.title } });

  return (
    <Tooltip title={window.subtitle ? `${window.title} · ${window.subtitle}` : window.title}>
      <DuncitButton
        size="small"
        color="inherit"
        aria-label={label}
        aria-pressed={!minimised}
        onClick={() => onToggle(window.id)}
        startIcon={<Icon fontSize="small" />}
        sx={{
          maxWidth: 200,
          minWidth: 0,
          textTransform: 'none',
          fontWeight: minimised ? 400 : 700,
          bgcolor: minimised ? 'transparent' : 'action.selected',
          // The line under a live window, the way every taskbar marks one.
          borderBottom: 2,
          borderColor: minimised ? 'transparent' : 'primary.main',
          borderRadius: 1,
          py: 0.25,
          '& .MuiButton-startIcon': { mr: 0.5 },
        }}
      >
        <span
          style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        >
          {window.title}
        </span>
      </DuncitButton>
    </Tooltip>
  );
}

/**
 * Everything the shell has running, along the bottom of the console.
 *
 * A call and the chat panel both outlive the page under them, and until there
 * was a bar to put them on, "minimise" meant rolling a window up to its own
 * title bar in the middle of the screen — in the way, and easy to lose.
 */
export function TaskbarWindows() {
  const workspace = useWorkspace();
  if (!workspace || workspace.windows.length === 0) return null;

  return (
    <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', minWidth: 0, flex: 1 }}>
      {workspace.windows.map((entry) => (
        <TaskbarWindowButton
          key={entry.id}
          window={entry}
          minimised={workspace.isMinimised(entry.id)}
          onToggle={(id) => workspace.setMinimised(id, !workspace.isMinimised(id))}
        />
      ))}
    </Stack>
  );
}
