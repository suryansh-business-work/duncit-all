import type { ReactNode } from 'react';
import { Avatar, Box, Stack, Typography } from '@mui/material';
import { alpha, useTheme, type Theme } from '@mui/material/styles';

export type BubbleTone = 'operator' | 'editor' | 'failed';

interface Props {
  tone: BubbleTone;
  text: string;
  /** Pictures sent with the message. */
  imageUrls?: readonly string[];
  /** The line under the words: the time, and anything the reply offers. */
  footer?: ReactNode;
  testId: string;
}

/** A tint strong enough to read as a bubble and weak enough to keep body text at AA contrast on it. */
function fill(theme: Theme, tone: BubbleTone): string {
  const strength = theme.palette.mode === 'dark' ? 0.28 : 0.1;
  if (tone === 'operator') return alpha(theme.palette.primary.main, strength);
  if (tone === 'failed') return alpha(theme.palette.error.main, strength);
  return theme.palette.action.hover;
}

/**
 * One message. The operator's requests sit on the right, the editor's replies
 * on the left; a reply that failed is tinted as an error and says so in words,
 * never by colour alone.
 */
export default function ChatBubble({ tone, text, imageUrls = [], footer, testId }: Readonly<Props>) {
  const theme = useTheme();
  const mine = tone === 'operator';

  return (
    <Box
      sx={{
        alignSelf: mine ? 'flex-end' : 'flex-start',
        maxWidth: '88%',
        px: 1.5,
        py: 1,
        borderRadius: 2.5,
        borderTopLeftRadius: mine ? 20 : 4,
        borderTopRightRadius: mine ? 4 : 20,
        bgcolor: fill(theme, tone),
      }}
      data-testid={testId}
    >
      {imageUrls.length > 0 && (
        <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5, mb: 0.75 }}>
          {imageUrls.map((url) => (
            <Avatar key={url} variant="rounded" src={url} alt="" sx={{ width: 56, height: 56 }} />
          ))}
        </Stack>
      )}
      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
        {text}
      </Typography>
      {footer}
    </Box>
  );
}
