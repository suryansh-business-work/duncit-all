import { useState, type ReactNode } from 'react';
import { Box, Drawer, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import AdminBreadcrumbs from '../components/AdminBreadcrumbs';
import AdminAiChatButton from '../components/AdminAiChatButton';
import { NotifyHost } from '../components/notify';
import { Content, DRAWER_WIDTH, Main, Root } from './styled';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import ModuleWelcomeOverlay from './ModuleWelcomeOverlay';

export default function AdminLayout({ children }: Readonly<{ children: ReactNode }>) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeMobile = () => setMobileOpen(false);

  return (
    <Root>
      <Box
        component="nav"
        sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}
        aria-label="admin navigation"
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={closeMobile}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { width: DRAWER_WIDTH },
          }}
        >
          <Sidebar onCloseMobile={closeMobile} />
        </Drawer>
        <Drawer
          variant="permanent"
          open
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' },
          }}
        >
          <Sidebar onCloseMobile={closeMobile} />
        </Drawer>
      </Box>

      <Main>
        <Topbar isDesktop={isDesktop} onOpenMobile={() => setMobileOpen(true)} />
        <AdminBreadcrumbs />
        <Content>{children}</Content>
      </Main>
      <AdminAiChatButton />
      <NotifyHost />
      <ModuleWelcomeOverlay />
    </Root>
  );
}
