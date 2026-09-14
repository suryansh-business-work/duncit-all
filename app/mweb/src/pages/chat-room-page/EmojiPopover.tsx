import { ButtonBase, Popover, Stack } from '@mui/material';
import { EMOJIS } from './queries';
import { useTranslation } from '../../i18n/useTranslation';

interface EmojiPopoverProps {
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onSelect: (emoji: string) => void;
  fontSize?: number;
}

export default function EmojiPopover({
  anchorEl,
  onClose,
  onSelect,
  fontSize = 24,
}: Readonly<EmojiPopoverProps>) {
  const { t } = useTranslation();
  return (
    <Popover
      open={!!anchorEl}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
      transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
    >
      <Stack direction="row" spacing={0.5} sx={{ p: 1, fontSize }} data-testid="emoji-bar">
        {EMOJIS.map((e) => (
          <ButtonBase
            key={e}
            data-testid={`emoji-${e}`}
            aria-label={`${t('mweb.chat.emoji')} ${e}`}
            sx={{ px: 0.5, minWidth: 32, minHeight: 32, borderRadius: '8px', font: 'inherit' }}
            onClick={() => onSelect(e)}
          >
            {e}
          </ButtonBase>
        ))}
      </Stack>
    </Popover>
  );
}
