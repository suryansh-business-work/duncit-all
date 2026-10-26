import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, screen } from '@testing-library/react';
import HostPublishPage from './HostPublishPage';
import { partnerUser, renderWithProviders } from '../../__tests__/render';

vi.mock('@duncit/public-page', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  PublishPageCard: (props: { kind: string; title: string }) => <div data-testid="publish-card">{`${props.kind}:${props.title}`}</div>,
}));

afterEach(cleanup);

describe('HostPublishPage', () => {
  it('offers the signed-in host their own page, titled with their name', () => {
    renderWithProviders(<HostPublishPage />, { user: partnerUser() });
    expect(screen.getByTestId('publish-card').textContent).toBe('HOST:Asha Rao');
  });

  it('offers an untitled page while the host has no name on record', () => {
    renderWithProviders(<HostPublishPage />, { user: partnerUser({ full_name: null }) });
    expect(screen.getByTestId('publish-card').textContent).toBe('HOST:');
  });
});
