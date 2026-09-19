import type { MouseEventHandler, ReactNode } from 'react';
import { Link as RouterLink } from 'react-router';
import type { SxProps, Theme } from '@mui/material/styles';
import { DuncitIconButton } from '@duncit/buttons';
import { mergeSx } from '@duncit/ui';

import { STORE_TOKENS as T } from '../theme/tokens';

/** The round white 44px look, shared with the footer's social icon links. */
export const CIRCLE_BUTTON_SX = {
  width: 44,
  height: 44,
  bgcolor: T.surface,
  border: 1,
  borderColor: T.border,
  color: T.ink,
  '&:hover': { bgcolor: T.surface },
} as const;

interface CircleButtonProps {
  'aria-label': string;
  children: ReactNode;
  /** Renders as an in-app link instead of a button. */
  to?: string;
  onClick?: MouseEventHandler<HTMLElement>;
  disabled?: boolean;
  sx?: SxProps<Theme>;
  'aria-haspopup'?: 'dialog' | 'menu';
  'aria-expanded'?: boolean;
  'aria-controls'?: string;
}

/** The 44px round white icon button of the design: back, cart, bell. */
export function CircleButton({ to, sx, children, ...rest }: Readonly<CircleButtonProps>) {
  if (to) {
    return (
      <DuncitIconButton component={RouterLink} to={to} aria-label={rest['aria-label']} sx={mergeSx(CIRCLE_BUTTON_SX, sx)}>
        {children}
      </DuncitIconButton>
    );
  }
  return (
    <DuncitIconButton {...rest} sx={mergeSx(CIRCLE_BUTTON_SX, sx)}>
      {children}
    </DuncitIconButton>
  );
}
