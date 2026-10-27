import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const seen = vi.hoisted(() => ({ category: null as unknown }));

vi.mock('../../src/pages/environment/EnvVariablesTab', () => ({
  default: (p: { category?: string }) => {
    seen.category = p.category;
    return <div data-testid="env-tab" />;
  },
}));
// The page sits behind the emailed-code gate; this session is already unlocked.
const lock = vi.hoisted(() => vi.fn());
vi.mock('../../src/pages/environment/access-gate/useEnvAccess', () => ({
  useEnvAccess: () => ({
    access: { unlocked: true, expires_at: '2026-10-20T12:00:00.000Z', sent_to: 'ad***@duncit.com' },
    loading: false,
    pending: null,
    sending: false,
    verifying: false,
    locking: false,
    retry: vi.fn(),
    send: vi.fn(),
    verify: vi.fn(),
    lock,
  }),
}));

import Msg91SettingsPage from '../../src/pages/msg91-settings';

describe('thin page wrappers', () => {
  it('MSG91 settings pins the environment editor to the MSG91 category under its own heading', () => {
    render(<Msg91SettingsPage />);
    expect(screen.getByTestId('env-tab')).toBeInTheDocument();
    expect(seen.category).toBe('MSG91');
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    // The unlocked session can end itself from the same page.
    screen.getByTestId('env-access-lock').click();
    expect(lock).toHaveBeenCalledTimes(1);
  });
});
