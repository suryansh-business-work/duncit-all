import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import Header from './Header';

const baseProps = {
  appName: 'Duncit',
  logoUrl: '/logo.svg',
  environment: 'production' as const,
  mode: 'light' as const,
  onToggleMode: vi.fn(),
};

describe('Header', () => {
  it('renders the title, logo and the dark-mode toggle in light mode', () => {
    render(<Header {...baseProps} />);
    expect(screen.getByRole('heading', { name: 'Duncit Status' })).toBeTruthy();
    expect(screen.getByAltText('Duncit')).toBeTruthy();
    expect(screen.getByLabelText('Switch to dark mode')).toBeTruthy();
    expect(screen.queryByText('Staging')).toBeNull();
  });

  it('shows a Staging chip and the light-mode toggle when applicable', () => {
    render(<Header {...baseProps} environment="staging" mode="dark" />);
    expect(screen.getByText('Staging')).toBeTruthy();
    expect(screen.getByLabelText('Switch to light mode')).toBeTruthy();
  });

  it('invokes the toggle callback when clicked', () => {
    const onToggleMode = vi.fn();
    render(<Header {...baseProps} onToggleMode={onToggleMode} />);
    fireEvent.click(screen.getByLabelText('Switch to dark mode'));
    expect(onToggleMode).toHaveBeenCalledTimes(1);
  });
});
