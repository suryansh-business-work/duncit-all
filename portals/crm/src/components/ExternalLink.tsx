import { Link, type LinkProps } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import type { ReactNode } from 'react';
import { crmSafeHref } from '@duncit/utils';

interface Props extends Omit<LinkProps, 'href' | 'children'> {
  href: string;
  /** Optional override for the displayed text. Defaults to the href. */
  children?: ReactNode;
  /** Show the external-link icon after the text. Defaults to true. */
  withIcon?: boolean;
}

/** Normalise the incoming `sx` (array | object | undefined) into a spreadable list. */
const toSxList = (sx: LinkProps['sx']) => {
  if (Array.isArray(sx)) return sx;
  return sx ? [sx] : [];
};

/**
 * Anchor styled as inline text that always opens external URLs in a new tab
 * with `rel="noreferrer"` to avoid window.opener leaks. Used everywhere a
 * lead-detail page renders a user-provided URL. Uses MUI Link (not
 * Typography component="a") because polymorphic Typography types don't
 * cleanly accept anchor-specific props like href/target.
 */
/**
 * The link to open, or null when the value is not a web address. A bare
 * "instagram.com/x" becomes https://; any other scheme (javascript:, data:)
 * is never handed to the browser.
 */
export const safeHref = crmSafeHref;

export default function ExternalLink({ href, children, withIcon = true, sx, ...rest }: Readonly<Props>) {
  const target = safeHref(href);
  if (!target) return <>{children ?? href}</>;
  return (
    <Link
      {...rest}
      href={target}
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
        ...toSxList(sx),
      ]}
    >
      {children ?? href}
      {withIcon && <OpenInNewIcon fontSize="inherit" />}
    </Link>
  );
}
