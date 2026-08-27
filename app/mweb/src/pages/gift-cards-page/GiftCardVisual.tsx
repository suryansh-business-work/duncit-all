import { useState } from 'react';
import { Box } from '@mui/material';
import FlipIcon from '@mui/icons-material/Flip';
import { DuncitIconButton } from '@duncit/buttons';
import { canFlipGiftCard, giftCardArtwork } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';
import GiftCardFace from './GiftCardFace';
import type { GiftCardScopeType } from './queries';

interface GiftCardVisualProps {
  scopeType: GiftCardScopeType;
  scopeCategoryId: string | null;
  /** Snapshot name — empty for SHOP cards, which localize their own title. */
  scopeName: string;
  scopeImageUrl: string;
  /** Admin-uploaded card faces; empty on both keeps the gradient card flat. */
  artworkFrontUrl?: string;
  artworkBackUrl?: string;
  amount: number;
  currencySymbol: string;
  /** Shown on owned cards only — a shared preview never prints a code. */
  code?: string;
  /** Dense variant for the theme picker's option tiles. Never flips: the tile
   * is itself a button, so a second control inside it would fight the tap. */
  compact?: boolean;
}

const COMPACT_HEIGHT = 118;
const FULL_HEIGHT = 172;
/** Long enough to read as a card turning over, short enough not to be in the way. */
const FLIP_MS = 600;

/**
 * THE gift card — the one visual every surface of the feature renders. Without
 * artwork it is the gradient card it has always been; once a category ships a
 * front or a back image, the same card gains a real flip between its two faces.
 */
export default function GiftCardVisual({
  scopeType,
  scopeCategoryId,
  scopeName,
  scopeImageUrl,
  artworkFrontUrl,
  artworkBackUrl,
  amount,
  currencySymbol,
  code,
  compact = false,
}: Readonly<GiftCardVisualProps>) {
  const { t } = useTranslation();
  const [flipped, setFlipped] = useState(false);
  const artwork = giftCardArtwork(artworkFrontUrl, artworkBackUrl);
  const canFlip = !compact && canFlipGiftCard(artwork);
  const height = compact ? COMPACT_HEIGHT : FULL_HEIGHT;

  const faceProps = {
    scopeType,
    scopeCategoryId,
    scopeName,
    scopeImageUrl,
    amount,
    currencySymbol,
    code,
    compact,
  };

  return (
    <Box sx={{ position: 'relative', width: '100%', height, perspective: '1200px' }}>
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          height: '100%',
          transformStyle: 'preserve-3d',
          transition: `transform ${FLIP_MS}ms`,
          transform: flipped ? 'rotateY(180deg)' : 'none',
        }}
      >
        <Box sx={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden' }}>
          <GiftCardFace side="FRONT" artworkUrl={artwork.front} {...faceProps} />
        </Box>
        {canFlip && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
            }}
          >
            <GiftCardFace side="BACK" artworkUrl={artwork.back} {...faceProps} />
          </Box>
        )}
      </Box>
      {canFlip && (
        <DuncitIconButton
          size="small"
          onClick={() => setFlipped((was) => !was)}
          aria-label={t('mweb.giftCards.flipCard')}
          sx={{
            position: 'absolute',
            right: 8,
            bottom: 8,
            zIndex: 2,
            color: '#fff',
            bgcolor: 'rgba(0,0,0,0.35)',
            '&:hover': { bgcolor: 'rgba(0,0,0,0.5)' },
          }}
        >
          <FlipIcon fontSize="small" />
        </DuncitIconButton>
      )}
    </Box>
  );
}
