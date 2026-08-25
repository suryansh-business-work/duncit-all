import { IconButton, InputAdornment, Stack, TextField, Tooltip } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import ImageIcon from '@mui/icons-material/Image';
import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions';
import { useTranslation } from '../../i18n/useTranslation';

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
        bgcolor: 'transparent'
      }}>
      <Tooltip title={t('mweb.chatRoom.image')}>
        <IconButton onClick={onOpenPicker} sx={{ bgcolor: 'action.hover' }}>
          <ImageIcon />
        </IconButton>
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
            sx: { borderRadius: 999, bgcolor: 'background.paper', boxShadow: '0 10px 28px rgba(9,7,18,0.14)' },
            endAdornment: (
              <InputAdornment position="end">
                <IconButton size="small" onClick={(e) => onOpenEmoji(e.currentTarget)}>
                  <EmojiEmotionsIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ),
          }
        }}
      />
      <IconButton color="primary" onClick={onSend} disabled={!text.trim()} sx={{ width: 46, height: 46, bgcolor: 'primary.main', color: 'primary.contrastText', '&:hover': { bgcolor: 'primary.dark' }, '&.Mui-disabled': { bgcolor: 'action.disabledBackground' } }}>
        <SendIcon />
      </IconButton>
    </Stack>
  );
}
