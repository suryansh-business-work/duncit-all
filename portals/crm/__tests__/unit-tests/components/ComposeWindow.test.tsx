import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ComposeWindow from '@/components/compose/ComposeWindow';

const renderWindow = (open = true, onClose = vi.fn()) =>
  render(
    <ComposeWindow open={open} title="Email · Hall" onClose={onClose} actions={<button>Send</button>}>
      <div>compose-body</div>
    </ComposeWindow>
  );

describe('ComposeWindow', () => {
  it('renders nothing when closed', () => {
    renderWindow(false);
    expect(screen.queryByTestId('compose-window')).toBeNull();
  });

  it('renders the title, body and actions when open', () => {
    renderWindow();
    expect(screen.getByTestId('compose-window')).toBeTruthy();
    expect(screen.getByText('Email · Hall')).toBeTruthy();
    expect(screen.getByText('compose-body')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Send' })).toBeTruthy();
  });

  it('minimize hides the body, expand restores it', () => {
    renderWindow();
    expect(screen.getByText('compose-body')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'minimize' }));
    expect(screen.queryByText('compose-body')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'minimize' }));
    expect(screen.getByText('compose-body')).toBeTruthy();
  });

  it('maximize keeps the body visible (toggles layout)', () => {
    renderWindow();
    fireEvent.click(screen.getByRole('button', { name: 'maximize' }));
    expect(screen.getByText('compose-body')).toBeTruthy();
  });

  it('close fires onClose', () => {
    const onClose = vi.fn();
    renderWindow(true, onClose);
    fireEvent.click(screen.getByRole('button', { name: 'close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('collapses and restores from a double-click on the title bar', () => {
    renderWindow();
    fireEvent.doubleClick(screen.getByText('Email · Hall'));
    expect(screen.queryByText('compose-body')).toBeNull();
    fireEvent.doubleClick(screen.getByText('Email · Hall'));
    expect(screen.getByText('compose-body')).toBeTruthy();
  });

  it('drags by the title bar within the viewport, and stops when released', () => {
    renderWindow();
    const panel = screen.getByTestId('compose-window');

    fireEvent.pointerDown(screen.getByText('Email · Hall'), { clientX: 100, clientY: 100 });
    fireEvent.pointerMove(globalThis.window, { clientX: 140, clientY: 70 });
    expect(panel).toHaveStyle({ transform: 'translate(40px, -30px)' });

    // Never further than 80px past its anchor.
    fireEvent.pointerMove(globalThis.window, { clientX: 900, clientY: 100 });
    expect(panel).toHaveStyle({ transform: 'translate(80px, 0px)' });

    fireEvent.pointerUp(globalThis.window);
    fireEvent.pointerMove(globalThis.window, { clientX: 0, clientY: 0 });
    expect(panel).toHaveStyle({ transform: 'translate(80px, 0px)' });
  });

  it('does not drag from a title-bar button, nor while maximized', () => {
    renderWindow();
    const panel = screen.getByTestId('compose-window');

    fireEvent.pointerDown(screen.getByRole('button', { name: 'close' }), { clientX: 100, clientY: 100 });
    fireEvent.pointerMove(globalThis.window, { clientX: 140, clientY: 140 });
    expect(panel).toHaveStyle({ transform: 'translate(0px, 0px)' });

    fireEvent.click(screen.getByRole('button', { name: 'maximize' }));
    fireEvent.pointerDown(screen.getByText('Email · Hall'), { clientX: 100, clientY: 100 });
    fireEvent.pointerMove(globalThis.window, { clientX: 140, clientY: 140 });
    expect(panel).toHaveStyle({ transform: 'translateX(-50%)' });
  });
});
