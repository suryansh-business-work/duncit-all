import { useMemo } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { Box, Breadcrumbs, Link, Typography } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';

interface Crumb {
  label: string;
  to?: string;
}

const PARTNER_NAV: { label: string; to: string; match: string }[] = [
  { label: 'Dashboard', to: '/', match: '/' },
  { label: 'Venue Management', to: '/register-venue', match: '/register-venue' },
  { label: 'Venue Dashboard', to: '/venues/dashboard', match: '/venues/dashboard' },
  { label: 'Slot Requests', to: '/venues/requests', match: '/venues/requests' },
  { label: 'Host', to: '/become-host', match: '/become-host' },
  { label: 'E-Commerce Brand', to: '/ecomm-brand', match: '/ecomm-brand' },
  { label: 'FAQs', to: '/faqs', match: '/faqs' },
  { label: 'Support', to: '/support', match: '/support' },
  { label: 'Policies', to: '/policies', match: '/policies' },
];

const HEX_ID_RE = /^[a-f0-9]{24}$/i;
const UUID_RE = /^[0-9a-f-]{20,}$/i;

function humanise(segment: string): string {
  if (HEX_ID_RE.test(segment) || UUID_RE.test(segment)) return 'Detail';
  return segment.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function AppBreadcrumbs() {
  const { pathname } = useLocation();

  const crumbs = useMemo<Crumb[]>(() => {
    const list: Crumb[] = [{ label: 'Partners', to: '/' }];

    let best: { label: string; to: string } | undefined;
    for (const item of PARTNER_NAV) {
      if (item.match === '/' && pathname === '/') continue;
      if (pathname === item.match || pathname.startsWith(item.match + '/')) {
        if (!best || item.match.length > best.to.length) {
          best = { label: item.label, to: item.match };
        }
      }
    }

    if (best) {
      list.push({ label: best.label, to: best.to });
      if (pathname !== best.to && pathname.startsWith(best.to + '/')) {
        const rest = pathname.slice(best.to.length + 1).split('/').filter(Boolean);
        rest.forEach((seg) => list.push({ label: humanise(seg) }));
      }
    } else if (pathname !== '/' && pathname !== '/login') {
      pathname
        .split('/')
        .filter(Boolean)
        .forEach((seg, idx, arr) => {
          const to = '/' + arr.slice(0, idx + 1).join('/');
          list.push({ label: humanise(seg), to: idx === arr.length - 1 ? undefined : to });
        });
    }

    if (list.length > 0) {
      const last = list[list.length - 1];
      if (last) last.to = undefined;
    }
    return list;
  }, [pathname]);

  if (pathname === '/' || pathname === '/login') return null;

  return (
    <Box sx={{ px: { xs: 1.5, md: 3 }, py: 1, borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
      <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} aria-label="breadcrumb" sx={{ '& .MuiBreadcrumbs-ol': { alignItems: 'center' } }}>
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
