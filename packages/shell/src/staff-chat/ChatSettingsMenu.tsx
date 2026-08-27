import { useRef } from 'react';
import { Popover, Tooltip } from '@mui/material';
import TuneIcon from '@mui/icons-material/Tune';
import { DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '../i18n/useTranslation';
import ChatSettingsBody from './ChatSettingsBody';
import type { ChatSettings } from './useChatSettings';

interface Props {
  settings: ChatSettings;
  onChange: <K extends keyof ChatSettings>(key: K, value: ChatSettings[K]) => void;
  /**
   * Controlled, because the conversation menu opens this too — the panel owns
   * whether it is showing and the button here only asks.
   */
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
}

/**
 * The way in to how this chat looks.
 *
 * Everything inside is a preference with an obvious default, so it hides
 * behind one icon rather than taking space from the conversation.
 */
export default function ChatSettingsMenu({
  settings,
  onChange,
  open,
  onOpen,
  onClose,
}: Readonly<Props>) {
  const { t } = useTranslation();
  // The button itself is the anchor, whoever asked for the popover. Recording
  // the click target instead left the conversation menu's route with no anchor
  // at all, and MUI answers that by pinning the panel to the top-left of the
  // VIEWPORT — settings opening in the far corner of the screen, nowhere near
  // the chat. This button is always mounted in the panel header, so it is an
  // anchor both routes can share.
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  return (
    <>
      <Tooltip title={t('shell.chat.settings.title')}>
        <DuncitIconButton
          ref={buttonRef}
          size="small"
          aria-label={t('shell.chat.settings.title')}
          onClick={onOpen}
        >
          <TuneIcon fontSize="small" />
        </DuncitIconButton>
      </Tooltip>
      <Popover
        open={open}
        anchorEl={buttonRef.current}
        onClose={onClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <ChatSettingsBody settings={settings} onChange={onChange} />
      </Popover>
    </>
  );
}
