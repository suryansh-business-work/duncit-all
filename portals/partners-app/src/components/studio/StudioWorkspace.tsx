import { useMemo, useState, type JSX } from 'react';
import { useLocation } from 'react-router';
import { Box, useMediaQuery } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import { useFeatureFlag, useProductVisibility } from '@duncit/app-settings';
import { useUserData } from '@duncit/user-context';
import { studioOptionsFor } from '@duncit/utils';
import { activeSection } from '../../config/partner-sections';
import StudioMenu from './StudioMenu';
import { activeStudioOption, readStudioMenuCollapsed, showsStudioMenu, writeStudioMenuCollapsed } from './studio-menu-state';
import { useActiveStudio } from './useActiveStudio';

/**
 * A studio page with the studio's menu beside it.
 *
 * Each studio has ONE sidebar entry — its Options page — so opening an option
 * used to leave the list of them behind: every move to another page went back
 * through Options. Here the same list stays next to the page, and can be
 * minimised to give the page the room back. The page itself is untouched.
 */
export default function StudioWorkspace({ children }: Readonly<{ children: JSX.Element }>) {
  const { pathname, search } = useLocation();
  const { user } = useUserData();
  const { visible: products } = useProductVisibility();
  const autoPods = useFeatureFlag('auto_pods');
  const activeRole = useActiveStudio();
  const roles = user?.roles;
  const section = activeSection(roles, products, activeRole);
  const mode = section?.mode;
  const options = useMemo(
    () => (mode ? studioOptionsFor(mode, roles ?? [], { autoPods }) : []),
    [mode, roles, autoPods],
  );
  // Between `md` and `lg` the sidebar and an open menu leave the page too
  // narrow, so the menu starts as its rail there — until the partner says otherwise.
  const tight = useMediaQuery((theme: Theme) => theme.breakpoints.between('md', 'lg'));
  const [chosen, setChosen] = useState(readStudioMenuCollapsed);
  const collapsed = chosen ?? tight;

  if (!section || !showsStudioMenu(section, options, pathname)) return children;

  const toggle = () => {
    writeStudioMenuCollapsed(!collapsed);
    setChosen(!collapsed);
  };

  return (
    <Box
      data-testid="studio-workspace"
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        alignItems: { md: 'flex-start' },
        gap: { xs: 1.5, md: 2.5 },
        width: '100%',
      }}
    >
      <StudioMenu
        mode={section.mode}
        options={options}
        active={activeStudioOption(options, pathname, search)}
        collapsed={collapsed}
        onToggle={toggle}
      />
      <Box sx={{ flex: 1, minWidth: 0, width: { xs: '100%', md: 'auto' } }}>{children}</Box>
    </Box>
  );
}
