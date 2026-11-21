import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ActionsMenu, type ActionsMenuItem } from '../src/ActionsMenu';

const item = (key: string, extra: Partial<ActionsMenuItem> = {}): ActionsMenuItem => ({
  key,
  label: key.charAt(0).toUpperCase() + key.slice(1),
  icon: <span data-testid={`icon-${key}`} />,
  onClick: vi.fn(),
  ...extra,
});

describe('ActionsMenu', () => {
  it('names its button and keeps the menu closed until it is pressed', () => {
    render(<ActionsMenu buttonLabel="Actions for About us" actions={[item('edit')]} />);
    const button = screen.getByRole('button', { name: 'Actions for About us' });
    expect(button).toHaveAttribute('aria-haspopup', 'menu');
    expect(button).not.toHaveAttribute('aria-expanded');
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('opens on press, wires aria-controls to the menu, and runs the chosen action after closing', async () => {
    const edit = item('edit');
    render(<ActionsMenu buttonLabel="Row actions" actions={[edit, item('delete')]} />);
    const button = screen.getByRole('button', { name: 'Row actions' });
    await userEvent.click(button);

    const menu = screen.getByRole('menu');
    expect(button).toHaveAttribute('aria-expanded', 'true');
    // MUI puts the id on the menu's popover; aria-controls must name the element holding the menu.
    const controlled = document.getElementById(button.getAttribute('aria-controls') ?? '');
    expect(controlled).not.toBeNull();
    expect(controlled).toContainElement(menu);
    expect(screen.getAllByRole('menuitem').map((m) => m.textContent)).toEqual(['Edit', 'Delete']);

    await userEvent.click(screen.getByRole('menuitem', { name: 'Edit' }));
    expect(edit.onClick).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('leaves hidden actions out and shows disabled ones without running them', async () => {
    const locked = item('replace', { disabled: true });
    render(<ActionsMenu buttonLabel="Tile actions" actions={[item('preview'), locked, item('secret', { hidden: true })]} />);
    await userEvent.click(screen.getByRole('button', { name: 'Tile actions' }));

    expect(screen.queryByRole('menuitem', { name: 'Secret' })).toBeNull();
    const replace = screen.getByRole('menuitem', { name: 'Replace' });
    expect(replace).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(replace).catch(() => undefined);
    expect(locked.onClick).not.toHaveBeenCalled();
  });

  it('paints a destructive action in the error colour, icon included', async () => {
    render(<ActionsMenu buttonLabel="More" actions={[item('delete', { destructive: true }), item('view')]} />);
    await userEvent.click(screen.getByRole('button', { name: 'More' }));
    // MUI's default theme: error.main is #d32f2f.
    expect(screen.getByRole('menuitem', { name: 'Delete' })).toHaveStyle({ color: 'rgb(211, 47, 47)' });
    expect(screen.getByRole('menuitem', { name: 'View' })).not.toHaveStyle({ color: 'rgb(211, 47, 47)' });
    expect(screen.getByTestId('icon-delete')).toBeInTheDocument();
  });

  it('closes on Escape without running anything', async () => {
    const view = item('view');
    render(<ActionsMenu buttonLabel="More" actions={[view]} />);
    await userEvent.click(screen.getByRole('button', { name: 'More' }));
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).toBeNull();
    expect(view.onClick).not.toHaveBeenCalled();
  });
});
