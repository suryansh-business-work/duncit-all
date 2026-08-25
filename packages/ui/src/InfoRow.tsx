import type { ReactNode } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { mergeSx } from './mergeSx';

/**
 * `stacked` — caption label over a body2 value. (dialog/detail Field/DetailRow)
 * `inline`  — baseline row: fixed-min-width secondary label, then the value.
 * `split`   — space-between row: label left, right-aligned value.
 */
export type InfoRowVariant = 'stacked' | 'inline' | 'split';

export interface InfoRowProps {
  label: ReactNode;
  value: ReactNode;
  variant?: InfoRowVariant;
  /** `inline` only: label minWidth in px. Default 96. */
  labelWidth?: number;
  labelVariant?: 'caption' | 'body2' | 'overline';
  labelWeight?: number;
  valueWeight?: number;
  /** `split` only: bold total row — 900 weight, primary-color label. */
  bold?: boolean;
  /** `split` + `bold`: color for the bold value (e.g. an accent). */
  boldColor?: string;
  sx?: SxProps<Theme>;
  labelSx?: SxProps<Theme>;
  valueSx?: SxProps<Theme>;
}

function StackedRow({ label, value, labelVariant, labelWeight, valueWeight, sx, labelSx, valueSx }: Readonly<InfoRowProps>) {
  return (
    <Box sx={sx}>
      <Typography
        variant={labelVariant ?? 'caption'}
        sx={[{
          color: "text.secondary",
          fontWeight: labelWeight ?? 700,
          display: "block"
        }, ...(Array.isArray(labelSx) ? labelSx : [labelSx])]}>
        {label}
      </Typography>
      <Typography
        variant="body2"
        component="div"
        sx={[{
          fontWeight: valueWeight
        }, ...(Array.isArray(valueSx) ? valueSx : [valueSx])]}>
        {value}
      </Typography>
    </Box>
  );
}

function InlineRow({ label, value, labelWidth, labelVariant, labelWeight, valueWeight, sx, labelSx, valueSx }: Readonly<InfoRowProps>) {
  return (
    <Stack
      direction="row"
      sx={mergeSx({
        alignItems: "baseline"
      }, mergeSx({ gap: 1.5 }, sx))}>
      <Typography
        variant={labelVariant ?? 'body2'}
        sx={mergeSx({
          color: "text.secondary",
          fontWeight: labelWeight
        }, mergeSx({ minWidth: labelWidth ?? 96, flexShrink: 0 }, labelSx))}>
        {label}
      </Typography>
      <Typography
        variant="body2"
        component="div"
        sx={mergeSx({
          fontWeight: valueWeight ?? 600
        }, mergeSx({ wordBreak: 'break-word' }, valueSx))}>
        {value}
      </Typography>
    </Stack>
  );
}

function SplitRow({ label, value, labelVariant, labelWeight, valueWeight, bold, boldColor, sx, labelSx, valueSx }: Readonly<InfoRowProps>) {
  const labelColor = bold ? 'text.primary' : 'text.secondary';
  let resolvedLabelWeight = labelWeight;
  let resolvedValueWeight = valueWeight ?? 600;
  if (bold) {
    resolvedLabelWeight = 900;
    resolvedValueWeight = 900;
  }
  const boldColorSx = bold && boldColor ? { color: boldColor } : {};
  return (
    <Stack
      direction="row"
      sx={mergeSx({
        justifyContent: "space-between"
      }, mergeSx({ gap: 2 }, sx))}>
      <Typography
        variant={labelVariant ?? 'body2'}
        color={labelColor}
        sx={[{
          fontWeight: resolvedLabelWeight
        }, ...(Array.isArray(labelSx) ? labelSx : [labelSx])]}>
        {label}
      </Typography>
      <Typography
        variant="body2"
        component="div"
        sx={mergeSx({
          fontWeight: resolvedValueWeight
        }, mergeSx({ textAlign: 'right', ...boldColorSx }, valueSx))}>
        {value}
      </Typography>
    </Stack>
  );
}

/**
 * The shared label/value detail row. Superset of the ~12 per-portal
 * Field/DetailRow/InfoRow/Row copies. No built-in empty fallback — keep the
 * call site's own `value={x || '—'}` expression when migrating.
 */
export function InfoRow(props: Readonly<InfoRowProps>) {
  const variant = props.variant ?? 'stacked';
  if (variant === 'inline') return <InlineRow {...props} />;
  if (variant === 'split') return <SplitRow {...props} />;
  return <StackedRow {...props} />;
}
