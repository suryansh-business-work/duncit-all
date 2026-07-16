import type { ReactNode } from 'react';
import type { SkeletonProps } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';

/**
 * `default`   — overline/caption label row (icon at start or end), big value
 *               below, optional caption hint. (finance, website-app, tech,
 *               partners-app, onboarding, crm dashboards)
 * `valueFirst` — large icon at the left, value stacked over a body2 label.
 *               (support, challenge-portal dashboards)
 * `split`     — label + value column on the left, icon (box) on the right,
 *               vertically centred. (admin SummaryTiles)
 */
export type StatCardLayout = 'default' | 'valueFirst' | 'split';

export type StatCardBarColor = 'primary' | 'success' | 'warning' | 'error';

/** Tinted rounded box around the icon (admin SummaryTiles / crm KPI tiles). */
export interface StatCardIconBox {
  /** Resolvable CSS color (hex/rgb) — tinted at low opacity for the bg. */
  color: string;
  /** Background opacity of `color`. Default 0.16. */
  alpha?: number;
  /** Square size in px. Default 40. */
  size?: number;
  /** Border radius (theme spacing units). Default 1.5. */
  radius?: number;
}

export interface StatCardProps {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  /** Theme color path for the hint text (e.g. "success.main"). */
  hintColor?: string;
  hintSx?: SxProps<Theme>;
  icon?: ReactNode;
  /** Theme color path applied to a flex wrapper around the icon. */
  iconColor?: string;
  iconBox?: StatCardIconBox;
  /** Icon position in the `default` layout's header row. Default 'end'. */
  iconPlacement?: 'start' | 'end';
  layout?: StatCardLayout;
  /** Default 'overline' ('body2' in the valueFirst layout). */
  labelVariant?: 'overline' | 'caption' | 'body2';
  labelWeight?: number;
  labelSx?: SxProps<Theme>;
  /** Default 'h5'. */
  valueVariant?: 'h4' | 'h5' | 'h6';
  /** Default 800. */
  valueWeight?: number;
  /** Theme color path for the value text. */
  valueColor?: string;
  valueNoWrap?: boolean;
  valueSx?: SxProps<Theme>;
  /** Small inline text on the value baseline (tech server cards). */
  sub?: string;
  /** 0–100 → renders a LinearProgress usage bar under the value. */
  percent?: number;
  /** Bar color; defaults to usageColor(percent). */
  progressColor?: StatCardBarColor;
  /** Wraps the card body in a CardActionArea RouterLink. */
  to?: string;
  /** Wraps the card body in a clickable CardActionArea. */
  onClick?: () => void;
  /** Replaces the value with a Skeleton. */
  loading?: boolean;
  /** Skeleton overrides; default variant "text", width 90, height 40. */
  skeletonProps?: SkeletonProps;
  /** Default 'outlined'. */
  cardVariant?: 'outlined' | 'elevation';
  /** Extra sx for the `default` layout's header row (e.g. { mb: 0.75 }). */
  headerSx?: SxProps<Theme>;
  /** Card sx (flex sizing, minWidth, borderRadius, height). */
  sx?: SxProps<Theme>;
  /** CardContent sx (padding overrides). */
  contentSx?: SxProps<Theme>;
}
