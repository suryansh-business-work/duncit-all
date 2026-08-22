import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MenuPanel from '../MenuPanel';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const colorState = { mode: 'light' as 'light' | 'dark', toggle: vi.fn(), set: vi.fn() };
vi.mock('../../../../ColorModeContext', () => ({ useColorMode: () => colorState }));

const studioState = { mode: 'USER', setMode: vi.fn() };
vi.mock('../../../../StudioModeContext', () => ({ useStudioMode: () => studioState }));

let flagValue = false;
vi.mock('../../../../hooks/useFeatureFlag', () => ({ useFeatureFlag: () => flagValue }));

// The menu fetches the Auto Pod counts as it mounts, and `useQuery` needs a
// client in context even when it is skipped — so without this the panel throws
// before it renders anything. The counts themselves belong to the role
// switcher's own tests.
vi.mock('../../../../hooks/useAutoPodCounts', () => ({
  useAutoPodCounts: () => ({ counts: null, reload: vi.fn() }),
}));

// Stub the heavy consumer layout (fires ads/branding queries) — it is covered
// by its own tests; here we only need a marker to assert it mounts.
vi.mock('../UserModeContent', () => ({
  default: ({ showPodPlans }: { showPodPlans: boolean }) => (
    <div data-testid="user-mode-content">pod-plans:{String(showPodPlans)}</div>
  ),
}));

vi.stubGlobal('__APP_VERSION__', '9.9.9');

const policies = [
  { id: 'p1', slug: 'privacy', title: 'Privacy Policy' },
  { id: 'p2', slug: 'terms', title: 'Terms of Service' },
];

function renderPanel(props: Partial<Parameters<typeof MenuPanel>[0]> = {}) {
  const merged = {
    onClose: vi.fn(),
    me: { roles: [] },
    publicPolicies: [],
    policiesOpen: false,
    setPoliciesOpen: vi.fn(),
    onLogout: vi.fn(),
    ...props,
  };
  render(
    <MemoryRouter>
      <MenuPanel {...merged} />
    </MemoryRouter>
  );
  return merged;
}

describe('MenuPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    colorState.mode = 'light';
    studioState.mode = 'USER';
    flagValue = false;
  });

  it('renders the Profile title in USER mode and mounts the user content', () => {
    renderPanel();
    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.getByTestId('user-mode-content')).toHaveTextContent('pod-plans:false');
    // No switch-role affordance for a role-less user.
    expect(screen.queryByText('Switch role')).not.toBeInTheDocument();
  });

  it('passes the pod_plans feature flag down to the content', () => {
    flagValue = true;
    renderPanel();
    expect(screen.getByTestId('user-mode-content')).toHaveTextContent('pod-plans:true');
  });

  it('closes when the header close button is clicked', () => {
    const { onClose } = renderPanel();
    fireEvent.click(screen.getByTestId('CloseIcon').closest('button')!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders the studio label as the title when in a non-USER effective mode', () => {
    studioState.mode = 'HOST';
    renderPanel({ me: { roles: ['HOST'] } });
    // Title becomes the studio label (both the header and the switch button's
    // secondary line show it, so there is more than one match).
    expect(screen.getAllByText('Host Studio').length).toBeGreaterThan(0);
  });

  it('shows the switch-role button when more than one mode is available', () => {
    studioState.mode = 'HOST';
    renderPanel({ me: { roles: ['HOST', 'VENUE_OWNER'] } });
    expect(screen.getByText('Switch role')).toBeInTheDocument();
    // secondary text shows the current effective mode label
    expect(screen.getAllByText('Host Studio').length).toBeGreaterThan(0);
  });

  it('opens the switch dialog and selecting a mode sets mode and navigates', () => {
    studioState.mode = 'HOST';
    renderPanel({ me: { roles: ['HOST', 'VENUE_OWNER'] } });
    fireEvent.click(screen.getByText('Switch role'));
    // Dialog title appears
    expect(screen.getByRole('heading', { name: 'Switch role' })).toBeInTheDocument();
    // Picking the Venue Studio bubble only stages the choice.
    fireEvent.click(screen.getByRole('button', { name: 'Venue Studio' }));
    expect(studioState.setMode).not.toHaveBeenCalled();
    // Confirming is what actually switches.
    fireEvent.click(screen.getByRole('button', { name: 'Switch to Venue Studio' }));
    expect(studioState.setMode).toHaveBeenCalledWith('VENUE');
    expect(mockNavigate).toHaveBeenCalledWith('/venues/manage');
  });

  it('falls a persisted mode the user no longer qualifies for back to USER', () => {
    studioState.mode = 'VENUE';
    renderPanel({ me: { roles: [] } });
    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.queryByText('Switch role')).not.toBeInTheDocument();
  });

  it('reflects light mode and toggles color mode from the switch', () => {
    renderPanel();
    expect(screen.getByTestId('LightModeIcon')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Toggle dark mode' }));
    expect(colorState.toggle).toHaveBeenCalledTimes(1);
  });

  it('shows the dark-mode icon and a checked switch when in dark mode', () => {
    colorState.mode = 'dark';
    renderPanel();
    expect(screen.getByTestId('DarkModeIcon')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Toggle dark mode' })).toBeChecked();
  });

  it('renders the policies section only when policies exist', () => {
    renderPanel({ publicPolicies: policies });
    expect(screen.getByText('Policies')).toBeInTheDocument();
  });

  it('omits the policies section when there are no policies', () => {
    renderPanel({ publicPolicies: [] });
    expect(screen.queryByText('Policies')).not.toBeInTheDocument();
  });

  it('fires onLogout from the footer button', () => {
    const { onLogout } = renderPanel();
    fireEvent.click(screen.getByRole('button', { name: /logout/i }));
    expect(onLogout).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/App version 9\.9\.9/)).toBeInTheDocument();
  });
});
