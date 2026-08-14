import { useState } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { formatMoney } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';
import { giftCardGradient } from './giftCardTheme';
import type { GiftCardScopeType } from './queries';

interface GiftCardVisualProps {
  scopeType: GiftCardScopeType;
  scopeCategoryId: string | null;
  /** Snapshot name — empty for SHOP cards, which localize their own title. */
  scopeName: string;
  scopeImageUrl: string;
  amount: number;
  currencySymbol: string;
  /** Shown on owned cards only — a shared preview never prints a code. */
  code?: string;
  /** Dense variant for the theme picker's option tiles. */
  compact?: boolean;
}

/**
 * THE gift card — the one visual every surface of the feature renders. The
 * gradient is derived from the scope, so a category's card looks identical on
 * the buy picker, in My cards, at checkout and on the claim link.
 */
export default function GiftCardVisual({
  scopeType,
  scopeCategoryId,
  scopeName,
  scopeImageUrl,
  amount,
  currencySymbol,
  code,
  compact = false,
}: Readonly<GiftCardVisualProps>) {
  const { t } = useTranslation();
  const [imageFailed, setImageFailed] = useState(false);
  // SHOP cards carry no category, so the scope type itself seeds the palette.
  const gradient = giftCardGradient(scopeCategoryId || scopeName || scopeType);
  const title = scopeType === 'SHOP' ? t('mweb.giftCards.shopTheme') : scopeName;
  const showImage = !!scopeImageUrl && !imageFailed;
  const iconSize = compact ? 28 : 38;

  return (
    <Box
      sx={{
        position: 'relative',
        overflow: 'hidden',
        width: '100%',
        borderRadius: '16px',
        p: compact ? 1.5 : 2.5,
        minHeight: compact ? 118 : 172,
        color: '#fff',
        background: `linear-gradient(135deg, ${gradient.from} 0%, ${gradient.to} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      {/* Decorative sheen — purely visual, sits under the content. */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at 85% -20%, rgba(255,255,255,0.30) 0%, transparent 55%), radial-gradient(circle at -10% 110%, rgba(255,255,255,0.12) 0%, transparent 45%)',
        }}
      />
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1} sx={{ zIndex: 1 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="overline" sx={{ opacity: 0.85, letterSpacing: 1.2, lineHeight: 1.6, display: 'block' }}>
            {t('mweb.giftCards.title')}
          </Typography>
          <Typography variant={compact ? 'body2' : 'subtitle1'} fontWeight={700} noWrap>
            {title}
          </Typography>
        </Box>
        {showImage && (
          <Box
            component="img"
            src={scopeImageUrl}
            alt=""
            onError={() => setImageFailed(true)}
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
        <Typography variant={compact ? 'h6' : 'h4'} fontWeight={800} sx={{ lineHeight: 1.1 }}>
          {formatMoney(amount, { symbol: currencySymbol })}
        </Typography>
        {code && (
          <Typography variant="body2" sx={{ fontFamily: 'monospace', letterSpacing: 1.5, opacity: 0.92, mt: 0.5 }}>
            {code}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
