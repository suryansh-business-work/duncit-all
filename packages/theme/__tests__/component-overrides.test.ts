import { describe, it, expect } from 'vitest';
import type { Theme } from '@mui/material/styles';
import { tokens } from '../src/tokens';
import { buildThemeCtx } from '../src/context';
import { createDuncitTheme } from '../src/createDuncitTheme';
import { iconButton } from '../src/components/buttons';
import { tab, toggleButton } from '../src/components/navigation';
import {
  autocomplete,
  dialog,
  dialogActions,
  dialogContent,
  dialogTitle,
  menu,
  menuItem,
} from '../src/components/overlays';
import { tooltip } from '../src/components/tooltip';

const theme: Theme = createDuncitTheme('light');
const ctx = buildThemeCtx('light', tokens.defaultAccent);

type Css = Record<string, unknown>;
type StyleFn = (props: { theme: Theme }) => Css;

/** Runs a function-form `styleOverrides` slot the way MUI does, with the theme. */
const run = (slot: unknown): Css => (slot as StyleFn)({ theme });
const phone = theme.breakpoints.down('sm');

describe('overlay overrides', () => {
  it('floats the dialog on the raised layer and keeps a margin on a phone', () => {
    const slots = dialog(ctx)?.styleOverrides;
    const paper = run(slots?.paper);
    expect(paper.backgroundColor).toBe(ctx.raised);
    expect(paper.boxShadow).toBe(ctx.shadow.dialog);
    expect(paper.borderRadius).toBe(tokens.radius.lg);
    expect(paper[phone]).toEqual({
      margin: theme.spacing(1.5),
      width: `calc(100% - ${theme.spacing(3)})`,
      maxHeight: `calc(100% - ${theme.spacing(3)})`,
    });
    const fullScreen = run(slots?.paperFullScreen);
    expect(fullScreen.borderRadius).toBe(0);
    expect(fullScreen[phone]).toEqual({ margin: 0, width: '100%', maxHeight: '100%' });
  });

  it('spaces the dialog title, content and footer band from the 8px scale', () => {
    expect(run(dialogTitle(ctx)?.styleOverrides?.root).padding).toBe(theme.spacing(2, 2.5, 1));
    const content = dialogContent(ctx)?.styleOverrides;
    expect(run(content?.root).padding).toBe(theme.spacing(1, 2.5, 2));
    expect(run(content?.dividers).borderColor).toBe(ctx.border);
    const actions = run(dialogActions(ctx)?.styleOverrides?.root);
    expect(actions.borderTop).toBe(`1px solid ${ctx.border}`);
    expect(actions.gap).toBe(theme.spacing(1));
  });

  it('caps and pads menus, and sizes a menu row to the control height from sm up', () => {
    const slots = menu()?.styleOverrides;
    expect(run(slots?.paper).minWidth).toBe(theme.spacing(22));
    expect(run(slots?.list).padding).toBe(theme.spacing(0.5));
    const item = run(menuItem(ctx)?.styleOverrides?.root);
    expect(item.fontSize).toBe(tokens.font.size.body2);
    expect(item[theme.breakpoints.up('sm')]).toEqual({ minHeight: tokens.size.controlMd });
  });

  it('puts the autocomplete popup on the raised layer', () => {
    const slots = autocomplete(ctx)?.styleOverrides;
    const paper = run(slots?.paper);
    expect(paper.backgroundColor).toBe(ctx.raised);
    expect(paper.marginTop).toBe(theme.spacing(0.5));
    expect(run(slots?.listbox).padding).toBe(theme.spacing(0.5));
  });
});

describe('navigation overrides', () => {
  it('draws the current tab in ink and the rest muted', () => {
    const root = run(tab(ctx)?.styleOverrides?.root);
    expect(root.color).toBe(ctx.muted);
    expect(root['&.Mui-selected']).toEqual({ color: ctx.ink });
    expect(root.padding).toBe(theme.spacing(1, 1.5));
  });

  it('tints the selected toggle button', () => {
    const root = run(toggleButton(ctx)?.styleOverrides?.root);
    expect(root['&.Mui-selected']).toMatchObject({ backgroundColor: ctx.selected, color: ctx.ink });
  });
});

describe('control overrides', () => {
  it('pads icon buttons from the spacing scale', () => {
    const slots = iconButton(ctx)?.styleOverrides;
    expect(run(slots?.sizeSmall).padding).toBe(theme.spacing(0.5));
    expect(run(slots?.sizeMedium).padding).toBe(theme.spacing(0.75));
  });

  it('inverts the tooltip against the page in each mode', () => {
    const light = run(tooltip(ctx)?.styleOverrides?.tooltip);
    expect(light).toMatchObject({ backgroundColor: ctx.ink, color: ctx.white, padding: theme.spacing(0.5, 1) });
    const darkCtx = buildThemeCtx('dark', tokens.defaultAccent);
    const dark = run(tooltip(darkCtx)?.styleOverrides?.tooltip);
    expect(dark).toMatchObject({ backgroundColor: darkCtx.white, color: tokens.neutral[900] });
  });
});
