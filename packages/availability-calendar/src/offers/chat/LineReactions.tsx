import { useState } from 'react';
import { ButtonBase, Chip, IconButton, Popover, Stack } from '@mui/material';
import AddReactionOutlinedIcon from '@mui/icons-material/AddReactionOutlined';
import { useTranslation } from '@duncit/app-settings';
import { CHAT_EMOJIS, reactionGroups } from '@duncit/utils';

interface Props {
  reactions: readonly { user_id: string; emoji: string }[] | null | undefined;
  /** The reader, so their own reactions show as theirs. */
  viewerId: string | null | undefined;
  /** Adds the reader's reaction, or takes it back; left out (staff), the chips are a record only. */
  onReact?: (emoji: string) => unknown;
  /** Lines up under a line drawn on the right (the reader's own). */
  alignEnd?: boolean;
}

/**
 * A line's reactions as one chip per emoji — how many, the reader's own
 * highlighted, a tap toggling theirs — and a button that opens the quick emoji
 * every chat offers. Shared by the offer cards and the Partners bubbles.
 */
export default function LineReactions({ reactions, viewerId, onReact, alignEnd = false }: Readonly<Props>) {
  const { t } = useTranslation();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const groups = reactionGroups(reactions, viewerId);
  if (!onReact && groups.length === 0) return null;
  const react = (emoji: string, handler: (emoji: string) => unknown) => {
    setAnchor(null);
    handler(emoji);
  };

  return (
    <Stack
      direction="row"
      spacing={0.5}
      useFlexGap
      sx={{ flexWrap: 'wrap', alignItems: 'center', justifyContent: alignEnd ? 'flex-end' : 'flex-start' }}
      data-testid="line-reactions"
    >
      {groups.map((group) => (
        <Chip
          key={group.emoji}
          size="small"
          variant={group.mine ? 'filled' : 'outlined'}
          color={group.mine ? 'primary' : 'default'}
          label={t('availability.offers.chat.reactionCount', { vars: { emoji: group.emoji, count: group.count } })}
          onClick={onReact ? () => react(group.emoji, onReact) : undefined}
          data-testid={`line-reaction-${group.emoji}`}
        />
      ))}
      {onReact && (
        <>
          <IconButton size="small" aria-label={t('availability.offers.chat.react')} onClick={(e) => setAnchor(e.currentTarget)} data-testid="line-react">
            <AddReactionOutlinedIcon fontSize="small" />
          </IconButton>
          <Popover open={!!anchor} anchorEl={anchor} onClose={() => setAnchor(null)} anchorOrigin={{ vertical: 'top', horizontal: 'left' }}>
            <Stack direction="row" spacing={0.5} sx={{ p: 1, fontSize: 22 }}>
              {CHAT_EMOJIS.map((emoji) => (
                <ButtonBase
                  key={emoji}
                  aria-label={t('availability.offers.chat.reactWith', { vars: { emoji } })}
                  onClick={() => react(emoji, onReact)}
                  sx={{ minWidth: 36, minHeight: 36, borderRadius: 1, font: 'inherit' }}
                  data-testid={`line-react-${emoji}`}
                >
                  {emoji}
                </ButtonBase>
              ))}
            </Stack>
          </Popover>
        </>
      )}
    </Stack>
  );
}
