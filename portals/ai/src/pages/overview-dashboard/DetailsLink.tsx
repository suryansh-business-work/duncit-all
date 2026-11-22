import { Link as RouterLink } from 'react-router';
import { Link } from '@mui/material';

/** A widget header link to the page that holds the detail behind it. */
export default function DetailsLink({ to, label }: Readonly<{ to: string; label: string }>) {
  return (
    <Link component={RouterLink} to={to} variant="body2" underline="hover">
      {label}
    </Link>
  );
}
