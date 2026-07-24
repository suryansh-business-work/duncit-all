import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { MemoryRouter } from 'react-router-dom';
import { gql } from '@apollo/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});
// The product-seller (ECOMM) card is gated behind `is_product_visible`; default
// it on so the pre-existing tests keep seeing all four cards.
const flag = vi.hoisted(() => ({ product: true }));
vi.mock('../../../hooks/useFeatureFlag', () => ({
  useFeatureFlag: () => flag.product,
}));

import EarnPage from '../index';

const EARN_ME = gql`
  query EarnMe {
    me {
      user_id
      roles
    }
    myMeetings {
      id
      request_no
      kind
      status
      approval_status
      onboarded_status
      scheduled_at
      requested_at
      reschedule_count
    }
  }
`;

const meeting = (over: Record<string, unknown> = {}) => ({
  id: 'm1',
  request_no: 'REQ-1',
  kind: 'VENUE',
  status: 'SCHEDULED',
  approval_status: 'NONE',
  onboarded_status: null,
  scheduled_at: '2026-08-01T10:00:00.000Z',
  requested_at: '2026-07-01T10:00:00.000Z',
  reschedule_count: 0,
  ...over,
});

const makeMock = (roles: string[], meetings: unknown[]) => ({
  request: { query: EARN_ME },
  result: { data: { me: { user_id: 'u1', roles }, myMeetings: meetings } },
});

function setup(mock: ReturnType<typeof makeMock>) {
  return render(
    <MockedProvider mocks={[mock]} addTypename={false}>
      <MemoryRouter>
        <EarnPage />
      </MemoryRouter>
    </MockedProvider>,
  );
}

describe('EarnPage', () => {
  beforeEach(() => {
    flag.product = true;
  });

  it('shows skeletons while loading then renders the four earn boxes', async () => {
    setup(makeMock([], []));
    // Heading is always visible; boxes appear after the query resolves.
    expect(screen.getByText('Earn with Duncit')).toBeInTheDocument();
    expect(await screen.findByText('By hosting a pod')).toBeInTheDocument();
    expect(screen.getByText('By registering your venue')).toBeInTheDocument();
    expect(screen.getByText('By listing your product')).toBeInTheDocument();
    expect(screen.getByText('By managing a club')).toBeInTheDocument();
    // No meeting → no locked chips.
    expect(screen.queryByText('Already enabled')).not.toBeInTheDocument();
  });

  it('navigates back when the Back button is clicked', () => {
    navigateMock.mockClear();
    setup(makeMock([], []));
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(navigateMock).toHaveBeenCalledWith(-1);
  });

  it('locks a box the user already holds the role for, keeping the label + adding a CTA', async () => {
    setup(makeMock(['HOST'], []));
    // Business rule: the "Already enabled" label stays visible alongside the CTA.
    expect(await screen.findByText('Already enabled')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Ready to host more experiences?' }),
    ).toBeInTheDocument();
  });

  it('shows a scheduled-meeting notice + reschedule/cancel actions for a pending meeting', async () => {
    setup(makeMock([], [meeting({ kind: 'VENUE', status: 'SCHEDULED', reschedule_count: 0 })]));
    expect(await screen.findByText('Meeting scheduled')).toBeInTheDocument();
    expect(screen.getByText(/already have an onboarding meeting/)).toBeInTheDocument();
    expect(screen.getByText(/Request ID: REQ-1/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reschedule meeting/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cancel meeting/ })).toBeInTheDocument();
  });

  it('hides reschedule and warns once the one-time reschedule is used', async () => {
    setup(makeMock([], [meeting({ kind: 'VENUE', status: 'REQUESTED', reschedule_count: 1 })]));
    expect(await screen.findByText('Meeting scheduled')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Reschedule meeting/ })).not.toBeInTheDocument();
    expect(screen.getByText(/one-time reschedule option/)).toBeInTheDocument();
  });

  it('locks a box while a DONE meeting is pending approval', async () => {
    setup(
      makeMock([], [meeting({ kind: 'ECOMM', status: 'DONE', approval_status: 'PENDING' })]),
    );
    const chips = await screen.findAllByText('Onboarding in process.');
    expect(chips.length).toBeGreaterThan(0);
    expect(screen.getByText(/reviewing your application/)).toBeInTheDocument();
  });

  it('locks a box while an approved meeting has an onboarded record under review', async () => {
    setup(
      makeMock(
        [],
        [
          meeting({
            kind: 'HOST',
            status: 'DONE',
            approval_status: 'APPROVED',
            onboarded_status: 'SUBMITTED',
          }),
        ],
      ),
    );
    expect(await screen.findByText('Onboarding in process.')).toBeInTheDocument();
  });

  it('keeps a box unlocked when the meeting notice has no request_no or date', async () => {
    setup(
      makeMock(
        [],
        [
          meeting({
            kind: 'CLUB_ADMIN',
            status: 'SCHEDULED',
            request_no: null,
            scheduled_at: null,
            requested_at: null,
          }),
        ],
      ),
    );
    expect(await screen.findByText('Meeting scheduled')).toBeInTheDocument();
    expect(screen.getByText(/scheduled for this\./)).toBeInTheDocument();
    expect(screen.queryByText(/Request ID/)).not.toBeInTheDocument();
  });

  it('opens the cancel dialog from the meeting actions', async () => {
    setup(makeMock([], [meeting({ kind: 'VENUE', status: 'SCHEDULED' })]));
    fireEvent.click(await screen.findByRole('button', { name: /Cancel meeting/ }));
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
  });

  it('offers an approved host a CTA into Host Studio', async () => {
    navigateMock.mockClear();
    setup(makeMock(['HOST'], []));
    fireEvent.click(await screen.findByRole('button', { name: 'Ready to host more experiences?' }));
    expect(navigateMock).toHaveBeenCalledWith('/host/manage');
  });

  it('sends approved venue/brand/club users to the Partner Portal deep link', async () => {
    const replace = vi.fn();
    const original = globalThis.window.location;
    Object.defineProperty(globalThis.window, 'location', {
      configurable: true,
      value: { ...original, replace },
    });
    try {
      setup(makeMock(['VENUE_OWNER', 'ECOMM_MANAGER', 'CLUB_ADMIN'], []));
      // Assert each button in isolation (toHaveBeenLastCalledWith) so a
      // button->URL cross-wiring would be caught, not just the URL set.
      fireEvent.click(
        await screen.findByRole('button', { name: 'Ready to register another venue?' }),
      );
      expect(replace).toHaveBeenLastCalledWith(
        'https://partners-app.duncit.com/register-venue/new',
      );
      fireEvent.click(screen.getByRole('button', { name: 'Ready to add another brand?' }));
      expect(replace).toHaveBeenLastCalledWith('https://partners-app.duncit.com/ecomm-brand');
      fireEvent.click(screen.getByRole('button', { name: 'Manage your clubs' }));
      expect(replace).toHaveBeenLastCalledWith(
        'https://partners-app.duncit.com/club-admin/dashboard',
      );
    } finally {
      Object.defineProperty(globalThis.window, 'location', {
        configurable: true,
        value: original,
      });
    }
  });

  it('hides the product-seller card and its CTA when products are gated off', async () => {
    flag.product = false;
    setup(makeMock(['ECOMM_MANAGER'], []));
    expect(await screen.findByText('By hosting a pod')).toBeInTheDocument();
    expect(screen.queryByText('By listing your product')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Ready to add another brand?' }),
    ).not.toBeInTheDocument();
  });

  it('shows no next-step CTA for a non-approved (meeting-scheduled) card', async () => {
    setup(makeMock([], [meeting({ kind: 'VENUE', status: 'SCHEDULED' })]));
    expect(await screen.findByText('Meeting scheduled')).toBeInTheDocument();
    // Business rule: CTAs appear ONLY for approved users.
    expect(
      screen.queryByRole('button', { name: 'Ready to register another venue?' }),
    ).not.toBeInTheDocument();
  });
});
