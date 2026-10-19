import type { MouseEventHandler, ReactNode } from 'react';
import { Link as RouterLink } from 'react-router';
import { Badge, Box } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';

import { STORE_TOKENS as T } from '../../theme/tokens';

interface HeaderActionProps {
  icon: ReactNode;
  /** The short word under the icon; the accessible name starts with it. */
  caption: string;
  'aria-label': string;
  /** Renders as an in-app link instead of a button. */
  to?: string;
  onClick?: MouseEventHandler<HTMLElement>;
  /** A count bubble on the icon; 0 shows none. */
  badge?: number;
  'aria-haspopup'?: 'dialog' | 'menu';
  'aria-expanded'?: boolean;
  'aria-controls'?: string;
  testId?: string;
}

const ACTION_SX = {
  flexDirection: 'column',
  gap: 0.5,
  minWidth: 68,
  minHeight: 56,
  px: 1,
  py: 0.75,
  borderRadius: `${T.radius.control}px`,
  color: T.ink,
  fontSize: '0.75rem',
  fontWeight: 700,
  lineHeight: 1.2,
  '& .MuiSvgIcon-root': { fontSize: '1.6rem' },
} as const;

/** The desktop header's labelled icon: icon above a caption, one button or link. */
export function HeaderAction({ icon, caption, to, badge = 0, testId, ...aria }: Readonly<HeaderActionProps>) {
  const body = (
    <>
      <Badge badgeContent={badge} color="primary" max={99}>
        {icon}
      </Badge>
      <Box component="span">{caption}</Box>
    </>
  );
  if (to) {
    return (
      <DuncitButton component={RouterLink} to={to} aria-label={aria['aria-label']} sx={ACTION_SX} data-testid={testId}>
        {body}
      </DuncitButton>
    );
  }
  return (
    <DuncitButton {...aria} sx={ACTION_SX} data-testid={testId}>
      {body}
    </DuncitButton>
  );
}
