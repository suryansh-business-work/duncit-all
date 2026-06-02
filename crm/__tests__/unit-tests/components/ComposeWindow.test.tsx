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
});
