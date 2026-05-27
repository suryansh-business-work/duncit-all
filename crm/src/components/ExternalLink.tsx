import { Link, type LinkProps } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import type { ReactNode } from 'react';

interface Props extends Omit<LinkProps, 'href' | 'children'> {
  href: string;
  /** Optional override for the displayed text. Defaults to the href. */
  children?: ReactNode;
  /** Show the external-link icon after the text. Defaults to true. */
  withIcon?: boolean;
}

/**
 * Anchor styled as inline text that always opens external URLs in a new tab
 * with `rel="noreferrer"` to avoid window.opener leaks. Used everywhere a
 * lead-detail page renders a user-provided URL. Uses MUI Link (not
 * Typography component="a") because polymorphic Typography types don't
 * cleanly accept anchor-specific props like href/target.
 */
export default function ExternalLink({ href, children, withIcon = true, sx, ...rest }: Props) {
  return (
    <Link
      {...rest}
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      underline="hover"
      sx={[
        {
          color: 'primary.main',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.5,
          wordBreak: 'break-all',
        },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    >
      {children ?? href}
      {withIcon && <OpenInNewIcon fontSize="inherit" />}
    </Link>
  );
}
