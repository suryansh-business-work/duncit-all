import { useMemo } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { Box, Breadcrumbs, Link, Typography } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import type { AppNavItem } from '../types';

interface Crumb {
  label: string;
  to?: string;
}

const HEX_ID_RE = /^[a-f0-9]{24}$/i;
const UUID_RE = /^[0-9a-f-]{20,}$/i;

function humanise(segment: string, labelMap?: Record<string, string>): string {
  const mapped = labelMap?.[segment];
  if (mapped) return mapped;
  if (HEX_ID_RE.test(segment) || UUID_RE.test(segment)) return 'Detail';
  return segment.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

interface MatchPath {
  trail: { label: string; to?: string }[];
  to: string;
}

/**
 * Walks the nav tree to find the deepest item whose `to` matches the
 * current pathname. Returns the full trail (parent + leaf) so the
 * breadcrumb can render "Calculators › Pod Profit".
 */
function findBestNavMatch(pathname: string, nav: AppNavItem[]): MatchPath | undefined {
  let best: MatchPath | undefined;
  const visit = (item: AppNavItem, trail: { label: string; to?: string }[]) => {
    const nextTrail = [...trail, { label: item.label, to: item.to }];
    if (item.to) {
      const matchesExact = item.to === '/' ? pathname === '/' : pathname === item.to || pathname.startsWith(`${item.to}/`);
      if (matchesExact && (!best || item.to.length > best.to.length)) {
        best = { trail: nextTrail, to: item.to };
      }
    }
    for (const child of item.children ?? []) visit(child, nextTrail);
  };
  for (const item of nav) visit(item, []);
  return best;
}

export interface AppBreadcrumbsProps {
  nav: AppNavItem[];
  /** Home crumb label — the portal short name. */
  appName: string;
  /** Route-segment → label overrides for the divergent portals. */
  labelMap?: Record<string, string>;
}

export function AppBreadcrumbs({ nav, appName, labelMap }: Readonly<AppBreadcrumbsProps>) {
  const { pathname } = useLocation();

  const crumbs = useMemo<Crumb[]>(() => {
    const list: Crumb[] = [{ label: appName, to: '/' }];
    const match = findBestNavMatch(pathname, nav);

    if (match && match.to !== '/') {
      match.trail.forEach((entry, idx) => {
        if (idx === 0 && entry.label === appName) return;
        list.push({ label: entry.label, to: entry.to });
      });
      if (pathname !== match.to && pathname.startsWith(match.to + '/')) {
        const rest = pathname.slice(match.to.length + 1).split('/').filter(Boolean);
        rest.forEach((seg) => list.push({ label: humanise(seg, labelMap) }));
      }
    } else if (pathname !== '/' && pathname !== '/login') {
      const segments = pathname.split('/').filter(Boolean);
      segments.forEach((seg, idx) => {
        const to = '/' + segments.slice(0, idx + 1).join('/');
        list.push({ label: humanise(seg, labelMap), to: idx === segments.length - 1 ? undefined : to });
      });
    }

    if (list.length > 0) {
      const last = list[list.length - 1];
      if (last) last.to = undefined;
    }
    return list;
  }, [pathname, nav, appName, labelMap]);

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
        sx={{ '& .MuiBreadcrumbs-ol': { alignItems: 'center' } }}
      >
        {crumbs.map((crumb, idx) => {
          const isLast = idx === crumbs.length - 1;
          const isHome = idx === 0;
          if (crumb.to && !isLast) {
            return (
              <Link
                key={`${crumb.label}-${idx}`}
                component={RouterLink}
                to={crumb.to}
                underline="hover"
                color="text.secondary"
                sx={{ display: 'inline-flex', alignItems: 'center', fontSize: 13, fontWeight: 500 }}
              >
                {isHome && <HomeIcon fontSize="small" sx={{ mr: 0.5 }} />}
                {crumb.label}
              </Link>
            );
          }
          return (
            <Typography
              key={`${crumb.label}-${idx}`}
              color={isLast ? 'text.primary' : 'text.secondary'}
              sx={{ display: 'inline-flex', alignItems: 'center', fontSize: 13, fontWeight: isLast ? 700 : 500 }}
            >
              {isHome && <HomeIcon fontSize="small" sx={{ mr: 0.5 }} />}
              {crumb.label}
            </Typography>
          );
        })}
      </Breadcrumbs>
    </Box>
  );
}
