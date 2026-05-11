import { IconButton, InputAdornment, Stack, TextField, Tooltip } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import ImageIcon from '@mui/icons-material/Image';
import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions';

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
}: MessageComposerProps) {
  return (
    <Stack
      direction="row"
      spacing={1}
      alignItems="center"
      sx={{ p: 1, borderTop: 1, borderColor: 'divider', bgcolor: 'background.paper' }}
    >
      <Tooltip title="Image">
        <IconButton onClick={onOpenPicker}>
          <ImageIcon />
        </IconButton>
      </Tooltip>
      <TextField
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type a message"
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
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton size="small" onClick={(e) => onOpenEmoji(e.currentTarget)}>
                <EmojiEmotionsIcon fontSize="small" />
              </IconButton>
            </InputAdornment>
          ),
        }}
      />
      <IconButton color="primary" onClick={onSend} disabled={!text.trim()}>
        <SendIcon />
      </IconButton>
    </Stack>
  );
}
