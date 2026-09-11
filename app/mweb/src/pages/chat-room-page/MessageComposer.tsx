import { InputAdornment, Stack, TextField, Tooltip } from '@mui/material';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions';
import { DuncitIconButton, DuncitRoundButton } from '@duncit/buttons';
import { useTranslation } from '../../i18n/useTranslation';
import { SEND_BUTTON_SX } from '../support-chat/calmStyles';

interface MessageComposerProps {
  text: string;
  setText: (v: string | ((p: string) => string)) => void;
  onSend: () => void;
  onOpenPicker: () => void;
  onOpenEmoji: (el: HTMLElement) => void;
}

export default function MessageComposer({
  text,
  setText,
  onSend,
  onOpenPicker,
  onOpenEmoji,
}: Readonly<MessageComposerProps>) {
  const { t } = useTranslation();
  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{
        alignItems: "center",
        px: { xs: 1.25, sm: 2 },
        py: 1,
        bgcolor: 'background.paper',
        borderTop: 1,
        borderColor: 'divider',
      }}>
      <Tooltip title={t('mweb.chatRoom.image')}>
        <DuncitRoundButton size="large" tone="surface" onClick={onOpenPicker}>
          <ImageOutlinedIcon />
        </DuncitRoundButton>
      </Tooltip>
      <TextField
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t('mweb.common.typeAMessage')}
        fullWidth
        size="small"
        multiline
        maxRows={4}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSend();
          }
        }}
        slotProps={{
          input: {
            sx: { borderRadius: '22px', bgcolor: 'action.hover', minHeight: 44, '& fieldset': { border: 0 } },
            endAdornment: (
              <InputAdornment position="end">
                <DuncitIconButton size="small" onClick={(e) => onOpenEmoji(e.currentTarget)}>
                  <EmojiEmotionsIcon fontSize="small" />
                </DuncitIconButton>
              </InputAdornment>
            ),
          }
        }}
      />
      <DuncitRoundButton size="large" aria-label={t('mweb.common.sendMessage')} onClick={onSend} disabled={!text.trim()} sx={SEND_BUTTON_SX}>
        <SendRoundedIcon />
      </DuncitRoundButton>
    </Stack>
  );
}
