import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import UserDataReloadDialog from '../UserDataReloadDialog';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('UserDataReloadDialog', () => {
  it('does not render its content when closed', () => {
    render(<UserDataReloadDialog open={false} />);
    expect(screen.queryByText('User data not loaded')).not.toBeInTheDocument();
  });

  it('renders the title, message and reload button when open', () => {
    render(<UserDataReloadDialog open />);
    expect(screen.getByText('User data not loaded')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Please reload the application so your latest account data can load correctly.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reload application' })).toBeInTheDocument();
  });

  it('reloads the application when the button is clicked', () => {
    const reloadSpy = vi.fn();
    const original = globalThis.window.location;
    Object.defineProperty(globalThis.window, 'location', {
      configurable: true,
      value: { ...original, reload: reloadSpy },
    });

    render(<UserDataReloadDialog open />);
    fireEvent.click(screen.getByRole('button', { name: 'Reload application' }));
    expect(reloadSpy).toHaveBeenCalledTimes(1);

    Object.defineProperty(globalThis.window, 'location', {
      configurable: true,
      value: original,
    });
  });
});
