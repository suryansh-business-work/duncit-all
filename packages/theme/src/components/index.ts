import type { Components, Theme } from '@mui/material/styles';
import { withPress } from '@duncit/buttons';
import type { ThemeCtx } from '../types';
import { cssBaseline } from './cssBaseline';
import {
  appBar,
  paper,
  card,
  cardActionArea,
  cardHeader,
  divider,
  accordion,
  accordionSummary,
} from './surfaces';
import {
  dialog,
  dialogTitle,
  dialogContent,
  dialogActions,
  backdrop,
  drawer,
  popover,
  menu,
  menuItem,
  autocomplete,
} from './overlays';
import { button, iconButton } from './buttons';
import {
  textField,
  select,
  formLabel,
  formHelperText,
  inputBase,
  outlinedInput,
  switchControl,
} from './inputs';
import { chip } from './chip';
import { tooltip } from './tooltip';
import { table, tableHead, tableCell, tableRow, tablePagination } from './table';
import { listItemButton, listItemIcon, listSubheader } from './list';
import { alert, alertTitle, avatar, skeleton, linearProgress } from './feedback';
import { tabs, tab, toggleButton, breadcrumbs, paginationItem } from './navigation';

/** Extra per-portal component overrides, computed from the same context. */
export type ComponentExtend = (ctx: ThemeCtx) => Components<Theme>;

/**
 * Assemble every component override from the derived context (+ optional extend).
 *
 * The press system is layered LAST so it merges into whatever each override
 * above already declared, and so a portal-specific `extend` cannot silently
 * drop the pressed state off a component it happened to restyle.
 */
export function buildComponents(c: ThemeCtx, extend?: ComponentExtend): Components<Theme> {
  return withPress(
    {
      MuiCssBaseline: cssBaseline(c),
      MuiAppBar: appBar(c),
      MuiPaper: paper(c),
      MuiCard: card(c),
      MuiCardActionArea: cardActionArea(c),
      MuiCardHeader: cardHeader(c),
      MuiAccordion: accordion(c),
      MuiAccordionSummary: accordionSummary(c),
      MuiDialog: dialog(c),
      MuiDialogTitle: dialogTitle(c),
      MuiDialogContent: dialogContent(c),
      MuiDialogActions: dialogActions(c),
      MuiBackdrop: backdrop(c),
      MuiDrawer: drawer(c),
      MuiPopover: popover(c),
      MuiMenu: menu(),
      MuiMenuItem: menuItem(c),
      MuiAutocomplete: autocomplete(c),
      MuiDivider: divider(c),
      MuiButton: button(c),
      MuiIconButton: iconButton(c),
      MuiTextField: textField(),
      MuiSelect: select(c),
      MuiFormLabel: formLabel(c),
      MuiFormHelperText: formHelperText(c),
      MuiInputBase: inputBase(c),
      MuiOutlinedInput: outlinedInput(c),
      MuiSwitch: switchControl(c),
      MuiChip: chip(c),
      MuiTooltip: tooltip(c),
      MuiTable: table(),
      MuiTableHead: tableHead(c),
      MuiTableCell: tableCell(c),
      MuiTableRow: tableRow(c),
      MuiTablePagination: tablePagination(c),
      MuiListItemButton: listItemButton(c),
      MuiListItemIcon: listItemIcon(c),
      MuiListSubheader: listSubheader(c),
      MuiAlert: alert(c),
      MuiAlertTitle: alertTitle(c),
      MuiAvatar: avatar(c),
      MuiSkeleton: skeleton(c),
      MuiLinearProgress: linearProgress(c),
      MuiTabs: tabs(c),
      MuiTab: tab(c),
      MuiToggleButton: toggleButton(c),
      MuiBreadcrumbs: breadcrumbs(c),
      MuiPaginationItem: paginationItem(c),
      ...(extend ? extend(c) : {}),
    },
    { ink: c.ink, accent: c.primary }
  );
}
