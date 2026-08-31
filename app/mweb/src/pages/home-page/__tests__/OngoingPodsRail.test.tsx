/**
 * The Ongoing rail — the band for pods that are RUNNING right now.
 *
 * Its whole reason to exist is that a pod used to fall into "Previous Pods" the
 * moment it started, so the two things asserted here are the two that carried
 * that bug: the rail disappears completely when nothing is running (it must not
 * leave an empty heading between the feed and the clubs), and a card still
 * opens the pod — where booking is closed, which is why the rail offers no join
 * of its own.
 */
import { MockedProvider } from '@apollo/client/testing/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import OngoingPodsRail from '../OngoingPodsRail';

const navigate = vi.fn();
vi.mock('react-router-dom', async () => ({
  ...(await vi.importActual<typeof import('react-router-dom')>('react-router-dom')),
  useNavigate: () => navigate,
}));

const testTheme = createTheme();

const pod = (over: Record<string, unknown> = {}) => ({
  id: 'pod-4977',
  pod_id: 'DUN-POD-4977',
  pod_title: 'Sunday Badminton',
  pod_type: 'NATIVE_PAID',
  pod_amount: 250,
  no_of_spots: 8,
  pod_attendees: [],
  pod_images_and_videos: [],
  club_slug: 'sunset-club',
  pod_date_time: '2026-08-25T18:30:00.000Z',
  pod_end_date_time: '2026-08-25T20:30:00.000Z',
  ...over,
});

const rail = (pods: ReturnType<typeof pod>[]) =>
  render(
    <MockedProvider mocks={[]}>
      <ThemeProvider theme={testTheme}>
        <MemoryRouter>
          <OngoingPodsRail pods={pods} hostNameOf={() => 'Host One'} />
        </MemoryRouter>
      </ThemeProvider>
    </MockedProvider>
  );

describe('OngoingPodsRail', () => {
  it('renders nothing at all when no pod is running', () => {
    const { container } = rail([]);

    expect(container.innerHTML).toBe('');
  });

  it('lists every running pod under the ongoing heading', () => {
    const { container } = rail([pod(), pod({ id: 'pod-5502', pod_title: 'Evening Football' })]);

    expect(screen.getByTestId('ongoing-pods-rail')).toBeTruthy();
    expect(container.textContent).toContain('Ongoing Pods');
    expect(container.textContent).toContain('Sunday Badminton');
    expect(container.textContent).toContain('Evening Football');
  });

  it('opens the pod detail from a card', () => {
    const { container } = rail([pod()]);

    const card = container.querySelector<HTMLElement>('[role="button"]');
    fireEvent.click(card!);

    expect(navigate).toHaveBeenCalledWith(expect.stringContaining('DUN-POD-4977'));
  });
});
