import type { Components, Theme } from '@mui/material/styles';
import type { ThemeCtx } from '../types';
import { cssBaseline } from './cssBaseline';
import { appBar, paper, card, dialog, divider } from './surfaces';
import { button, iconButton } from './buttons';
import { textField, select, formHelperText, outlinedInput } from './inputs';
import { chip } from './chip';
import { tooltip } from './tooltip';
import { table, tableHead, tableCell } from './table';
import { listItemButton } from './list';
import { alert, avatar } from './feedback';

/** Extra per-portal component overrides, computed from the same context. */
export type ComponentExtend = (ctx: ThemeCtx) => Components<Theme>;

/** Assemble every component override from the derived context (+ optional extend). */
export function buildComponents(c: ThemeCtx, extend?: ComponentExtend): Components<Theme> {
  return {
    MuiCssBaseline: cssBaseline(c),
    MuiAppBar: appBar(c),
    MuiPaper: paper(c),
    MuiCard: card(c),
    MuiDialog: dialog(c),
    MuiDivider: divider(c),
    MuiButton: button(c),
    MuiIconButton: iconButton(c),
    MuiTextField: textField(),
    MuiSelect: select(),
    MuiFormHelperText: formHelperText(c),
    MuiOutlinedInput: outlinedInput(c),
    MuiChip: chip(c),
    MuiTooltip: tooltip(c),
    MuiTable: table(),
    MuiTableHead: tableHead(c),
    MuiTableCell: tableCell(c),
    MuiListItemButton: listItemButton(c),
    MuiAlert: alert(c),
    MuiAvatar: avatar(c),
    ...(extend ? extend(c) : {}),
  };
}
