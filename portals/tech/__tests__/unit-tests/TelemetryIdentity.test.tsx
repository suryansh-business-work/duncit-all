import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../testkit';
import {
  ENV_COLOR,
  UserCell,
  envOptions,
  userLabel,
  type TelemetryUserRef,
} from '../../src/components/telemetry-identity';

const user = (over: Partial<TelemetryUserRef> = {}): TelemetryUserRef => ({
  id: 'u1',
  name: 'Asha Rao',
  email: 'asha@example.test',
  phone: '+910000000000',
  roles: ['ADMIN', 'TECH'],
  ...over,
});

describe('userLabel', () => {
  it('prefers the name, then the email, then the raw id', () => {
    expect(userLabel(user())).toBe('Asha Rao');
    expect(userLabel(user({ name: null }))).toBe('asha@example.test');
    expect(userLabel(user({ name: null, email: null }))).toBe('u1');
  });

  it('says Signed out when there is no account', () => {
    expect(userLabel(null)).toBe('Signed out');
    expect(userLabel(undefined)).toBe('Signed out');
    expect(userLabel(user({ id: '' }))).toBe('Signed out');
  });
});

describe('UserCell', () => {
  it('shows the name with the email as its tooltip', () => {
    renderWithProviders(<UserCell user={user()} />);
    expect(screen.getByText('Asha Rao')).toHaveAttribute('title', 'asha@example.test');
  });

  it('falls back to the id as the tooltip when there is no email', () => {
    renderWithProviders(<UserCell user={user({ email: null })} />);
    expect(screen.getByText('Asha Rao')).toHaveAttribute('title', 'u1');
  });

  it('shows a signed-out marker when nobody was signed in', () => {
    renderWithProviders(<UserCell user={null} />);
    expect(screen.getByText('Signed out')).toBeInTheDocument();
  });
});

describe('environment helpers', () => {
  it('colours production loudest and localhost quietest', () => {
    expect(ENV_COLOR).toEqual({ production: 'error', staging: 'warning', localhost: 'default' });
  });

  it('offers the three environments in order with translated labels', () => {
    const options = envOptions((key) => `t:${key}`);
    expect(options.map((o) => o.value)).toEqual(['production', 'staging', 'localhost']);
    expect(options.map((o) => o.label)).toEqual([
      't:tech.telemetryIdentity.production',
      't:tech.telemetryIdentity.staging',
      't:tech.telemetryIdentity.localhost',
    ]);
  });
});
