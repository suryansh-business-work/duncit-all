import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Card, CardActionArea, CardContent, LinearProgress, Stack } from '@mui/material';
import { mergeSx } from '../mergeSx';
import { HintText, IconAdornment, LabelText, ValueBlock } from './parts';
import { usageColor } from './usage-color';
import type { StatCardProps } from './types';

function UsageBar({ percent, progressColor }: Readonly<Pick<StatCardProps, 'percent' | 'progressColor'>>) {
  if (percent === undefined) return null;
  return (
    <LinearProgress
      variant="determinate"
      value={Math.max(0, Math.min(100, percent))}
      color={progressColor ?? usageColor(percent)}
      sx={{ mt: 1.25, height: 6, borderRadius: 3 }}
    />
  );
}

function DefaultBody(props: Readonly<StatCardProps>) {
  const { icon, iconColor, iconBox, iconPlacement = 'end', headerSx } = props;
  const iconEl = <IconAdornment icon={icon} iconColor={iconColor} iconBox={iconBox} />;
  const startIcon = iconPlacement === 'start' ? iconEl : null;
  const endIcon = iconPlacement === 'end' ? iconEl : null;
  const justify = iconPlacement === 'end' ? 'space-between' : 'flex-start';
  return (
    <>
      <Stack direction="row" alignItems="center" justifyContent={justify} sx={mergeSx({ gap: 1, mb: 1 }, headerSx)}>
        {startIcon}
        <LabelText label={props.label} labelVariant={props.labelVariant ?? 'overline'} labelWeight={props.labelWeight} labelSx={props.labelSx} />
        {endIcon}
      </Stack>
      <ValueBlock {...props} />
      <HintText hint={props.hint} hintColor={props.hintColor} hintSx={props.hintSx} />
      <UsageBar percent={props.percent} progressColor={props.progressColor} />
    </>
  );
}

function ValueFirstBody(props: Readonly<StatCardProps>) {
  return (
    <Stack direction="row" alignItems="center" sx={{ gap: 1.5 }}>
      <IconAdornment icon={props.icon} iconColor={props.iconColor} iconBox={props.iconBox} />
      <Box>
        <ValueBlock {...props} />
        <LabelText label={props.label} labelVariant={props.labelVariant ?? 'body2'} labelWeight={props.labelWeight} labelSx={props.labelSx} />
        <HintText hint={props.hint} hintColor={props.hintColor} hintSx={props.hintSx} />
      </Box>
    </Stack>
  );
}

function SplitBody(props: Readonly<StatCardProps>) {
  return (
    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ gap: 1 }}>
      <Box>
        <LabelText label={props.label} labelVariant={props.labelVariant ?? 'overline'} labelWeight={props.labelWeight} labelSx={props.labelSx} />
        <ValueBlock {...props} />
        <HintText hint={props.hint} hintColor={props.hintColor} hintSx={props.hintSx} />
      </Box>
      <IconAdornment icon={props.icon} iconColor={props.iconColor} iconBox={props.iconBox} />
    </Stack>
  );
}

function StatCardBody(props: Readonly<StatCardProps>) {
  const layout = props.layout ?? 'default';
  if (layout === 'valueFirst') return <ValueFirstBody {...props} />;
  if (layout === 'split') return <SplitBody {...props} />;
  return <DefaultBody {...props} />;
}

function ActionWrap({ to, onClick, children }: Readonly<Pick<StatCardProps, 'to' | 'onClick'> & { children: ReactNode }>) {
  if (to) {
    return (
      <CardActionArea component={RouterLink} to={to} sx={{ height: '100%' }}>
        {children}
      </CardActionArea>
    );
  }
  if (onClick) {
    return (
      <CardActionArea onClick={onClick} sx={{ height: '100%' }}>
        {children}
      </CardActionArea>
    );
  }
  return <>{children}</>;
}

/**
 * The shared KPI / dashboard stat tile. A superset of the drifted per-portal
 * copies — every variant is reachable via the layout / icon / typography props.
 */
export function StatCard(props: Readonly<StatCardProps>) {
  const { cardVariant = 'outlined', sx, contentSx, to, onClick } = props;
  return (
    <Card variant={cardVariant} sx={sx}>
      <ActionWrap to={to} onClick={onClick}>
        <CardContent sx={contentSx}>
          <StatCardBody {...props} />
        </CardContent>
      </ActionWrap>
    </Card>
  );
}
