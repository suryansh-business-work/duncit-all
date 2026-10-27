import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../testkit';
import LogDetailBody from '../../src/pages/telemetry-logs-page/LogDetailBody';
import type { TelemetryLogRow } from '../../src/pages/telemetry-logs-page/queries';
import type { TelemetryUserRef } from '../../../tech/src/components/telemetry-identity';

const user = (over: Partial<TelemetryUserRef> = {}): TelemetryUserRef => ({
  id: 'u1',
  name: 'Asha Rao',
  email: 'asha@example.test',
  phone: '+910000000000',
  roles: ['ADMIN', 'TECH'],
  ...over,
});

const row = (over: Partial<TelemetryLogRow> = {}): TelemetryLogRow =>
  ({
    id: 'log-1',
    app: 'mweb',
    portal: 'tech',
    platform: 'web',
    os: 'Windows',
    environment: 'production',
    source: 'mweb:home',
    level: 'error',
    page: '/home',
    component: 'HomeFeed',
    url: 'https://mweb.example.test/home',
    host: 'mweb.example.test',
    error: { name: 'TypeError', message: 'x is undefined', stack: 'at foo (bar.js:1)' },
    data_json: '{"a":1}',
    user_id: 'u1',
    user: { __typename: 'User', ...user() },
    client: {
      app_version: '1.2.3',
      device_model: 'Pixel 8',
      device_os_version: 'Android 15',
      locale: 'en-IN',
      timezone: 'Asia/Kolkata',
      screen: '1080x2400',
      viewport: '400x800',
      network: '4g',
      referrer: 'https://ref.example.test',
    },
    duid: 'duid-9',
    session_id: 'sess-9',
    ip: '203.0.113.7',
    user_agent: 'Mozilla/5.0 Test',
    created_at: '2026-01-02T03:04:05.000Z',
    ...over,
  }) as TelemetryLogRow;

describe('LogDetailBody', () => {
  it('shows the event, the error, who was signed in and the machine', () => {
    renderWithProviders(<LogDetailBody row={row()} />);
    expect(screen.getByText('log-1')).toBeInTheDocument();
    expect(screen.getByText('mweb · tech')).toBeInTheDocument();
    expect(screen.getByText('web · Windows')).toBeInTheDocument();
    expect(screen.getByText('TypeError')).toBeInTheDocument();
    expect(screen.getByText('x is undefined')).toBeInTheDocument();
    expect(screen.getByText('Asha Rao')).toBeInTheDocument();
    expect(screen.getByText('ADMIN, TECH')).toBeInTheDocument();
    expect(screen.getByText('duid-9')).toBeInTheDocument();
    expect(screen.getByText('Pixel 8 · Android 15')).toBeInTheDocument();
    expect(screen.getByText('203.0.113.7')).toBeInTheDocument();
    expect(screen.getByText('Mozilla/5.0 Test')).toBeInTheDocument();
    expect(screen.getByText('at foo (bar.js:1)')).toBeInTheDocument();
    expect(screen.getByText('{"a":1}')).toBeInTheDocument();
  });

  it('shows the component as the message when there is no error and hides empty blocks', () => {
    renderWithProviders(
      <LogDetailBody
        row={row({ error: null, data_json: null, user_agent: null, user: null, client: null, portal: null })}
      />,
    );
    expect(screen.getByText('HomeFeed')).toBeInTheDocument();
    expect(screen.getByText('mweb')).toBeInTheDocument();
    expect(screen.getByText(/Nobody was signed in/)).toBeInTheDocument();
    expect(screen.queryByText('Mozilla/5.0 Test')).not.toBeInTheDocument();
    expect(screen.queryByText('{"a":1}')).not.toBeInTheDocument();
    // no client => dashes for every machine field instead of a crash
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(8);
  });

  it('omits the stack block when the error carries none and blanks a user without contact details', () => {
    renderWithProviders(
      <LogDetailBody
        row={row({
          error: { name: 'Boom', message: 'bad', stack: null },
          user: { ...user({ email: null, phone: null, roles: [] }) },
          duid: null,
          os: null,
          ip: null,
          session_id: null,
          url: null,
          host: null,
        })}
      />,
    );
    expect(screen.getByText('Boom')).toBeInTheDocument();
    expect(screen.queryByText('at foo (bar.js:1)')).not.toBeInTheDocument();
    expect(screen.getByText('web')).toBeInTheDocument();
  });
});
