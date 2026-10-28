import { useRef, useState } from 'react';
import { Outlet } from 'react-router';
import { Box, Drawer } from '@mui/material';
import { LITE_RADII } from '../../shared/tokens';
import { useRouteFocus } from '@duncit/ui';
import { usePortalT } from '../../shared/i18n';
import { ConsoleAppBar } from './ConsoleAppBar';
import { ConsoleNav } from './ConsoleNav';
import { DRAWER_WIDTH } from './nav-items';

const MAIN_ID = 'console-main';

/** The page ground the sidebar sits on (as in every Duncit portal), and the drawer paper on it. */
const SIDEBAR_PAPER = { width: DRAWER_WIDTH, boxSizing: 'border-box', bgcolor: 'background.default', borderRight: 0 } as const;

/**
 * The work sits on one framed panel inset from the ground, so where navigation
 * ends and the page begins reads without a heavy divider. From md up it scrolls
 * on its own under a sticky header; on a phone it runs edge to edge.
 */
const PANEL = {
  flex: 1,
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  bgcolor: 'background.paper',
  m: { md: 1 },
  ml: { md: 0 },
  height: { md: 'calc(100dvh - 16px)' },
  overflowY: { md: 'auto' },
  border: { md: 1 },
  borderColor: { md: 'divider' },
  borderRadius: { md: `${LITE_RADII.card}px` },
} as const;

/**
 * The console chrome, laid out like the other Duncit portals: the sidebar on
 * the page ground (a permanent drawer on desktop, a sheet on phones) and the
 * header and page on a framed panel beside it. Focus moves to the page region
 * on every route change (WCAG 2.4.3).
 */
export function ConsoleShell() {
  const { t } = usePortalT();
  const [navOpen, setNavOpen] = useState(false);
  const mainRef = useRef<HTMLElement | null>(null);
  useRouteFocus(mainRef);
  const closeNav = () => setNavOpen(false);

  return (
    <Box sx={{ display: 'flex', minHeight: '100dvh', bgcolor: 'background.default' }}>
      <Box
        component="a"
        href={`#${MAIN_ID}`}
        sx={{
          position: 'absolute',
          left: -9999,
          top: 8,
          zIndex: (theme) => theme.zIndex.tooltip,
          px: 2,
          py: 1,
          bgcolor: 'background.paper',
          borderRadius: 1,
          '&:focus': { left: 8 },
        }}
      >
        {t('lite.common.skipToContent')}
      </Box>
      <Drawer
        variant="temporary"
        open={navOpen}
        onClose={closeNav}
        ModalProps={{ keepMounted: true }}
        sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': SIDEBAR_PAPER }}
      >
        <ConsoleNav onNavigate={closeNav} />
      </Drawer>
      <Drawer
        variant="permanent"
        open
        sx={{
          display: { xs: 'none', md: 'block' },
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': SIDEBAR_PAPER,
        }}
      >
        <ConsoleNav />
      </Drawer>
      <Box sx={PANEL}>
        <ConsoleAppBar onOpenNav={() => setNavOpen(true)} />
        <Box component="main" id={MAIN_ID} ref={mainRef} tabIndex={-1} sx={{ flexGrow: 1, minWidth: 0, p: { xs: 2, md: 3 }, outline: 'none' }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
