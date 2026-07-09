import { Breadcrumbs, Typography } from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';

interface Props {
  /** Root-first category names, e.g. ['Sports', 'Racquet', 'Badminton']. */
  crumbs: readonly string[];
}

/**
 * Super › Category › Sub category breadcrumb. The leaf (last) crumb is
 * emphasized. Renders nothing when there are no crumbs.
 */
export default function CategoryBreadcrumb({ crumbs }: Readonly<Props>) {
  if (crumbs.length === 0) return null;
  const lastIndex = crumbs.length - 1;
  return (
    <Breadcrumbs
      separator={<NavigateNextIcon sx={{ fontSize: 14 }} />}
      aria-label="category"
      sx={{ '& .MuiBreadcrumbs-separator': { mx: 0.5 } }}
    >
      {crumbs.map((name, i) => (
        <Typography
          key={name}
          variant="caption"
          sx={{ fontWeight: i === lastIndex ? 800 : 600, color: i === lastIndex ? 'text.primary' : 'text.secondary' }}
        >
          {name}
        </Typography>
      ))}
    </Breadcrumbs>
  );
}
