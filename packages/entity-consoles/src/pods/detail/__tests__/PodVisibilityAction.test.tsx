import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { PUBLIC_APP_SETTINGS } from '@duncit/app-settings';
import { renderWithProviders } from '../../../../__tests__/testkit';
import { SET_POD_HIDDEN } from '../../../shared/visibility/queries';
import PodVisibilityAction from '../PodVisibilityAction';

const session = vi.hoisted(() => ({ roles: ['SUPER_ADMIN'] as string[] }));
vi.mock('@duncit/user-context', () => ({
  useUserData: () => ({ user: { roles: session.roles } }),
}));

const settingsMock = (): MockedResponse => ({
  request: { query: PUBLIC_APP_SETTINGS },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: {
    data: {
      publicAppSettings: {
        __typename: 'PublicAppSettings',
        date_format: 'dd/MM/yyyy',
        time_format: 'HH:mm',
        time_zone: 'Asia/Kolkata',
        time_source: 'SERVER',
        custom_time: null,
        custom_time_set_at: null,
        server_time: '2026-01-01T00:00:00.000Z',
        min_signup_age: 13,
        draft_retention_days: 30,
        ticket_discount_max_pct: 50,
        happening_nearby_days: 7,
      },
    },
  },
});

const showMock = (): MockedResponse => ({
  request: { query: SET_POD_HIDDEN, variables: { id: 'pod-1', hidden: false, reason: null } },
  result: {
    data: {
      setPodHidden: {
        __typename: 'Pod',
        id: 'pod-1',
        is_hidden: false,
        hidden_by_club: false,
        hidden_reason: null,
        club_hidden_reason: null,
      },
    },
  },
});

describe('PodVisibilityAction', () => {
  beforeEach(() => {
    session.roles = ['SUPER_ADMIN'];
  });

  it('renders nothing for a viewer the server would refuse', () => {
    session.roles = ['ALL_VENUES_ACCESS'];
    const { container } = renderWithProviders(
      <PodVisibilityAction podId="pod-1" podTitle="Chess" hidden={false} />,
      { mocks: [settingsMock()] },
    );
    expect(container.querySelector('button')).toBeNull();
  });

  it('offers Hide on a visible pod and opens the reason dialog naming the pod', async () => {
    renderWithProviders(<PodVisibilityAction podId="pod-1" podTitle="Chess Night" hidden={false} />, {
      mocks: [settingsMock()],
    });
    fireEvent.click(screen.getByRole('button', { name: 'Hide' }));
    expect(await screen.findByText('Hide this pod?')).toBeInTheDocument();
    expect(screen.getByText(/"Chess Night" will stop appearing/)).toBeInTheDocument();
  });

  it('offers Show on a hidden pod and shows it again after confirmation', async () => {
    renderWithProviders(<PodVisibilityAction podId="pod-1" podTitle="Chess Night" hidden />, {
      mocks: [settingsMock(), showMock()],
    });
    fireEvent.click(screen.getByRole('button', { name: 'Show' }));
    expect(await screen.findByText('Show this pod again?')).toBeInTheDocument();
    const confirm = screen
      .getAllByRole('button', { name: 'Show' })
      .find((button) => button.closest('[role="dialog"]'));
    fireEvent.click(confirm as HTMLElement);
    await waitFor(() => expect(screen.getByText('Pod is visible again.')).toBeInTheDocument());
  });
});
