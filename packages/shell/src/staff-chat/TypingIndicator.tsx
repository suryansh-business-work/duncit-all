import { useEffect, useState } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { useTranslation } from '../i18n/useTranslation';

interface Props {
  /** When they last said they were typing, or 0. */
  at: number;
  name: string;
}

/** How long a keystroke keeps the bubble up. Keystrokes refresh it. */
const LINGER_MS = 4000;

const DOTS = ['first', 'second', 'third'];

/**
 * Three dots, while they are writing.
 *
 * Driven by a timestamp rather than a start/stop pair, because there is no stop
 * event to rely on: a tab closed mid-word would leave the other person typing
 * forever. The bubble simply expires, and every keystroke pushes it out again.
 */
export default function TypingIndicator({ at, name }: Readonly<Props>) {
  const { t } = useTranslation();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!at) return;
    // One timer per burst, set to the moment this bubble should disappear —
    // cheaper and steadier than polling the clock.
    const id = globalThis.setTimeout(() => setNow(Date.now()), LINGER_MS);
    setNow(Date.now());
    return () => globalThis.clearTimeout(id);
  }, [at]);

  if (!at || now - at > LINGER_MS) return null;

  return (
    <Stack
      direction="row"
      spacing={1}
      alignItems="center"
      aria-live="polite"
      sx={{ px: 1.5, pb: 0.5 }}
    >
      <Stack
        direction="row"
        spacing={0.5}
        sx={{
          px: 1,
          py: 0.75,
          borderRadius: 4,
          bgcolor: 'action.selected',
        }}
      >
        {DOTS.map((dot, index) => (
          <Box
            key={dot}
            sx={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              bgcolor: 'text.secondary',
              animation: 'staffTypingBounce 1.2s ease-in-out infinite',
              animationDelay: `${index * 0.18}s`,
              '@keyframes staffTypingBounce': {
                '0%, 60%, 100%': { transform: 'translateY(0)', opacity: 0.4 },
                '30%': { transform: 'translateY(-4px)', opacity: 1 },
              },
              '@media (prefers-reduced-motion: reduce)': { animation: 'none', opacity: 0.7 },
            }}
          />
        ))}
      </Stack>
      <Typography variant="caption" color="text.secondary">
        {t('shell.chat.thread.typing', { vars: { name } })}
      </Typography>
    </Stack>
  );
}
