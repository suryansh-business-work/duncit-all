import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../testkit';

vi.mock('../../../tech/src/pages/environment/EnvVariablesTab', () => ({
  default: (p: { category: string }) => <div data-testid="env-tab">{p.category}</div>,
}));
// Behind the emailed-code gate; a LOCKED session must not reach the keys.
const gate = vi.hoisted(() => ({ unlocked: true }));
vi.mock('../../../tech/src/pages/environment/access-gate/useEnvAccess', () => ({
  useEnvAccess: () => ({
    access: { unlocked: gate.unlocked, expires_at: null, sent_to: 'ad***@duncit.com' },
    loading: false,
    pending: null,
    sending: false,
    verifying: false,
    locking: false,
    retry: vi.fn(),
    send: vi.fn(),
    verify: vi.fn(),
    lock: vi.fn(),
  }),
}));

import SonarqubeSettingsPage from '../../src/pages/sonarqube-settings';

describe('SonarqubeSettingsPage', () => {
  it('shows the SonarQube category of environment variables under its own heading', () => {
    gate.unlocked = true;
    renderWithProviders(<SonarqubeSettingsPage />);
    expect(screen.getByTestId('env-tab')).toHaveTextContent('SONARQUBE');
    expect(screen.getAllByRole('heading')[0]).toBeInTheDocument();
  });

  it('hides the keys and offers the emailed code while the session is locked', () => {
    gate.unlocked = false;
    renderWithProviders(<SonarqubeSettingsPage />);
    expect(screen.queryByTestId('env-tab')).not.toBeInTheDocument();
    expect(screen.getByTestId('env-secret-warning')).toBeInTheDocument();
    expect(screen.getByTestId('env-access-send')).toBeInTheDocument();
  });
});
