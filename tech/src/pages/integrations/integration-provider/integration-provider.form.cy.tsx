import { afterEach, describe, it, expect, vi } from 'vitest';
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import IntegrationProviderForm from './integration-provider.form';
import { integrationSchema } from './integration-provider.types';

afterEach(() => cleanup());

const baseProvider = {
  id: '1',
  name: 'IK',
  type: 'IMAGEKIT' as const,
  description: '',
  is_default: false,
  is_active: true,
  last_used_at: null,
  created_at: null,
  updated_at: null,
  config: {
    public_key: 'pk',
    url_endpoint: 'https://ik.io/x',
    client_id: null,
    account_sid: null,
    phone_number: null,
    base_url: null,
    model: null,
    provider: null,
    has_private_key: true,
    has_api_key: false,
    has_client_secret: false,
    has_maps_api_key: false,
    has_auth_token: false,
  },
};

describe('IntegrationProviderForm', () => {
  it('requires the primary secret when creating', async () => {
    await expect(
      integrationSchema(false).validate({ name: 'New', type: 'IMAGEKIT', config: {} })
    ).rejects.toThrow(/required/i);
    await expect(
      integrationSchema(false).validate({ name: 'New', type: 'IMAGEKIT', config: { private_key: 'k' } })
    ).resolves.toBeTruthy();
  });

  it('treats a blank secret as valid when editing (keep existing)', async () => {
    await expect(
      integrationSchema(true).validate({ name: 'IK', type: 'IMAGEKIT', config: {} })
    ).resolves.toBeTruthy();
  });

  it('renders the create form with a name field and type selector', () => {
    render(<IntegrationProviderForm open initial={null} onSubmit={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText('New integration')).toBeDefined();
    expect(screen.getByLabelText(/Name/i)).toBeDefined();
  });

  it('shows a Test connection button and fires it when editing', () => {
    const onTest = vi.fn();
    render(
      <IntegrationProviderForm open initial={baseProvider} onSubmit={vi.fn()} onClose={vi.fn()} onTest={onTest} />
    );
    const button = screen.getByRole('button', { name: /Test connection/i });
    fireEvent.click(button);
    expect(onTest).toHaveBeenCalled();
  });

  it('renders the secret helper for an existing stored key', async () => {
    render(<IntegrationProviderForm open initial={baseProvider} onSubmit={vi.fn()} onClose={vi.fn()} />);
    await waitFor(() => expect(screen.getByText(/Leave blank to keep existing/i)).toBeDefined());
  });
});
