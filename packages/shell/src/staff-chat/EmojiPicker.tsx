import { useState } from 'react';
import { Box, IconButton, Popover, Stack, Tooltip, Typography } from '@mui/material';
import SentimentSatisfiedAltIcon from '@mui/icons-material/SentimentSatisfiedAlt';

/**
 * A short, hand-picked set rather than a dependency.
 *
 * A full picker is a megabyte of sprite sheets and a search index to solve a
 * problem nobody in a work chat has: the emoji people actually send are the
 * same three dozen every day, and anything else they can paste. No new package
 * on seventeen portal bundles for that.
 */
const GROUPS: Array<{ title: string; emoji: string[] }> = [
  {
    title: 'Reactions',
    emoji: ['👍', '👎', '👌', '🙏', '👏', '🙌', '💪', '🤝', '❤️', '🔥', '🎉', '✨'],
  },
  {
    title: 'Faces',
    emoji: ['😀', '😄', '😅', '😂', '🙂', '😉', '😍', '🤔', '😐', '😴', '😬', '😢', '😡', '🤯', '🥳', '😎'],
  },
  {
    title: 'Work',
    emoji: ['✅', '❌', '⚠️', '📌', '📎', '📝', '📅', '⏰', '🚀', '🐛', '🔧', '📊', '💡', '☕', '👀', '🆗'],
  },
];

interface Props {
  /** Called with the chosen character — the composer decides where it lands. */
  onPick: (emoji: string) => void;
  disabled?: boolean;
}

/** The composer's emoji button and its popover. */
export default function EmojiPicker({ onPick, disabled }: Readonly<Props>) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  return (
    <>
      <Tooltip title="Emoji">
        <span>
          <IconButton
            size="small"
            disabled={disabled}
            onClick={(event) => setAnchor(event.currentTarget)}
            aria-label="Insert emoji"
          >
            <SentimentSatisfiedAltIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Stack spacing={1} sx={{ p: 1.25, width: 268 }}>
          {GROUPS.map((group) => (
            <Box key={group.title}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}
              >
                {group.title}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.25 }}>
                {group.emoji.map((emoji) => (
                  <IconButton
                    key={emoji}
                    size="small"
                    aria-label={emoji}
                    onClick={() => {
                      onPick(emoji);
                      // Closes on pick and puts the caret back in the box —
                      // the next thing after an emoji is almost always typing.
                      setAnchor(null);
                    }}
                    sx={{ fontSize: 18, width: 30, height: 30, borderRadius: 1 }}
                  >
                    {emoji}
                  </IconButton>
                ))}
              </Box>
            </Box>
          ))}
        </Stack>
      </Popover>
    </>
  );
}
