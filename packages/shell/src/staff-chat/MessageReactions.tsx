import { useState } from 'react';
import { Box, Chip, IconButton, Popover, Stack, Tooltip } from '@mui/material';
import AddReactionOutlinedIcon from '@mui/icons-material/AddReactionOutlined';
import { QUICK_REACTIONS, type StaffReaction } from './queries';

/** Anything past the six, for when the six do not cover it. */
const MORE_EMOJI = [
  '🎉', '🔥', '👏', '🙏', '💯', '✅', '❌', '⚠️',
  '🤔', '👀', '🚀', '🐛', '☕', '🥳', '😴', '🤝',
];

interface Props {
  reactions: StaffReaction[];
  /** The reader, so their own reaction reads as pressed. */
  meId: string;
  /** Names for the tooltip — a count nobody can attribute is not much use. */
  nameOf: (userId: string) => string;
  onReact: (emoji: string) => void;
}

/** Group by emoji, keeping the order they were first used. */
function tally(reactions: StaffReaction[]) {
  const order: string[] = [];
  const byEmoji = new Map<string, string[]>();
  for (const reaction of reactions) {
    if (!byEmoji.has(reaction.emoji)) {
      byEmoji.set(reaction.emoji, []);
      order.push(reaction.emoji);
    }
    byEmoji.get(reaction.emoji)?.push(reaction.user_id);
  }
  return order.map((emoji) => ({ emoji, users: byEmoji.get(emoji) ?? [] }));
}

/**
 * The row under a message.
 *
 * Reactions that EXIST are always visible — they are part of what the thread
 * says — and each one names who left it on hover, because a bare count is a
 * number nobody can act on. The picker only appears on hover: six emoji under
 * every line of a quiet conversation is furniture.
 */
export default function MessageReactions({ reactions, meId, nameOf, onReact }: Readonly<Props>) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const groups = tally(reactions);

  return (
    <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 0.25, flexWrap: 'wrap' }}>
      {groups.map(({ emoji, users }) => (
        <Tooltip key={emoji} title={users.map(nameOf).join(', ')}>
          <Chip
            size="small"
            onClick={() => onReact(emoji)}
            variant={users.includes(meId) ? 'filled' : 'outlined'}
            color={users.includes(meId) ? 'primary' : 'default'}
            label={`${emoji} ${users.length}`}
            aria-label={`${emoji} from ${users.map(nameOf).join(', ')}`}
            aria-pressed={users.includes(meId)}
            sx={{ height: 22, fontSize: 12, '& .MuiChip-label': { px: 0.75 } }}
          />
        </Tooltip>
      ))}

      {/* Revealed by the bubble's hover rule, so a quiet thread stays quiet. */}
      <Box className="staff-reaction-picker" sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
        {QUICK_REACTIONS.map((emoji) => (
          <IconButton
            key={emoji}
            size="small"
            onClick={() => onReact(emoji)}
            aria-label={`React ${emoji}`}
            sx={{ p: 0.25, fontSize: 15, lineHeight: 1 }}
          >
            {emoji}
          </IconButton>
        ))}
        <Tooltip title="More">
          <IconButton
            size="small"
            onClick={(event) => setAnchor(event.currentTarget)}
            aria-label="More reactions"
            sx={{ p: 0.25 }}
          >
            <AddReactionOutlinedIcon sx={{ fontSize: 15 }} />
          </IconButton>
        </Tooltip>
      </Box>

      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Box sx={{ p: 1, display: 'flex', flexWrap: 'wrap', gap: 0.25, width: 216 }}>
          {MORE_EMOJI.map((emoji) => (
            <IconButton
              key={emoji}
              size="small"
              aria-label={`React ${emoji}`}
              onClick={() => {
                onReact(emoji);
                setAnchor(null);
              }}
              sx={{ fontSize: 17, width: 30, height: 30, borderRadius: 1 }}
            >
              {emoji}
            </IconButton>
          ))}
        </Box>
      </Popover>
    </Stack>
  );
}
