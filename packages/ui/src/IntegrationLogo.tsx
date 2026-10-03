import { Box, type SxProps, type Theme } from '@mui/material';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import { mergeSx } from './mergeSx';

/** The third-party services a partner brand connects. */
export type IntegrationVendor = 'RAZORPAY' | 'SHIPROCKET';

/**
 * Razorpay's mark, from Simple Icons (CC0). Drawn in `currentColor` so it takes
 * the theme's text colour in light and dark — no vendor hex in the design system.
 */
const RAZORPAY_MARK =
  'M22.436 0l-11.91 7.773-1.174 4.276 6.625-4.297L11.65 24h4.391l6.395-24zM14.26 10.098L3.389 17.166 1.564 24h9.008l3.688-13.902Z';

export interface IntegrationLogoProps {
  vendor: IntegrationVendor;
  /** Accessible name, e.g. "Razorpay" — the tile is announced as an image. */
  label: string;
  /** Tile edge in px. Default 40. */
  size?: number;
  sx?: SxProps<Theme>;
}

/**
 * A square logo tile for an integration card. Razorpay shows its own mark;
 * ShipRocket (no openly licensed mark is available) shows the shipping glyph —
 * both monochrome, so the two tiles read as one set.
 */
export function IntegrationLogo({ vendor, label, size = 40, sx }: Readonly<IntegrationLogoProps>) {
  const glyph = Math.round(size * 0.6);
  return (
    <Box
      role="img"
      aria-label={label}
      data-testid={`integration-logo-${vendor.toLowerCase()}`}
      sx={mergeSx(
        {
          width: size,
          height: size,
          flexShrink: 0,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 1,
          border: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
          color: 'text.primary',
        },
        sx
      )}
    >
      {vendor === 'RAZORPAY' ? (
        <svg viewBox="0 0 24 24" width={glyph} height={glyph} aria-hidden="true" focusable="false">
          <path fill="currentColor" d={RAZORPAY_MARK} />
        </svg>
      ) : (
        <LocalShippingOutlinedIcon aria-hidden sx={{ fontSize: glyph }} />
      )}
    </Box>
  );
}
