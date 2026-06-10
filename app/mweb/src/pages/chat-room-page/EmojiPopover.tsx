import { Box, Popover, Stack } from '@mui/material';
import { EMOJIS } from './queries';

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
  return (
    <Popover
      open={!!anchorEl}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
      transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
    >
      <Stack direction="row" spacing={0.5} sx={{ p: 1, fontSize }}>
        {EMOJIS.map((e) => (
          <Box key={e} sx={{ cursor: 'pointer', px: 0.5 }} onClick={() => onSelect(e)}>
            {e}
          </Box>
        ))}
      </Stack>
    </Popover>
  );
}
