import { useRef, useState } from 'react';
import { Outlet } from 'react-router';
import { Box, Drawer, Toolbar } from '@mui/material';
import { useRouteFocus } from '@duncit/ui';
import { usePortalT } from '../../shared/i18n';
import { ConsoleAppBar } from './ConsoleAppBar';
import { ConsoleNav } from './ConsoleNav';
import { DRAWER_WIDTH } from './nav-items';

const MAIN_ID = 'console-main';

/**
 * The console chrome: a fixed app bar, a permanent drawer on desktop that
 * becomes a temporary one on phones, and the page region the routes render
 * into. Focus moves to the region on every route change (WCAG 2.4.3).
 */
export function ConsoleShell() {
  const { t } = usePortalT();
  const [navOpen, setNavOpen] = useState(false);
  const mainRef = useRef<HTMLElement | null>(null);
  useRouteFocus(mainRef);
  const closeNav = () => setNavOpen(false);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
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
      <ConsoleAppBar onOpenNav={() => setNavOpen(true)} />
      <Drawer
        variant="temporary"
        open={navOpen}
        onClose={closeNav}
        ModalProps={{ keepMounted: true }}
        sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { width: DRAWER_WIDTH } }}
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
          '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box', borderRight: 1, borderColor: 'divider' },
        }}
      >
        <ConsoleNav />
      </Drawer>
      <Box
        component="main"
        id={MAIN_ID}
        ref={mainRef}
        tabIndex={-1}
        sx={{ flexGrow: 1, minWidth: 0, p: { xs: 2, md: 3 }, outline: 'none' }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}
