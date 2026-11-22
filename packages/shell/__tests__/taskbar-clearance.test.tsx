import { describe, it, expect } from 'vitest';
import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { Drawer } from '@mui/material';
import { ThemeProvider, createTheme, type Theme } from '@mui/material/styles';
import { createDuncitTheme, tokens } from '@duncit/theme';
import { withTaskbarClearance } from '../src/workspace';

type Anchor = 'left' | 'right' | 'top' | 'bottom';

const ABOVE_BAR = `calc(100% - ${tokens.size.taskbarHeight}px)`;

/** An open temporary drawer, its paper named so the test can find the dialog. */
function Sheet({ anchor, height }: Readonly<{ anchor: Anchor; height?: string }>) {
  return (
    <Drawer
      anchor={anchor}
      open
      slotProps={{ paper: { 'aria-label': `${anchor} sheet`, sx: height ? { height } : undefined } }}
    >
      <p>body</p>
    </Drawer>
  );
}

function renderIn(theme: Theme, ui: ReactNode, cleared = true) {
  return render(
    <ThemeProvider theme={theme}>
      {cleared ? <ThemeProvider theme={withTaskbarClearance}>{ui}</ThemeProvider> : ui}
    </ThemeProvider>,
  );
}

const paperOf = (anchor: Anchor) => screen.getByRole('dialog', { name: `${anchor} sheet` });

describe('withTaskbarClearance', () => {
  it.each(['left', 'right'] as const)('ends a %s side sheet where the taskbar starts', (anchor) => {
    renderIn(createDuncitTheme('light'), <Sheet anchor={anchor} />);
    expect(paperOf(anchor)).toHaveStyle({ height: ABOVE_BAR, top: '0px' });
  });

  it('lifts a bottom sheet onto the taskbar and caps it at the same line', () => {
    renderIn(createDuncitTheme('light'), <Sheet anchor="bottom" />);
    expect(paperOf('bottom')).toHaveStyle({
      bottom: `${tokens.size.taskbarHeight}px`,
      maxHeight: ABOVE_BAR,
    });
  });

  it('caps a top sheet so a long one cannot run under the taskbar', () => {
    renderIn(createDuncitTheme('light'), <Sheet anchor="top" />);
    // Height stays MUI's `auto`: only the ceiling moves, not the sheet's size.
    expect(paperOf('top')).toHaveStyle({ maxHeight: ABOVE_BAR, height: 'auto' });
  });

  it('keeps the theme’s own paper look instead of replacing it', () => {
    // Dark mode is where MUI would paint its elevation gradient over a Paper;
    // the Duncit drawer override removes it, and the clearance must not undo that.
    renderIn(createDuncitTheme('dark'), <Sheet anchor="right" />);
    expect(paperOf('right')).toHaveStyle({ backgroundImage: 'none', height: ABOVE_BAR });
  });

  it('lets a drawer that measures itself keep its own height', () => {
    const own = 'calc(100% - 104px)';
    renderIn(createDuncitTheme('light'), <Sheet anchor="right" height={own} />);
    expect(paperOf('right')).toHaveStyle({ height: own });
  });

  it('leaves drawers full height where no taskbar is drawn', () => {
    // Login screens and mWeb share the theme package but not the shell, so the
    // clearance belongs to AppShell's scope and nowhere else.
    renderIn(createDuncitTheme('light'), <Sheet anchor="right" />, false);
    expect(paperOf('right')).toHaveStyle({ height: '100%' });
  });

  it('still clears the taskbar under a theme with no drawer overrides of its own', () => {
    renderIn(createTheme(), <Sheet anchor="left" />);
    expect(paperOf('left')).toHaveStyle({ height: ABOVE_BAR });
  });

  it('builds the drawer override when the outer theme has no components at all', () => {
    const bare = { ...createTheme(), components: undefined };
    const cleared = withTaskbarClearance(bare);
    expect(cleared.components?.MuiDrawer?.styleOverrides?.paper).toEqual([
      undefined,
      expect.objectContaining({ variants: expect.any(Array) }),
    ]);
  });

  it('keeps the outer theme’s other drawer settings and other components', () => {
    const outer = createTheme({
      components: {
        MuiDrawer: { defaultProps: { elevation: 2 } },
        MuiButton: { defaultProps: { disableRipple: true } },
      },
    });
    const cleared = withTaskbarClearance(outer);
    expect(cleared.components?.MuiDrawer?.defaultProps).toEqual({ elevation: 2 });
    expect(cleared.components?.MuiButton).toBe(outer.components?.MuiButton);
    expect(cleared.palette).toBe(outer.palette);
  });
});
