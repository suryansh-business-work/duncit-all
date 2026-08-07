import { useState } from 'react';
import { IconButton, Popover, Tooltip } from '@mui/material';
import TuneIcon from '@mui/icons-material/Tune';
import { useTranslation } from '../i18n/useTranslation';
import ChatSettingsBody from './ChatSettingsBody';
import type { ChatSettings } from './useChatSettings';

interface Props {
  settings: ChatSettings;
  onChange: <K extends keyof ChatSettings>(key: K, value: ChatSettings[K]) => void;
  /**
   * Controlled, because the conversation menu opens this too.
   *
   * A Popover needs an anchor element, which an item in a different menu does
   * not have — so the panel owns whether it is showing and the button here
   * only asks.
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
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  return (
    <>
      <Tooltip title={t('shell.chat.settings.title')}>
        <IconButton
          size="small"
          aria-label={t('shell.chat.settings.title')}
          onClick={(event) => {
            setAnchor(event.currentTarget);
            onOpen();
          }}
        >
          <TuneIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Popover
        open={open}
        // Anchored to the button when it was pressed; to the panel corner when
        // the conversation menu asked and there is no button involved.
        anchorEl={anchor}
        anchorReference={anchor ? 'anchorEl' : 'none'}
        onClose={onClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <ChatSettingsBody settings={settings} onChange={onChange} />
      </Popover>
    </>
  );
}
