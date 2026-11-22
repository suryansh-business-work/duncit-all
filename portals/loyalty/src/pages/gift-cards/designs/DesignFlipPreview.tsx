import { useState } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import FlipIcon from '@mui/icons-material/Flip';
import ImageIcon from '@mui/icons-material/Image';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';

interface Props {
  front: string;
  back: string;
  /** Drawn smaller in a table row, with no flip control. */
  compact?: boolean;
}

/** The card's proportions — the same 1.6:1 mWeb and the app draw it at. */
const RATIO = '1.6 / 1';
const FLIP_MS = 600;

function Face({ url, label, back }: Readonly<{ url: string; label: string; back?: boolean }>) {
  return (
    <Box
      sx={{
        position: 'absolute',
        inset: 0,
        borderRadius: 2,
        overflow: 'hidden',
        backfaceVisibility: 'hidden',
        transform: back ? 'rotateY(180deg)' : 'none',
        border: 1,
        borderColor: 'divider',
        bgcolor: 'action.hover',
        display: 'grid',
        placeItems: 'center',
      }}
    >
      {url ? (
        <Box component="img" src={url} alt={label} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <Stack spacing={0.5} sx={{ alignItems: 'center', color: 'text.secondary' }}>
          <ImageIcon />
          <Typography variant="caption">{label}</Typography>
        </Stack>
      )}
    </Box>
  );
}

/**
 * The live preview of a design: the front, and the back one flip away — what a
 * member sees on the buy page. Empty faces say which side is still missing.
 */
export default function DesignFlipPreview({ front, back, compact = false }: Readonly<Props>) {
  const { t } = useTranslation();
  const [flipped, setFlipped] = useState(false);
  const frontLabel = t('loyalty.designs.frontLabel');
  const backLabel = t('loyalty.designs.backLabel');

  return (
    <Stack spacing={1} sx={{ alignItems: 'center', width: '100%' }}>
      <Box sx={{ width: '100%', maxWidth: compact ? 96 : 360, aspectRatio: RATIO, perspective: '1200px' }}>
        <Box
          data-testid="design-preview-card"
          data-flipped={flipped ? 'true' : 'false'}
          sx={{
            position: 'relative',
            width: '100%',
            height: '100%',
            transformStyle: 'preserve-3d',
            transition: (theme) => theme.transitions.create('transform', { duration: FLIP_MS }),
            transform: flipped ? 'rotateY(180deg)' : 'none',
            '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
          }}
        >
          <Face url={front} label={frontLabel} />
          <Face url={back} label={backLabel} back />
        </Box>
      </Box>
      {!compact && (
        <DuncitButton
          size="small"
          variant="outlined"
          startIcon={<FlipIcon />}
          onClick={() => setFlipped((v) => !v)}
          aria-pressed={flipped}
          data-testid="design-preview-flip"
        >
          {flipped ? t('loyalty.designs.showFront') : t('loyalty.designs.showBack')}
        </DuncitButton>
      )}
    </Stack>
  );
}
