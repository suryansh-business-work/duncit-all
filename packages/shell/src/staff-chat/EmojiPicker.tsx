import { useState } from 'react';
import { useTranslation } from '../i18n/useTranslation';
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
/** `titleKey` is a literal so the build gate can see it; `name` stays the
 *  stable English identifier the React key and the `:` search use — it is never
 *  rendered, so it is not copy. */
const GROUPS: Array<{ name: string; titleKey: string; emoji: string[] }> = [
  {
    name: 'Reactions',
    titleKey: 'shell.emoji.reactions',
    emoji: ['👍', '👎', '👌', '🙏', '👏', '🙌', '💪', '🤝', '❤️', '🔥', '🎉', '✨'],
  },
  {
    name: 'Faces',
    titleKey: 'shell.emoji.faces',
    emoji: ['😀', '😄', '😅', '😂', '🙂', '😉', '😍', '🤔', '😐', '😴', '😬', '😢', '😡', '🤯', '🥳', '😎'],
  },
  {
    name: 'Work',
    titleKey: 'shell.emoji.work',
    emoji: ['✅', '❌', '⚠️', '📌', '📎', '📝', '📅', '⏰', '🚀', '🐛', '🔧', '📊', '💡', '☕', '👀', '🆗'],
  },
];

/**
 * Names for the same set, so `:` can find them.
 *
 * Written out rather than derived: an emoji has no name a program can read, and
 * the words people actually type — "tick", "party", "shipit" — are not the ones
 * a Unicode table would give. Curated to match GROUPS above; anything not here
 * is still one paste away.
 */
export const EMOJI_SHORTCODES: Array<{ code: string; emoji: string }> = [
  { code: 'thumbsup', emoji: '👍' },
  { code: 'thumbsdown', emoji: '👎' },
  { code: 'ok', emoji: '👌' },
  { code: 'pray', emoji: '🙏' },
  { code: 'clap', emoji: '👏' },
  { code: 'muscle', emoji: '💪' },
  { code: 'handshake', emoji: '🤝' },
  { code: 'heart', emoji: '❤️' },
  { code: 'fire', emoji: '🔥' },
  { code: 'party', emoji: '🎉' },
  { code: 'sparkles', emoji: '✨' },
  { code: 'smile', emoji: '😄' },
  { code: 'sweat', emoji: '😅' },
  { code: 'laugh', emoji: '😂' },
  { code: 'wink', emoji: '😉' },
  { code: 'heart_eyes', emoji: '😍' },
  { code: 'thinking', emoji: '🤔' },
  { code: 'neutral', emoji: '😐' },
  { code: 'sleep', emoji: '😴' },
  { code: 'cry', emoji: '😢' },
  { code: 'angry', emoji: '😡' },
  { code: 'mindblown', emoji: '🤯' },
  { code: 'cool', emoji: '😎' },
  { code: 'tick', emoji: '✅' },
  { code: 'cross', emoji: '❌' },
  { code: 'warning', emoji: '⚠️' },
  { code: 'pin', emoji: '📌' },
  { code: 'note', emoji: '📝' },
  { code: 'calendar', emoji: '📅' },
  { code: 'clock', emoji: '⏰' },
  { code: 'shipit', emoji: '🚀' },
  { code: 'bug', emoji: '🐛' },
  { code: 'fix', emoji: '🔧' },
  { code: 'chart', emoji: '📊' },
  { code: 'idea', emoji: '💡' },
  { code: 'coffee', emoji: '☕' },
  { code: 'eyes', emoji: '👀' },
];

interface Props {
  /** Called with the chosen character — the composer decides where it lands. */
  onPick: (emoji: string) => void;
  disabled?: boolean;
}

/** The composer's emoji button and its popover. */
export default function EmojiPicker({ onPick, disabled }: Readonly<Props>) {
  const { t } = useTranslation();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  return (
    <>
      <Tooltip title={t('shell.chat.composer.emoji')}>
        <span>
          <IconButton
            size="small"
            disabled={disabled}
            onClick={(event) => setAnchor(event.currentTarget)}
            aria-label={t('shell.chat.composer.insertEmoji')}
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
            <Box key={group.name}>
              <Typography
                variant="caption"
                sx={{
                  color: "text.secondary",
                  fontWeight: 700,
                  display: 'block',
                  mb: 0.5
                }}>
                {t(group.titleKey)}
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
