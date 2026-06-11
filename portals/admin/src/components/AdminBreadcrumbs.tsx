import { useMemo } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { Box, Breadcrumbs, Link, Typography } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { NAV, isNavGroup, type NavGroup, type NavLeaf, type NavSection } from '../AdminLayout';

interface Crumb {
  label: string;
  to?: string;
}

const STATIC_LABELS: Record<string, string> = {
  '/': 'Home',
  '/hub': 'Modules',
  '/login': 'Login',
  '/profile': 'Profile',
};

function humanise(segment: string): string {
  // Skip mongo-style ids and uuids — they aren't useful in a breadcrumb label.
  if (/^[a-f0-9]{24}$/i.test(segment) || /^[0-9a-f-]{20,}$/i.test(segment)) {
    return 'Detail';
  }
  return segment
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function findInSection(section: NavSection, pathname: string): {
  group?: NavGroup;
  leaf?: NavLeaf;
} | null {
  let bestLeaf: NavLeaf | undefined;
  let bestLeafLen = -1;
  let bestGroup: NavGroup | undefined;

  for (const item of section.items) {
    if (isNavGroup(item)) {
      const groupPrefix = item.matchPrefix;
      const groupMatches =
        (groupPrefix && (pathname === groupPrefix || pathname.startsWith(groupPrefix + '/'))) ||
        item.children.some(
          (c) => pathname === c.to || pathname.startsWith(c.to + '/')
        );
      if (!groupMatches) continue;
      bestGroup = item;
      for (const child of item.children) {
        if (
          (pathname === child.to || pathname.startsWith(child.to + '/')) &&
          child.to.length > bestLeafLen
        ) {
          bestLeaf = child;
          bestLeafLen = child.to.length;
        }
      }
    } else {
      if (
        (pathname === item.to || pathname.startsWith(item.to + '/')) &&
        item.to.length > bestLeafLen
      ) {
        bestLeaf = item;
        bestLeafLen = item.to.length;
      }
    }
  }

  if (!bestLeaf && !bestGroup) return null;
  return { group: bestGroup, leaf: bestLeaf };
}

export default function AdminBreadcrumbs() {
  const location = useLocation();
  const pathname = location.pathname;

  const crumbs = useMemo<Crumb[]>(() => {
    const list: Crumb[] = [{ label: 'Home', to: '/hub' }];

    if (STATIC_LABELS[pathname] && pathname !== '/hub') {
      list.push({ label: STATIC_LABELS[pathname] });
      return list;
    }

    const matchedSection = NAV.find((section) =>
      section.prefixes?.some(
        (p) => pathname === p || pathname.startsWith(p + '/') || pathname.startsWith(p)
      )
    );

    if (!matchedSection) {
      // Unknown route: humanise the trailing segments.
      const segments = pathname.split('/').filter(Boolean);
      segments.forEach((seg, idx) => {
        const to = '/' + segments.slice(0, idx + 1).join('/');
        list.push({ label: humanise(seg), to: idx === segments.length - 1 ? undefined : to });
      });
      return list;
    }

    if (matchedSection.heading) {
      list.push({ label: matchedSection.heading });
    }

    const found = findInSection(matchedSection, pathname);
    if (found?.group) list.push({ label: found.group.label });

    if (found?.leaf) {
      list.push({ label: found.leaf.label, to: found.leaf.to });

      // Trailing dynamic segment (e.g. /users/:id) that isn't part of the leaf path.
      if (pathname !== found.leaf.to && pathname.startsWith(found.leaf.to + '/')) {
        const rest = pathname.slice(found.leaf.to.length + 1).split('/').filter(Boolean);
        rest.forEach((seg) => list.push({ label: humanise(seg) }));
      }
    } else if (matchedSection.prefixes && matchedSection.prefixes.length > 0) {
      // Section matched but no specific leaf — humanise extra segments.
      const prefix = matchedSection.prefixes.find((p) => pathname.startsWith(p)) ?? '';
      const rest = pathname.slice(prefix.length).split('/').filter(Boolean);
      rest.forEach((seg) => list.push({ label: humanise(seg) }));
    }

    // Mark last crumb as current (no link).
    if (list.length > 0) {
      const last = list[list.length - 1];
      if (last) last.to = undefined;
    }

    return list;
  }, [pathname]);

  if (pathname === '/' || pathname === '/login') return null;

  return (
    <Box
      sx={{
        px: { xs: 2, md: 4 },
        py: 1.25,
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
                sx={{ display: 'inline-flex', alignItems: 'center', fontSize: 13.5, fontWeight: 500 }}
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
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                fontSize: 13.5,
                fontWeight: isLast ? 700 : 500,
              }}
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
