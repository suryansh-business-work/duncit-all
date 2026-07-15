import { useLocation } from 'react-router-dom';
import { Box, Breadcrumbs } from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import type { BreadcrumbNavItem } from './types';
import { useCrumbs } from './useCrumbs';
import { useBreadcrumbOverride } from './BreadcrumbContext';
import { CrumbNode } from './CrumbNode';

export interface AppBreadcrumbsProps {
  nav: BreadcrumbNavItem[];
  /** Home crumb label — the portal short name. */
  appName: string;
  /** Route-segment → label overrides for the divergent portals. */
  labelMap?: Record<string, string>;
}

/**
 * The shared console breadcrumb. Builds its trail dynamically from the current
 * route + the portal's nav tree, and honours any page-set override (see
 * `useSetBreadcrumbs`). Rendered once by the shell chrome, so every portal gets
 * it for free. Hidden on the home and login routes.
 */
export function AppBreadcrumbs({ nav, appName, labelMap }: Readonly<AppBreadcrumbsProps>) {
  const { pathname } = useLocation();
  const override = useBreadcrumbOverride();
  const crumbs = useCrumbs({ nav, appName, labelMap, override });

  if (pathname === '/' || pathname === '/login') return null;

  return (
    <Box
      sx={{
        px: { xs: 1.5, md: 3 },
        py: 1,
        borderBottom: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Breadcrumbs
        separator={<NavigateNextIcon fontSize="small" />}
        aria-label="breadcrumb"
        sx={{
          '& .MuiBreadcrumbs-ol': { alignItems: 'center' },
          '& .MuiBreadcrumbs-li': { display: 'flex', alignItems: 'center' },
          '& .MuiBreadcrumbs-separator': { display: 'flex', alignItems: 'center', mx: 0.5 },
        }}
      >
        {crumbs.map((crumb, idx) => (
          <CrumbNode
            key={`${crumb.to ?? 'leaf'}:${crumb.label}`}
            crumb={crumb}
            isFirst={idx === 0}
            isLast={idx === crumbs.length - 1}
          />
        ))}
      </Breadcrumbs>
    </Box>
  );
}
