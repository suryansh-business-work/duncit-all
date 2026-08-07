import { Box, Chip, IconButton, Stack, Tooltip } from '@mui/material';
import ThumbUpOffAltIcon from '@mui/icons-material/ThumbUpOffAlt';
import ThumbDownOffAltIcon from '@mui/icons-material/ThumbDownOffAlt';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import type { StaffReaction, StaffReactionKind } from './queries';

/** The three, in the order they read: agreed, disagreed, appreciated. */
export const REACTIONS: Array<{
  kind: StaffReactionKind;
  label: string;
  glyph: string;
  Icon: typeof ThumbUpOffAltIcon;
}> = [
  { kind: 'THUMBS_UP', label: 'Agree', glyph: '👍', Icon: ThumbUpOffAltIcon },
  { kind: 'THUMBS_DOWN', label: 'Disagree', glyph: '👎', Icon: ThumbDownOffAltIcon },
  { kind: 'HEART', label: 'Love it', glyph: '❤️', Icon: FavoriteBorderIcon },
];

interface Props {
  reactions: StaffReaction[];
  /** The reader, so their own reaction reads as pressed. */
  meId: string;
  onReact: (kind: StaffReactionKind) => void;
}

/**
 * The row under a message.
 *
 * Reactions that EXIST are always visible — they are part of what the thread
 * says. The three pick buttons only appear on hover, because three icons under
 * every line of a conversation is furniture, and a quiet thread should look
 * quiet.
 */
export default function MessageReactions({ reactions, meId, onReact }: Readonly<Props>) {
  const countOf = (kind: StaffReactionKind) => reactions.filter((r) => r.kind === kind).length;
  const mineIs = (kind: StaffReactionKind) =>
    reactions.some((r) => r.kind === kind && r.user_id === meId);

  return (
    <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 0.25, flexWrap: 'wrap' }}>
      {REACTIONS.filter((r) => countOf(r.kind) > 0).map((reaction) => (
        <Chip
          key={reaction.kind}
          size="small"
          onClick={() => onReact(reaction.kind)}
          variant={mineIs(reaction.kind) ? 'filled' : 'outlined'}
          color={mineIs(reaction.kind) ? 'primary' : 'default'}
          label={`${reaction.glyph} ${countOf(reaction.kind)}`}
          aria-label={`${reaction.label} — ${countOf(reaction.kind)}`}
          aria-pressed={mineIs(reaction.kind)}
          sx={{ height: 22, fontSize: 12, '& .MuiChip-label': { px: 0.75 } }}
        />
      ))}

      {/* Revealed by the bubble's hover rule, so a quiet thread stays quiet. */}
      <Box className="staff-reaction-picker" sx={{ display: 'flex', gap: 0.25 }}>
        {REACTIONS.map((reaction) => (
          <Tooltip key={reaction.kind} title={reaction.label}>
            <IconButton
              size="small"
              color="inherit"
              onClick={() => onReact(reaction.kind)}
              aria-label={reaction.label}
              aria-pressed={mineIs(reaction.kind)}
              sx={{ opacity: mineIs(reaction.kind) ? 1 : 0.55, p: 0.25 }}
            >
              <reaction.Icon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
        ))}
      </Box>
    </Stack>
  );
}
