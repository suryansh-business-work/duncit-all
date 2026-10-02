import { Box, IconButton, Paper, Slide, Stack, Typography, keyframes } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '../../../i18n/useTranslation';
import { RADIUS } from '../../../theme';
import type { CartLine } from '../CartContext';

const drain = keyframes`from { transform: scaleX(1); } to { transform: scaleX(0); }`;

/** Thumbnails stacked in the corner — up to three, the rest implied. */
const MAX_THUMBS = 3;
const THUMB = 40;

interface Props {
  open: boolean;
  lines: CartLine[];
  totalCount: number;
  hideMs: number;
  onCheckout: () => void;
  /** Auto-hide ran out, or the close button: due again after the delay. */
  onHide: () => void;
  onLater: () => void;
  onMute: () => void;
}

function Thumbs({ lines }: Readonly<{ lines: CartLine[] }>) {
  const shown = lines.filter((line) => line.image_url).slice(0, MAX_THUMBS);
  if (shown.length === 0) {
    return (
      <Box
        aria-hidden
        sx={{
          width: THUMB,
          height: THUMB,
          flex: '0 0 auto',
          display: 'grid',
          placeItems: 'center',
          borderRadius: `${RADIUS.hairline}px`,
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
        }}
      >
        <ShoppingCartOutlinedIcon fontSize="small" />
      </Box>
    );
  }
  return (
    <Stack direction="row" aria-hidden sx={{ flex: '0 0 auto' }}>
      {shown.map((line, index) => (
        <Box
          key={`${line.pod_id}-${line.product_id}-${line.variant_id}`}
          component="img"
          src={line.image_url}
          alt=""
          sx={{
            width: THUMB,
            height: THUMB,
            objectFit: 'cover',
            borderRadius: `${RADIUS.hairline}px`,
            border: 2,
            borderColor: 'background.paper',
            ml: index === 0 ? 0 : -1.5,
          }}
        />
      ))}
    </Stack>
  );
}

/**
 * "Your cart is calling" — a card that slides up above the bottom nav while
 * the cart holds products. It hides itself after `hideMs`; the draining bar
 * shows how long is left and pauses while the card is hovered or focused, so
 * nobody loses it mid-read (WCAG 2.2.1). Native twin:
 * src/components/cart/CartReminderNudge.tsx.
 */
export default function CartReminderNudge({
  open,
  lines,
  totalCount,
  hideMs,
  onCheckout,
  onHide,
  onLater,
  onMute,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const body =
    totalCount === 1
      ? t('mweb.cart.nudgeBodyOne')
      : t('mweb.cart.nudgeBodyMany', { vars: { count: totalCount } });
  return (
    <Slide in={open} direction="up" mountOnEnter unmountOnExit>
      <Paper
        role="region"
        aria-label={t('mweb.cart.nudgeTitle')}
        elevation={8}
        data-testid="cart-nudge"
        sx={{
          position: 'fixed',
          zIndex: (theme) => theme.zIndex.snackbar,
          left: 16,
          right: 16,
          mx: 'auto',
          maxWidth: 480,
          bottom:
            'calc(8px + var(--duncit-bottom-nav-overlay-offset, env(safe-area-inset-bottom, 0px)) + var(--duncit-app-banner-offset, 0px))',
          overflow: 'hidden',
          '&:hover .cart-nudge-timer, &:focus-within .cart-nudge-timer': {
            animationPlayState: 'paused',
          },
        }}
      >
        <Stack spacing={1.5} sx={{ p: 2 }}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <Thumbs lines={lines} />
            <Box role="status" sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontWeight: 700 }}>{t('mweb.cart.nudgeTitle')}</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {body}
              </Typography>
            </Box>
            <IconButton
              size="small"
              aria-label={t('mweb.cart.nudgeDismiss')}
              onClick={onHide}
              data-testid="cart-nudge-close"
              sx={{ alignSelf: 'flex-start' }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>
          <DuncitButton variant="contained" fullWidth onClick={onCheckout} data-testid="cart-nudge-checkout">
            {t('mweb.cart.nudgeCheckout')}
          </DuncitButton>
          <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between' }}>
            <DuncitButton variant="text" size="small" onClick={onLater} data-testid="cart-nudge-later">
              {t('mweb.cart.nudgeLater')}
            </DuncitButton>
            <DuncitButton
              variant="text"
              size="small"
              color="inherit"
              onClick={onMute}
              sx={{ color: 'text.secondary' }}
              data-testid="cart-nudge-mute"
            >
              {t('mweb.cart.nudgeMute')}
            </DuncitButton>
          </Stack>
        </Stack>
        {/* The bar IS the timer, so it must keep its real duration under
            reduced motion — the global rule exempts role=progressbar. Hidden
            from assistive tech: the card itself pauses while focused. */}
        <Box
          className="cart-nudge-timer"
          role="progressbar"
          aria-hidden
          onAnimationEnd={onHide}
          sx={{
            height: 3,
            bgcolor: 'primary.main',
            transformOrigin: 'left',
            animation: `${drain} ${hideMs}ms linear forwards`,
          }}
        />
      </Paper>
    </Slide>
  );
}
