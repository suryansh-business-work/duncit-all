import type { Components, Theme } from '@mui/material/styles';
import { withPress } from '@duncit/buttons';
import type { ThemeCtx } from '../types';
import { cssBaseline } from './cssBaseline';
import { appBar, paper, card, dialog, divider, menu, autocomplete } from './surfaces';
import { button, iconButton } from './buttons';
import { textField, select, formLabel, formHelperText, outlinedInput } from './inputs';
import { chip } from './chip';
import { tooltip } from './tooltip';
import { table, tableHead, tableCell } from './table';
import { listItemButton } from './list';
import { alert, avatar } from './feedback';

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
      MuiDialog: dialog(c),
      MuiMenu: menu(),
      MuiAutocomplete: autocomplete(),
      MuiDivider: divider(c),
      MuiButton: button(c),
      MuiIconButton: iconButton(c),
      MuiTextField: textField(),
      MuiSelect: select(),
      MuiFormLabel: formLabel(c),
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
    },
    { ink: c.ink, accent: c.primary }
  );
}
