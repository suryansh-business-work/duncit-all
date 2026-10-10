import { Link as RouterLink } from 'react-router';
import { Box, Link, List, ListItemButton, ListItemIcon, ListItemText, Stack, Tooltip } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import { DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { STUDIO_OPTIONS_ENTRY, type PartnerStudioMode, type StudioOptionItem } from '@duncit/utils';
import { STUDIO_OPTION_ICONS } from '../../pages/studio-options-page/optionIcons';

interface Props {
  mode: PartnerStudioMode;
  options: readonly StudioOptionItem[];
  /** The option the open page belongs to, or `null` for a page that is none of them. */
  active: StudioOptionItem | null;
  collapsed: boolean;
  onToggle: () => void;
}

/** The open menu, and the icon rail it minimises to (md and up). */
const menuWidth = (theme: Theme) => theme.spacing(28);
const railWidth = (theme: Theme) => theme.spacing(7);

const MENU_ID = 'studio-menu-options';

/**
 * The studio's options as a menu that stays beside whichever page is open, so
 * moving between a studio's pages never means going back to the Options page.
 *
 * From `md` up it is a column to the left of the page, minimised to an icon
 * rail; below `md` it is a strip above the page that scrolls sideways, and
 * minimising folds it down to its heading. Every entry is the same link the
 * Options page lists, in the same order.
 */
export default function StudioMenu({ mode, options, active, collapsed, onToggle }: Readonly<Props>) {
  const { t } = useTranslation();
  const entry = STUDIO_OPTIONS_ENTRY[mode];
  const title = t(entry.labelKey);
  // Hidden with CSS, not unmounted, wherever the layout has no room for words:
  // the links keep their names for a screen reader and for the page search.
  const wordsOnWide = collapsed ? 'none' : 'block';

  return (
    <Box
      component="nav"
      aria-label={title}
      data-testid="studio-menu"
      data-collapsed={collapsed}
      sx={{
        flexShrink: 0,
        alignSelf: { md: 'flex-start' },
        position: { md: 'sticky' },
        top: { md: 0 },
        width: { xs: '100%', md: collapsed ? railWidth : menuWidth },
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        bgcolor: 'background.paper',
        overflow: 'hidden',
        transition: (theme) => theme.transitions.create('width', { duration: theme.transitions.duration.shorter }),
      }}
    >
      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: 'center', justifyContent: { xs: 'space-between', md: collapsed ? 'center' : 'space-between' }, p: 1 }}
      >
        <Link
          component={RouterLink}
          to={entry.portal}
          underline="hover"
          variant="subtitle2"
          noWrap
          data-testid="studio-menu-title"
          sx={{ display: { xs: 'block', md: wordsOnWide }, minWidth: 0, pl: 1, color: 'text.primary' }}
        >
          {collapsed && active ? t(active.labelKey) : title}
        </Link>
        <DuncitIconButton
          size="small"
          onClick={onToggle}
          aria-expanded={!collapsed}
          aria-controls={MENU_ID}
          aria-label={collapsed ? t('shell.chrome.expandNav') : t('shell.chrome.collapseNav')}
          data-testid="studio-menu-toggle"
        >
          {collapsed ? <MenuIcon fontSize="small" /> : <MenuOpenIcon fontSize="small" />}
        </DuncitIconButton>
      </Stack>
      <List
        id={MENU_ID}
        disablePadding
        sx={{
          display: { xs: collapsed ? 'none' : 'flex', md: 'block' },
          overflowX: { xs: 'auto', md: 'hidden' },
          borderTop: 1,
          borderColor: 'divider',
          p: 1,
          gap: 0.5,
        }}
      >
        {options.map((option) => {
          const Icon = STUDIO_OPTION_ICONS[option.icon];
          const label = t(option.labelKey);
          const selected = option.key === active?.key;
          return (
            // The tooltip is the entry's name on the icon rail, where there are
            // no words; with the words showing it would only repeat them.
            <Tooltip
              key={option.key}
              title={label}
              placement="right"
              disableHoverListener={!collapsed}
              disableFocusListener={!collapsed}
              disableTouchListener
            >
              <ListItemButton
                component={RouterLink}
                to={option.portal}
                selected={selected}
                aria-current={selected ? 'page' : undefined}
                data-testid={`studio-menu-item-${option.key}`}
                sx={{ flexShrink: 0, borderRadius: 1, mb: { md: 0.5 }, justifyContent: { md: collapsed ? 'center' : 'flex-start' } }}
              >
                <ListItemIcon sx={{ minWidth: 0, mr: { xs: 1, md: collapsed ? 0 : 1.5 }, color: selected ? 'primary.main' : 'text.secondary' }}>
                  <Icon fontSize="small" aria-hidden />
                </ListItemIcon>
                <ListItemText
                  primary={label}
                  slotProps={{ primary: { variant: 'body2', noWrap: true } }}
                  sx={{ display: { xs: 'block', md: wordsOnWide }, my: 0 }}
                />
              </ListItemButton>
            </Tooltip>
          );
        })}
      </List>
    </Box>
  );
}
