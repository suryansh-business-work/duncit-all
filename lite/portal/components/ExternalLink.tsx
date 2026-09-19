import { Link } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

interface Props {
  href: string;
  /** The visible text. */
  label: string;
  /** The accessible name when the text alone does not say where it goes. */
  ariaLabel?: string;
  testId?: string;
}

/** A link out of the console (to the public site, a vendor dashboard), always in a new tab. */
export function ExternalLink({ href, label, ariaLabel, testId }: Readonly<Props>) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={ariaLabel}
      data-testid={testId}
      sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, fontWeight: 700 }}
    >
      {label}
      <OpenInNewIcon sx={{ fontSize: 14 }} aria-hidden="true" />
    </Link>
  );
}
