import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router';
import { Link, type LinkProps } from '@mui/material';

import { isInternalLink } from '../lib/paths';

interface SmartLinkProps extends Omit<LinkProps, 'href'> {
  to: string;
  children: ReactNode;
}

/**
 * A link whose target an operator typed: a store path routes in-app, anything
 * else opens in a new tab with the opener cut off.
 */
export function SmartLink({ to, children, ...rest }: Readonly<SmartLinkProps>) {
  if (isInternalLink(to)) {
    return (
      <Link component={RouterLink} to={to} {...rest}>
        {children}
      </Link>
    );
  }
  return (
    <Link href={to} target="_blank" rel="noopener noreferrer" {...rest}>
      {children}
    </Link>
  );
}
