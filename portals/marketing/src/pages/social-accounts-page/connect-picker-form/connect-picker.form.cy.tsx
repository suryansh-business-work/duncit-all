import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../../../__tests__/testkit';
import type { SocialPendingConnection } from '../queries';
import { ConnectPickerForm } from '.';

const connection = (over: Partial<SocialPendingConnection> = {}): SocialPendingConnection => ({
  id: 'pc1',
  provider: 'FACEBOOK',
  reconnect: true,
  pages_found: 1,
  instagram_found: 1,
  found: 2,
  accounts: [
    { key: 'FACEBOOK:p1', platform: 'FACEBOOK', external_id: 'p1', name: 'Duncit', handle: 'duncitapp', avatar_url: '', connected: true },
    { key: 'INSTAGRAM:i1', platform: 'INSTAGRAM', external_id: 'i1', name: 'duncit._', handle: 'duncit._', avatar_url: '', connected: true },
  ],
  ...over,
});

describe('ConnectPickerForm', () => {
  it('on a Reconnect, marks the connected accounts as refreshed and submits with nothing new ticked', async () => {
    const onSubmit = vi.fn(async () => undefined);
    renderWithProviders(<ConnectPickerForm connection={connection()} onSubmit={onSubmit} onCancel={vi.fn()} />);
    expect(screen.getAllByText('Connected · will be refreshed')).toHaveLength(2);
    // A handle equal to the name is not repeated.
    expect(screen.getByText('Instagram — duncit._')).toBeInTheDocument();
    expect(screen.getByTestId('connect-picker-submit')).toHaveTextContent('Connect 2 accounts');
    fireEvent.click(screen.getByTestId('connect-picker-submit'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith([]));
  });

  it('cancels without submitting', () => {
    const onSubmit = vi.fn(async () => undefined);
    const onCancel = vi.fn();
    renderWithProviders(<ConnectPickerForm connection={connection({ reconnect: false })} onSubmit={onSubmit} onCancel={onCancel} />);
    expect(screen.getAllByText('Connected')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
