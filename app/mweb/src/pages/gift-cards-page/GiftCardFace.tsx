import { useState } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { formatMoney } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';
import { giftCardGradient } from './giftCardTheme';
import type { GiftCardScopeType } from './queries';

/** Which side of the card this is. The front carries the value, the back is the
 * reverse an admin uploads artwork for — so it never repeats the amount. */
export type GiftCardFaceSide = 'FRONT' | 'BACK';

export interface GiftCardFaceProps {
  side: GiftCardFaceSide;
  scopeType: GiftCardScopeType;
  scopeCategoryId: string | null;
  /** Snapshot name — empty for SHOP cards, which localize their own title. */
  scopeName: string;
  /** The small scope icon, drawn only on a gradient front (artwork replaces it). */
  scopeImageUrl: string;
  /** This face's uploaded artwork; empty falls back to the gradient design. */
  artworkUrl: string;
  amount: number;
  currencySymbol: string;
  /** Shown on owned cards only — a shared preview never prints a code. */
  code?: string;
  compact?: boolean;
}

/** Sits under the copy so white text stays readable over any uploaded photo. */
const ARTWORK_SCRIM =
  'linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.10) 40%, rgba(0,0,0,0.60) 100%)';

const GRADIENT_SHEEN =
  'radial-gradient(circle at 85% -20%, rgba(255,255,255,0.30) 0%, transparent 55%), radial-gradient(circle at -10% 110%, rgba(255,255,255,0.12) 0%, transparent 45%)';

/**
 * ONE side of the gift card. With artwork it renders the uploaded image full
 * bleed under a scrim; without it, the generated gradient card the feature has
 * always drawn. An artwork URL that fails to load falls back to the gradient,
 * so a deleted upload never leaves a blank card behind.
 */
export default function GiftCardFace({
  side,
  scopeType,
  scopeCategoryId,
  scopeName,
  scopeImageUrl,
  artworkUrl,
  amount,
  currencySymbol,
  code,
  compact = false,
}: Readonly<GiftCardFaceProps>) {
  const { t } = useTranslation();
  const [artworkFailed, setArtworkFailed] = useState(false);
  const [iconFailed, setIconFailed] = useState(false);
  // SHOP cards carry no category, so the scope type itself seeds the palette.
  const gradient = giftCardGradient(scopeCategoryId || scopeName || scopeType);
  const title = scopeType === 'SHOP' ? t('mweb.giftCards.shopTheme') : scopeName;
  const showArtwork = !!artworkUrl && !artworkFailed;
  const showIcon = !showArtwork && !!scopeImageUrl && !iconFailed;
  const isFront = side === 'FRONT';
  const iconSize = compact ? 28 : 38;
  const artworkAlt = isFront ? t('mweb.giftCards.cardFront') : t('mweb.giftCards.cardBack');

  return (
    <Box
      sx={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        borderRadius: '16px',
        p: compact ? 1.5 : 2.5,
        color: '#fff',
        background: `linear-gradient(135deg, ${gradient.from} 0%, ${gradient.to} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      {showArtwork && (
        <Box
          component="img"
          src={artworkUrl}
          alt={artworkAlt}
          onError={() => setArtworkFailed(true)}
          sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      )}
      {/* Decorative only: a scrim over artwork, the sheen over the gradient. */}
      <Box
        sx={{ position: 'absolute', inset: 0, background: showArtwork ? ARTWORK_SCRIM : GRADIENT_SHEEN }}
      />
      <Stack
        direction="row"
        spacing={1}
        sx={{
          justifyContent: "space-between",
          alignItems: "flex-start",
          zIndex: 1
        }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="overline" sx={{ opacity: 0.85, letterSpacing: 1.2, lineHeight: 1.6, display: 'block' }}>
            {t('mweb.giftCards.title')}
          </Typography>
          <Typography variant={compact ? 'body2' : 'subtitle1'} noWrap sx={{
            fontWeight: 700
          }}>
            {title}
          </Typography>
        </Box>
        {showIcon && (
          <Box
            component="img"
            src={scopeImageUrl}
            alt=""
            onError={() => setIconFailed(true)}
            sx={{
              width: iconSize,
              height: iconSize,
              objectFit: 'contain',
              flexShrink: 0,
              borderRadius: '8px',
              bgcolor: 'rgba(255,255,255,0.16)',
              p: 0.5,
            }}
          />
        )}
      </Stack>
      <Box sx={{ zIndex: 1 }}>
        {isFront && (
          <Typography
            variant={compact ? 'h6' : 'h4'}
            sx={{
              fontWeight: 800,
              lineHeight: 1.1
            }}>
            {formatMoney(amount, { symbol: currencySymbol })}
          </Typography>
        )}
        {code && (
          <Typography variant="body2" sx={{ fontFamily: 'monospace', letterSpacing: 1.5, opacity: 0.92, mt: 0.5 }}>
            {code}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
