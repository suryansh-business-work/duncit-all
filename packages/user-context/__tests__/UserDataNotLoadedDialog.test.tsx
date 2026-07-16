import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UserDataNotLoadedDialog from '../src/UserDataNotLoadedDialog';

describe('UserDataNotLoadedDialog', () => {
  it('does not render content when closed', () => {
    render(<UserDataNotLoadedDialog open={false} onReload={vi.fn()} onLogout={vi.fn()} />);
    expect(screen.queryByText('User data not loaded')).not.toBeInTheDocument();
  });

  it('renders the recovery copy when open', () => {
    render(<UserDataNotLoadedDialog open onReload={vi.fn()} onLogout={vi.fn()} />);
    expect(screen.getByText('User data not loaded')).toBeInTheDocument();
    expect(screen.getByText(/Please reload the application/)).toBeInTheDocument();
  });

  it('shows the error message alert when provided', () => {
    render(<UserDataNotLoadedDialog open errorMessage="Boom happened" onReload={vi.fn()} onLogout={vi.fn()} />);
    expect(screen.getByText('Boom happened')).toBeInTheDocument();
  });

  it('omits the alert when no error message', () => {
    render(<UserDataNotLoadedDialog open errorMessage={null} onReload={vi.fn()} onLogout={vi.fn()} />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('fires reload and logout callbacks', async () => {
    const onReload = vi.fn();
    const onLogout = vi.fn();
    render(<UserDataNotLoadedDialog open onReload={onReload} onLogout={onLogout} />);
    await userEvent.click(screen.getByRole('button', { name: /Reload Application/ }));
    await userEvent.click(screen.getByRole('button', { name: /Logout/ }));
    expect(onReload).toHaveBeenCalledTimes(1);
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it('ignores a backdrop click (stays open)', async () => {
    const onLogout = vi.fn();
    const { baseElement } = render(
      <UserDataNotLoadedDialog open onReload={vi.fn()} onLogout={onLogout} />,
    );
    const backdrop = baseElement.querySelector('.MuiBackdrop-root');
    expect(backdrop).not.toBeNull();
    await userEvent.click(backdrop as Element);
    // The dialog swallows backdrop dismissal, so it remains mounted.
    expect(screen.getByText('User data not loaded')).toBeInTheDocument();
  });
});
