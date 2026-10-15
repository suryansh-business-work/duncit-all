import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BUTTON_SIZES } from '@duncit/buttons';
import { ColorModeProvider } from '../../ColorModeContext';
import AuthModeToggle from '../AuthModeToggle';

const renderToggle = () =>
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[]}>
      <ColorModeProvider>
        <AuthModeToggle />
      </ColorModeProvider>
    </MockedProvider>,
  );

beforeEach(() => localStorage.setItem('mweb_color_mode', 'light'));
afterEach(() => localStorage.clear());

describe('AuthModeToggle', () => {
  it('names both modes and marks the one in effect', () => {
    renderToggle();
    expect(screen.getByRole('button', { name: 'Switch to light mode' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Switch to dark mode' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('auth-mode-light')).toHaveTextContent('Light');
    expect(screen.getByTestId('auth-mode-dark')).toHaveTextContent('Dark');
  });

  it('switches mode from the other half and remembers it; the active half does nothing', () => {
    renderToggle();
    fireEvent.click(screen.getByTestId('auth-mode-light'));
    expect(screen.getByTestId('auth-mode-light')).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByTestId('auth-mode-dark'));
    expect(screen.getByTestId('auth-mode-dark')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('auth-mode-light')).toHaveAttribute('aria-pressed', 'false');
    expect(localStorage.getItem('mweb_color_mode')).toBe('dark');
  });

  it('is drawn a step under the small button — a preference at the foot of the screen, not an action', () => {
    renderToggle();
    const segment = screen.getByTestId('auth-mode-dark');
    expect(segment).toHaveStyle({ minHeight: `${BUTTON_SIZES.sm.height - 8}px` });
    expect(segment).toHaveStyle({ fontSize: `${BUTTON_SIZES.sm.fontSize - 1}px` });
  });
});
