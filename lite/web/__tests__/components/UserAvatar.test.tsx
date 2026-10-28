import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { UserAvatar } from '../../components/UserAvatar';

describe('UserAvatar', () => {
  it('shows the first two initials when there is no picture', () => {
    render(<UserAvatar name="Asha  Maria Rao" url={null} />);

    const avatar = screen.getByTestId('user-avatar');
    expect(avatar).toHaveTextContent('AM');
    expect(avatar.querySelector('img')).toBeNull();
  });

  it('treats a blank URL as no picture', () => {
    render(<UserAvatar name="ravi" url="   " />);

    expect(screen.getByTestId('user-avatar')).toHaveTextContent('R');
    expect(screen.getByTestId('user-avatar').querySelector('img')).toBeNull();
  });

  it('draws the picture as decoration (the name is said beside it) when there is one', () => {
    render(<UserAvatar name="Asha Rao" url="https://img.example/asha.png" />);

    const img = screen.getByTestId('user-avatar').querySelector('img');
    expect(img).toHaveAttribute('src', 'https://img.example/asha.png');
    expect(img).toHaveAttribute('alt', '');
  });

  it('falls back to the initials when the picture fails to load', () => {
    render(<UserAvatar name="Asha Rao" url="https://img.example/missing.png" />);
    const img = screen.getByTestId('user-avatar').querySelector('img');
    expect(img).not.toBeNull();

    if (img) fireEvent.error(img);

    expect(screen.getByTestId('user-avatar').querySelector('img')).toBeNull();
    expect(screen.getByTestId('user-avatar')).toHaveTextContent('AR');
  });

  it('squares the avatar for a calendar mark', () => {
    render(<UserAvatar name="Run Club" url={null} size={64} square />);

    const avatar = screen.getByTestId('user-avatar');
    expect(avatar).toHaveClass('MuiAvatar-rounded');
    expect(avatar).not.toHaveClass('MuiAvatar-circular');
  });

  it('is a circle by default', () => {
    render(<UserAvatar name="Run Club" url={null} />);

    expect(screen.getByTestId('user-avatar')).toHaveClass('MuiAvatar-circular');
  });
});
