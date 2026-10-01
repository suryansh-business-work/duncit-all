import type { ReactNode, RefObject } from 'react';
import { Box } from '@mui/material';
import { AppBreadcrumbs, BreadcrumbProvider } from '@duncit/breadcrumb';
import PortalPageTitle from '../PortalPageTitle';
import type { AppNavItem } from '../../types';

/** The skip link's target — the page region every console's layout names. */
export const MAIN_ID = 'main-content';

interface Props {
  /** Already localised — the same tree the sidebar and the header read. */
  nav: AppNavItem[];
  shortName: string;
  appName: string;
  labelMap?: Record<string, string>;
  /** Owned by the shell, which moves focus here on every route change. */
  mainRef: RefObject<HTMLElement | null>;
  children: ReactNode;
}

/** The page column: its title, its breadcrumbs, and the scroller the page lives in. */
export function AppShellMain({ nav, shortName, appName, labelMap, mainRef, children }: Readonly<Props>) {
  return (
    <BreadcrumbProvider>
      <PortalPageTitle
        nav={nav}
        shortName={shortName}
        appName={appName}
        labelMap={labelMap}
      />
      <AppBreadcrumbs nav={nav} appName={shortName} labelMap={labelMap} />
      {/* The page's own scroller. `contain` stops a wheel that reaches
          the end of this box from carrying on into the chat beside it —
          scroll chaining is what made the two feel welded together. */}
      <Box
        component="main"
        id={MAIN_ID}
        ref={mainRef}
        tabIndex={-1}
        data-testid="app-shell-main"
        sx={{
          flex: 1,
          minWidth: 0,
          minHeight: 0,
          overflowY: 'auto',
          overscrollBehavior: 'contain',
          p: { xs: 1.5, sm: 2.25, md: 3 },
        }}
      >
        {children}
      </Box>
    </BreadcrumbProvider>
  );
}
