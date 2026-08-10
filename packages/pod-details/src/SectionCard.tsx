import type { ReactNode } from 'react';
import { Alert, Box, Card, CardContent, Divider, LinearProgress, Stack, Typography } from '@mui/material';
import { alpha, type SxProps, type Theme } from '@mui/material/styles';
import { mergeSx } from '@duncit/ui';

type Tone = 'primary' | 'success' | 'warning' | 'info';

export interface SectionCardProps {
  icon: ReactNode;
  title: string;
  /** Count or short qualifier shown right after the title. */
  badge?: ReactNode;
  /** Right-aligned control — a button, a link out. */
  action?: ReactNode;
  tone?: Tone;
  /** A slim bar under the header, so a refresh does not resize the card. */
  loading?: boolean;
  error?: string | null;
  /** Shown centred, in place of the body, when there is nothing yet. */
  empty?: string | null;
  children?: ReactNode;
  sx?: SxProps<Theme>;
  /** Tables bring their own padding; pass `{ p: 0 }` for those. */
  contentSx?: SxProps<Theme>;
}

/**
 * The one card shell every section of the pod page uses.
 *
 * Nine sections used to hand-roll this header — each with its own icon colour,
 * its own bottom margin, its own divider and its own idea of what "empty" looks
 * like — which is why the page never quite lined up. One component means one
 * baseline for the title row, one gap under the divider, and one blank state.
 */
export default function SectionCard({
  icon,
  title,
  badge,
  action,
  tone = 'primary',
  loading = false,
  error,
  empty,
  children,
  sx,
  contentSx,
}: Readonly<SectionCardProps>) {
  const body = () => {
    if (error) return <Alert severity="error">{error}</Alert>;
    if (empty) return <SectionEmpty text={empty} />;
    return children;
  };

  return (
    <Card variant="outlined" sx={mergeSx({ borderRadius: 3, overflow: 'hidden' }, sx)}>
      <Stack
        direction="row"
        alignItems="center"
        spacing={1.25}
        sx={{ px: 2.5, py: 1.75, minHeight: 64 }}
      >
        <Box
          sx={{
            width: 34,
            height: 34,
            flexShrink: 0,
            borderRadius: 1.5,
            display: 'grid',
            placeItems: 'center',
            color: `${tone}.main`,
            bgcolor: (t) => alpha(t.palette[tone].main, 0.12),
          }}
        >
          {icon}
        </Box>
        <Typography variant="subtitle1" fontWeight={900} noWrap sx={{ minWidth: 0 }}>
          {title}
        </Typography>
        {badge != null && (
          <Typography variant="body2" color="text.secondary" fontWeight={700}>
            {badge}
          </Typography>
        )}
        {/* Pushes the action to the right whether or not a badge is present. */}
        <Box sx={{ flex: 1 }} />
        {action}
      </Stack>
      {/* The bar sits ON the divider, so an in-flight refresh never nudges the
          content down by a pixel. */}
      <Box sx={{ position: 'relative' }}>
        <Divider />
        {loading && (
          <LinearProgress sx={{ position: 'absolute', inset: 'auto 0 0 0', height: 2 }} />
        )}
      </Box>
      <CardContent sx={mergeSx({ p: 2.5, '&:last-child': { pb: 2.5 } }, contentSx)}>
        {body()}
      </CardContent>
    </Card>
  );
}

/**
 * Nothing here yet. Centred and given room on purpose — a one-line grey
 * sentence hugging the top-left corner of a tall card reads as a page that
 * failed to load, not as a pod nobody has paid for.
 */
export function SectionEmpty({ text }: Readonly<{ text: string }>) {
  return (
    <Stack alignItems="center" justifyContent="center" sx={{ py: 4, px: 2 }}>
      <Typography variant="body2" color="text.secondary" textAlign="center">
        {text}
      </Typography>
    </Stack>
  );
}
