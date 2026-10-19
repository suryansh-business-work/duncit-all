import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import MenuPanel from '../MenuPanel';

const mockNavigate = vi.fn();
vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router');
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
  default: ({ flags, mode }: { flags: { pod_plans_section?: boolean }; mode: string }) => (
    <div data-testid="user-mode-content">
      pod-plans:{String(flags.pod_plans_section)} mode:{mode}
    </div>
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

/** Opens one of the collapsed section cards. */
const expand = (id: string) => fireEvent.click(screen.getByTestId(`sidebar-section-${id}-toggle`));

describe('MenuPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    colorState.mode = 'light';
    studioState.mode = 'USER';
    flagValue = false;
  });

  it('mounts the user content in USER mode', () => {
    renderPanel();
    expect(screen.getByTestId('user-mode-content')).toHaveTextContent('pod-plans:false');
    expect(screen.getByTestId('user-mode-content')).toHaveTextContent('mode:USER');
    // No switch-role affordance for a role-less user.
    expand('account');
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
    // The switch row, inside Account, names the studio in effect under it.
    expand('account');
    expect(screen.getByTestId('sidebar-switch-role')).toHaveTextContent('Host Studio');
  });

  it('shows the switch-role button when more than one mode is available', () => {
    studioState.mode = 'HOST';
    renderPanel({ me: { roles: ['HOST', 'VENUE_OWNER'] } });
    // Named in the Account subtitle while collapsed, and a row once open.
    expect(screen.getByTestId('sidebar-section-account-subtitle')).toHaveTextContent(/Switch role/);
    expand('account');
    expect(screen.getByText('Switch role')).toBeInTheDocument();
    // secondary text shows the current effective mode label
    expect(screen.getAllByText('Host Studio').length).toBeGreaterThan(0);
  });

  it('opens the switch dialog and selecting a mode sets mode and navigates', () => {
    studioState.mode = 'HOST';
    renderPanel({ me: { roles: ['HOST', 'VENUE_OWNER'] } });
    expand('account');
    fireEvent.click(screen.getByText('Switch role'));
    // Dialog title appears
    expect(screen.getByRole('heading', { name: 'Switch role' })).toBeInTheDocument();
    // Picking the Venue Studio bubble only stages the choice.
    fireEvent.click(screen.getByRole('button', { name: 'Venue Studio' }));
    expect(studioState.setMode).not.toHaveBeenCalled();
    // Confirming is what actually switches.
    fireEvent.click(screen.getByRole('button', { name: 'Switch to Venue Studio' }));
    expect(studioState.setMode).toHaveBeenCalledWith('VENUE');
    // It lands on the role's Studio page — every Venue option, with the role
    // switcher at its top. Leaving the menu replaces its history entry, so
    // Back skips the menu.
    expect(mockNavigate).toHaveBeenCalledWith('/venues/options', { replace: true });
  });

  it('falls a persisted mode the user no longer qualifies for back to USER', () => {
    studioState.mode = 'VENUE';
    renderPanel({ me: { roles: [] } });
    expect(screen.getByTestId('user-mode-content')).toHaveTextContent('mode:USER');
    expand('account');
    expect(screen.queryByText('Switch role')).not.toBeInTheDocument();
  });

  it('reflects light mode and toggles color mode from the switch', () => {
    renderPanel();
    expand('account');
    expect(screen.getByTestId('LightModeIcon')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('switch', { name: 'Toggle dark mode' }));
    expect(colorState.toggle).toHaveBeenCalledTimes(1);
  });

  it('shows the dark-mode icon and a checked switch when in dark mode', () => {
    colorState.mode = 'dark';
    renderPanel();
    expand('account');
    expect(screen.getByTestId('DarkModeIcon')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Toggle dark mode' })).toBeChecked();
  });

  it('renders the policies section only when policies exist', () => {
    renderPanel({ publicPolicies: policies });
    expect(screen.getByTestId('sidebar-section-support-subtitle')).toHaveTextContent('Help, FAQs, Policies');
    expand('support');
    expect(screen.getByText('Policies')).toBeInTheDocument();
  });

  it('omits the policies section when there are no policies', () => {
    renderPanel({ publicPolicies: [] });
    expect(screen.getByTestId('sidebar-section-support-subtitle')).toHaveTextContent(/^Help, FAQs$/);
    expand('support');
    expect(screen.queryByText('Policies')).not.toBeInTheDocument();
  });

  it('opens a section card on click, announcing it, and navigates from its rows', () => {
    renderPanel();
    const toggle = screen.getByTestId('sidebar-section-explore-toggle');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId('sidebar-item-ideas')).not.toBeInTheDocument();
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('region', { name: 'Explore & Community' })).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('sidebar-item-ideas'));
    expect(mockNavigate).toHaveBeenCalledWith('/pod-ideas', { replace: true });
  });

  it('lists every flag-gated row once the flags are on', () => {
    flagValue = true;
    renderPanel();
    expect(screen.getByTestId('sidebar-section-shopping-subtitle')).toHaveTextContent(
      'Pod Shop, Cart, Food, Gift Cards, My Product Order History, Address Book, My Rented Items'
    );
    expand('work');
    expect(screen.getByTestId('sidebar-item-membership')).toHaveTextContent('Coming soon');
    fireEvent.click(screen.getByTestId('sidebar-item-membership'));
    expect(mockNavigate).toHaveBeenCalledWith('/membership', { replace: true });
  });

  it('fires onLogout from the footer button', () => {
    const { onLogout } = renderPanel();
    fireEvent.click(screen.getByRole('button', { name: /logout/i }));
    expect(onLogout).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/App version 9\.9\.9/)).toBeInTheDocument();
  });
});
