import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, IconButton, Stack, Typography } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { mergeSx } from './mergeSx';

export interface BackButtonProps {
  /** Button label, e.g. "Back to Venue Leads". */
  children: ReactNode;
  to?: string;
  onClick?: () => void;
  sx?: SxProps<Theme>;
}

/** The small `← Back to X` text button placed above detail-page content. */
export function BackButton({ children, to, onClick, sx }: Readonly<BackButtonProps>) {
  if (to) {
    return (
      <Button component={RouterLink} to={to} size="small" startIcon={<ArrowBackIcon />} sx={sx}>
        {children}
      </Button>
    );
  }
  return (
    <Button size="small" startIcon={<ArrowBackIcon />} onClick={onClick} sx={sx}>
      {children}
    </Button>
  );
}

export interface BackHeaderProps {
  title: ReactNode;
  /** Small line above the title. Strings render as overline; nodes render raw. */
  eyebrow?: ReactNode;
  /** Weight for a string eyebrow. Default 900. */
  eyebrowWeight?: number;
  /** Right-aligned action slot. */
  actions?: ReactNode;
  onBack?: () => void;
  /** Router link target — alternative to onBack. */
  backTo?: string;
  /** Default 'Back'. */
  backAriaLabel?: string;
  /** IconButton size. Default 'small'. */
  backSize?: 'small' | 'medium';
  /** IconButton sx (e.g. { bgcolor: 'action.hover' }). */
  backSx?: SxProps<Theme>;
  /** Default 'h5'. */
  titleVariant?: 'h4' | 'h5' | 'h6';
  titleWeight?: number;
  titleNoWrap?: boolean;
  titleSx?: SxProps<Theme>;
  sx?: SxProps<Theme>;
}

type BackIconProps = Pick<BackHeaderProps, 'onBack' | 'backTo' | 'backSize' | 'backSx'> & { ariaLabel: string };

function BackIcon({ onBack, backTo, backSize, backSx, ariaLabel }: Readonly<BackIconProps>) {
  if (backTo) {
    return (
      <IconButton size={backSize} component={RouterLink} to={backTo} aria-label={ariaLabel} sx={backSx}>
        <ArrowBackIcon />
      </IconButton>
    );
  }
  return (
    <IconButton size={backSize} onClick={onBack} aria-label={ariaLabel} sx={backSx}>
      <ArrowBackIcon />
    </IconButton>
  );
}

function Eyebrow({ eyebrow, eyebrowWeight }: Readonly<Pick<BackHeaderProps, 'eyebrow' | 'eyebrowWeight'>>) {
  if (eyebrow == null) return null;
  if (typeof eyebrow === 'string' || typeof eyebrow === 'number') {
    return (
      <Typography variant="overline" color="text.secondary" display="block" sx={{ fontWeight: eyebrowWeight ?? 900, lineHeight: 1.6 }}>
        {eyebrow}
      </Typography>
    );
  }
  return <>{eyebrow}</>;
}

/**
 * Detail-page header: ArrowBack icon button + eyebrow/title block + an
 * optional right-aligned action slot.
 */
export function BackHeader({
  title,
  eyebrow,
  eyebrowWeight,
  actions,
  onBack,
  backTo,
  backAriaLabel = 'Back',
  backSize = 'small',
  backSx,
  titleVariant = 'h5',
  titleWeight,
  titleNoWrap,
  titleSx,
  sx,
}: Readonly<BackHeaderProps>) {
  return (
    <Stack direction="row" alignItems="center" sx={mergeSx({ gap: 1 }, sx)}>
      <BackIcon onBack={onBack} backTo={backTo} backSize={backSize} backSx={backSx} ariaLabel={backAriaLabel} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Eyebrow eyebrow={eyebrow} eyebrowWeight={eyebrowWeight} />
        <Typography variant={titleVariant} fontWeight={titleWeight} noWrap={titleNoWrap} sx={titleSx}>
          {title}
        </Typography>
      </Box>
      {actions != null && (
        <Stack direction="row" alignItems="center" sx={{ gap: 1 }}>
          {actions}
        </Stack>
      )}
    </Stack>
  );
}
