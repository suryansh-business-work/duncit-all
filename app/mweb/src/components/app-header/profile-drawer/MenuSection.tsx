import { Children, Fragment, isValidElement, useState, type ReactNode } from 'react';
import { Box, ButtonBase, Collapse, Divider, Typography } from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { RADIUS, SURFACE_SX } from '../../../theme';
import { profileIcon } from './profileIcons';
import type { ProfileIconKey } from './profileSections';

interface Props {
  id: string;
  icon: ProfileIconKey;
  title: string;
  subtitle: string;
  children: ReactNode;
}

/**
 * One collapsible section card of the menu: a rounded icon tile, the bold
 * title and a one-line muted subtitle naming what is inside, with a chevron
 * that turns as it opens. Collapsed by default; opened, its rows sit under a
 * hairline in the same card. The header is a real button (Enter/Space) with
 * `aria-expanded`; the opened rows are a region named by the title. Native twin: Sidebar/SidebarSection.
 */
export default function MenuSection({ id, icon, title, subtitle, children }: Readonly<Props>) {
  const [open, setOpen] = useState(false);
  const rows = Children.toArray(children).filter(isValidElement);

  return (
    <Box sx={{ px: 2, pb: 1.5 }}>
      <Box data-testid={`sidebar-section-${id}`} sx={{ ...SURFACE_SX, overflow: 'hidden' }}>
        <ButtonBase
          data-testid={`sidebar-section-${id}-toggle`}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          sx={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            minHeight: 68,
            px: 2,
            py: 1.5,
            textAlign: 'left',
            '&:hover': { bgcolor: 'action.hover' },
            '&.Mui-focusVisible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: -2 },
          }}
        >
          <Box
            component="span"
            aria-hidden
            sx={{
              width: 40,
              height: 40,
              flexShrink: 0,
              borderRadius: `${RADIUS.tooltip}px`,
              display: 'grid',
              placeItems: 'center',
              bgcolor: 'action.hover',
              color: 'secondary.main',
              '& svg': { fontSize: 22 },
            }}
          >
            {profileIcon(icon)}
          </Box>
          <Box component="span" sx={{ flex: 1, minWidth: 0 }}>
            <Typography component="span" noWrap sx={{ display: 'block', fontSize: 15, fontWeight: 700 }}>
              {title}
            </Typography>
            <Typography
              component="span"
              data-testid={`sidebar-section-${id}-subtitle`}
              noWrap
              sx={{ display: 'block', fontSize: 12, color: 'text.secondary' }}
            >
              {subtitle}
            </Typography>
          </Box>
          <ChevronRightIcon
            aria-hidden
            sx={{
              fontSize: 22,
              color: 'text.secondary',
              transform: open ? 'rotate(90deg)' : 'none',
              transition: 'transform 160ms ease',
              '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
            }}
          />
        </ButtonBase>
        <Collapse in={open} timeout="auto" unmountOnExit>
          <Box role="region" aria-label={title}>
            {rows.map((row) => (
              <Fragment key={row.key}>
                <Divider sx={{ mx: 2 }} />
                {row}
              </Fragment>
            ))}
          </Box>
        </Collapse>
      </Box>
    </Box>
  );
}
