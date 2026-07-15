import { Link as RouterLink } from 'react-router-dom';
import { Link, Typography } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import type { Crumb } from './types';

export interface CrumbNodeProps {
  crumb: Crumb;
  isFirst: boolean;
  isLast: boolean;
}

const ROW_SX = { display: 'inline-flex', alignItems: 'center', fontSize: 13, lineHeight: 1 } as const;

/** A single breadcrumb: a router link when it is navigable, plain text at the leaf. */
export function CrumbNode({ crumb, isFirst, isLast }: Readonly<CrumbNodeProps>) {
  const home = isFirst ? <HomeIcon sx={{ fontSize: 16, mr: 0.5 }} /> : null;

  if (crumb.to && !isLast) {
    return (
      <Link
        component={RouterLink}
        to={crumb.to}
        underline="hover"
        color="text.secondary"
        sx={{ ...ROW_SX, fontWeight: 500 }}
      >
        {home}
        {crumb.label}
      </Link>
    );
  }

  return (
    <Typography
      color={isLast ? 'text.primary' : 'text.secondary'}
      sx={{ ...ROW_SX, fontWeight: isLast ? 700 : 500 }}
    >
      {home}
      {crumb.label}
    </Typography>
  );
}
