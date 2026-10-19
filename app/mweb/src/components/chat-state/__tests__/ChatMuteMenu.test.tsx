import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ChatMuteMenu from '../ChatMuteMenu';

describe('ChatMuteMenu', () => {
  it('shows an unmuted bell that offers 8 hours, 1 week and Always, but no Unmute', () => {
    render(<ChatMuteMenu muted={false} mutedUntil={null} onChoose={vi.fn()} />);
    const toggle = screen.getByRole('button', { name: 'Mute notifications' });
    expect(toggle).toHaveAttribute('aria-haspopup', 'menu');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('menuitem', { name: '8 hours' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: '1 week' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Always' })).toBeInTheDocument();
    expect(screen.queryByTestId('chat-mute-unmute')).not.toBeInTheDocument();
  });

  it('chooses a length and closes the menu', () => {
    const onChoose = vi.fn();
    render(<ChatMuteMenu muted={false} mutedUntil={null} onChoose={onChoose} />);
    const toggle = screen.getByTestId('chat-mute-toggle');
    fireEvent.click(toggle);
    fireEvent.click(screen.getByTestId('chat-mute-ONE_WEEK'));
    expect(onChoose).toHaveBeenCalledWith('ONE_WEEK');
    expect(toggle).not.toHaveAttribute('aria-expanded');
  });

  it('reads as muted and offers Unmute, which chooses no length', () => {
    const onChoose = vi.fn();
    render(<ChatMuteMenu muted mutedUntil={null} onChoose={onChoose} />);
    const toggle = screen.getByRole('button', { name: 'Notifications muted' });
    fireEvent.click(toggle);
    fireEvent.click(screen.getByTestId('chat-mute-unmute'));
    expect(onChoose).toHaveBeenCalledWith(null);
  });

  it('is disabled while a change is being saved', () => {
    render(<ChatMuteMenu muted={false} mutedUntil={null} busy onChoose={vi.fn()} />);
    expect(screen.getByTestId('chat-mute-toggle')).toBeDisabled();
  });
});
