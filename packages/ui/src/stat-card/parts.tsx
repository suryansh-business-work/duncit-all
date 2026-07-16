import { Box, Skeleton, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { mergeSx } from '../mergeSx';
import type { StatCardProps } from './types';

/** Icon, optionally wrapped in a color-tinted flex box or rounded chip box. */
export function IconAdornment({ icon, iconColor, iconBox }: Readonly<Pick<StatCardProps, 'icon' | 'iconColor' | 'iconBox'>>) {
  if (!icon) return null;
  if (iconBox) {
    return (
      <Stack
        alignItems="center"
        justifyContent="center"
        sx={{
          width: iconBox.size ?? 40,
          height: iconBox.size ?? 40,
          borderRadius: iconBox.radius ?? 1.5,
          bgcolor: alpha(iconBox.color, iconBox.alpha ?? 0.16),
          color: iconBox.color,
          flexShrink: 0,
        }}
      >
        {icon}
      </Stack>
    );
  }
  if (iconColor) {
    return <Box sx={{ color: iconColor, display: 'flex' }}>{icon}</Box>;
  }
  return <>{icon}</>;
}

type LabelTextProps = Pick<StatCardProps, 'label' | 'labelWeight' | 'labelSx'> & {
  labelVariant: NonNullable<StatCardProps['labelVariant']>;
};

export function LabelText({ label, labelVariant, labelWeight, labelSx }: Readonly<LabelTextProps>) {
  return (
    <Typography variant={labelVariant} color="text.secondary" fontWeight={labelWeight} sx={labelSx}>
      {label}
    </Typography>
  );
}

type ValueBlockProps = Pick<
  StatCardProps,
  'value' | 'valueVariant' | 'valueWeight' | 'valueColor' | 'valueNoWrap' | 'valueSx' | 'sub' | 'loading' | 'skeletonProps'
>;

export function ValueBlock({
  value,
  valueVariant = 'h5',
  valueWeight = 800,
  valueColor,
  valueNoWrap,
  valueSx,
  sub,
  loading,
  skeletonProps,
}: Readonly<ValueBlockProps>) {
  if (loading) {
    return <Skeleton variant="text" width={90} height={40} {...skeletonProps} />;
  }
  const colorSx = valueColor ? { color: valueColor } : {};
  const valueEl = (
    <Typography variant={valueVariant} fontWeight={valueWeight} noWrap={valueNoWrap} sx={mergeSx(colorSx, valueSx)}>
      {value}
    </Typography>
  );
  if (!sub) return valueEl;
  return (
    <Stack direction="row" alignItems="baseline" sx={{ gap: 1 }}>
      {valueEl}
      <Typography variant="body2" color="text.secondary" noWrap>
        {sub}
      </Typography>
    </Stack>
  );
}

export function HintText({ hint, hintColor, hintSx }: Readonly<Pick<StatCardProps, 'hint' | 'hintColor' | 'hintSx'>>) {
  if (!hint) return null;
  return (
    <Typography variant="caption" color={hintColor ?? 'text.secondary'} sx={hintSx}>
      {hint}
    </Typography>
  );
}
