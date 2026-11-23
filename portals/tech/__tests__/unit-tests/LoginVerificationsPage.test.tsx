import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { print } from 'graphql';
import { formatDateTime } from '@duncit/app-settings';
import { logs } from '@duncit/logs';
import { renderWithProviders } from '../testkit';
import { ops, resetOps } from '../mocks/ops';
import { graphQlFailure, logDetail, logRow } from '../mocks/portal-security.mock';

const spies = vi.hoisted(() => ({ useQuery: vi.fn(), client: { query: vi.fn() } }));

// The operation-keyed Apollo stand-in every page spec here uses, with a spy on
// the reads: what matters on this page is WHICH reads happen and when. The
// table's own fetch is real — it runs against `spies.client`, so the document
// and the result key it asks for are the ones under test.
vi.mock('@apollo/client/react', async (io) => {
  const base = await (await import('../mocks/ops')).apolloOpsFactory(io);
  return {
    ...base,
    useApolloClient: () => spies.client,
    useQuery: (doc: { definitions: Array<{ name?: { value: string } }> }, options?: unknown) => {
      spies.useQuery(doc.definitions[0]?.name?.value, options);
      return base.useQuery(doc);
    },
  };
});

import LoginVerificationsPage from '../../src/pages/security/login-verifications';
import { PORTAL_SECURITY_LOGS_TABLE } from '../../src/pages/security/login-verifications/queries';

const renderPage = () => renderWithProviders(<LoginVerificationsPage />);

const rowOf = (id: string) => screen.findByTestId(`tech-login-verifications-row-${id}`);

/**
 * The distinct reads of one record — only these write an access entry on the
 * server. A render calls the hook again with the same arguments, which Apollo
 * answers from the request already in flight, so repeats are not new reads.
 */
const detailReads = () => {
  const options = spies.useQuery.mock.calls
    .filter(([name]) => name === 'PortalSecurityLog')
    .map(([, read]) => JSON.stringify(read));
  return [...new Set(options)].map((read) => JSON.parse(read) as unknown);
};

afterEach(() => {
  vi.restoreAllMocks();
});

beforeEach(() => {
  resetOps();
  vi.spyOn(logs.portal.tech, 'error').mockImplementation(() => undefined);
  spies.useQuery.mockClear();
  spies.client.query.mockReset();
  spies.client.query.mockImplementation(async () => ({
    data: { portalSecurityLogsTable: { rows: ops.tableRows, total: ops.tableRows.length } },
  }));
  ops.tableRows = [logRow()];
  ops.q.PortalSecurityLog = { data: { portalSecurityLog: logDetail() } };
});

/** One titled block of the open drawer, by its heading. */
const section = (drawer: HTMLElement, title: string) => {
  const card = within(drawer).getByText(title).closest('.MuiCard-root');
  if (!(card instanceof HTMLElement)) throw new Error(`The drawer has no "${title}" section`);
  return within(card);
};

const openFirstRow = async () => {
  renderPage();
  fireEvent.click(await screen.findByText('Asha Rao'));
  return screen.findByRole('dialog', { name: 'Login verification' });
};

describe('the verification log', () => {
  it('lists each verification with a masked address and a coarse place, and nothing more precise', async () => {
    ops.tableRows = [
      logRow(),
      logRow({
        id: 'log-2',
        user_name: 'Vikram Shah',
        user_email: 'vikram@example.test',
        roles: ['SUPER_ADMIN', 'TECH_MANAGER'],
        is_employee: false,
        employee_title: null,
        result: 'EXCEPTION_APPROVED',
        method: 'ADMIN_EXCEPTION',
        has_location: false,
        ip_masked: '49.36.x.x',
        ip_city: null,
        ip_region: 'Karnataka',
        browser: 'Safari 17',
        os: null,
      }),
    ];
    renderPage();

    const first = within(await rowOf('log-1'));
    expect(first.getByText('Asha Rao')).toBeInTheDocument();
    expect(first.getByText('asha@duncit.com')).toBeInTheDocument();
    expect(first.getByText('Employee')).toBeInTheDocument();
    expect(first.getByText('Platform Engineer')).toBeInTheDocument();
    expect(first.getByText('TECH_MANAGER')).toBeInTheDocument();
    expect(first.getByText('tech')).toBeInTheDocument();
    expect(first.getByText('Verified')).toBeInTheDocument();
    expect(first.getByText('Shared location')).toBeInTheDocument();
    expect(first.getByText('103.21.x.x')).toBeInTheDocument();
    expect(first.getByText('Mumbai, Maharashtra, IN')).toBeInTheDocument();
    expect(first.getByText('Yes')).toBeInTheDocument();
    expect(first.getByText('Chrome 126 · Windows 11')).toBeInTheDocument();
    expect(first.getByText(formatDateTime('2026-11-20T10:30:00.000Z'))).toBeInTheDocument();

    const second = within(await rowOf('log-2'));
    expect(second.getByText('Not an employee')).toBeInTheDocument();
    expect(second.getByText('SUPER_ADMIN')).toBeInTheDocument();
    expect(second.getByText('Verified by exception')).toBeInTheDocument();
    expect(second.getByText('Administrator exception')).toBeInTheDocument();
    expect(second.getByText('49.36.x.x')).toBeInTheDocument();
    expect(second.getByText('Karnataka, IN')).toBeInTheDocument();
    expect(second.getByText('No')).toBeInTheDocument();
    expect(second.getByText('Safari 17')).toBeInTheDocument();
  });

  it('shows a dash for what a record does not have, and a value it cannot name exactly as sent', async () => {
    ops.tableRows = [
      logRow({
        id: 'log-3',
        user_name: '',
        user_email: 'ghost@example.test',
        roles: [],
        result: 'LOCATION_DENIED',
        method: null,
        ip_masked: null,
        ip_city: null,
        ip_region: null,
        ip_country: null,
        browser: null,
        os: null,
        has_location: false,
      }),
      logRow({ id: 'log-4', result: 'FUTURE_RESULT' }),
    ];
    renderPage();

    const denied = within(await rowOf('log-3'));
    // With no name the address stands in for it, on both lines of the cell.
    expect(denied.getAllByText('ghost@example.test')).toHaveLength(2);
    expect(denied.getByText('Location declined')).toBeInTheDocument();
    // roles, method, address, place and device.
    expect(denied.getAllByText('—')).toHaveLength(5);

    expect(within(await rowOf('log-4')).getByText('FUTURE_RESULT')).toBeInTheDocument();
  });

  it('asks the server for the newest first, and never selects an address or a position for the list', async () => {
    renderPage();
    await rowOf('log-1');
    expect(spies.client.query).toHaveBeenCalledWith({
      query: PORTAL_SECURITY_LOGS_TABLE,
      variables: { query: expect.objectContaining({ page: 1, sort_by: 'created_at', sort_dir: 'desc', filters: [] }) },
      fetchPolicy: 'network-only',
    });

    const listed = print(PORTAL_SECURITY_LOGS_TABLE);
    expect(listed).toContain('ip_masked');
    for (const sealed of ['ip', 'latitude', 'longitude', 'accuracy_m', 'location_error', 'user_agent', 'duid']) {
      expect(listed).not.toMatch(new RegExp(String.raw`\b${sealed}\b`));
    }
  });

  it('reads no record in full until a row is opened', async () => {
    renderPage();
    await rowOf('log-1');
    expect(detailReads()).toHaveLength(0);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('one verification opened in full', () => {
  it('reads exactly that record, straight from the server and never from the cache', async () => {
    await openFirstRow();
    expect(detailReads()).toEqual([{ variables: { id: 'log-1' }, fetchPolicy: 'no-cache' }]);
  });

  it('answers who: the person, their roles, and the HR record then and now', async () => {
    const drawer = await openFirstRow();
    const who = section(drawer, 'Who');
    expect(who.getByText('asha@duncit.com')).toBeInTheDocument();
    expect(who.getByText('TECH_MANAGER')).toBeInTheDocument();
    expect(who.getByText('SUPER_ADMIN')).toBeInTheDocument();
    expect(who.getAllByText('Employee')).toHaveLength(2);
    expect(who.getByText('Platform Engineer')).toBeInTheDocument();
    expect(who.getByText('Staff Engineer')).toBeInTheDocument();
    expect(who.getByText('Engineering')).toBeInTheDocument();
    expect(who.getByText('Full time')).toBeInTheDocument();
  });

  it('shows somebody who was an employee at sign-in and is not one today', async () => {
    ops.q.PortalSecurityLog = {
      data: { portalSecurityLog: logDetail({ current_is_employee: false, current_employee_title: null }) },
    };
    const who = section(await openFirstRow(), 'Who');
    expect(who.getAllByText('Employee')).toHaveLength(1);
    expect(who.getAllByText('Not an employee')).toHaveLength(1);
  });

  it('shows somebody the HR portal has never held as not an employee, with no seat to report', async () => {
    ops.q.PortalSecurityLog = {
      data: {
        portalSecurityLog: logDetail({
          is_employee: false,
          current_is_employee: false,
          employee_title: null,
          current_employee_title: null,
          employee_department: null,
          employment_type: null,
        }),
      },
    };
    const who = section(await openFirstRow(), 'Who');
    expect(who.getAllByText('Not an employee')).toHaveLength(2);
    expect(who.queryByText('Employee')).not.toBeInTheDocument();
    // seat, seat today, department and employment type.
    expect(who.getAllByText('—')).toHaveLength(4);
  });

  it('answers when: sign-in, verification, time zone, and the same person’s other verifications', async () => {
    const when = section(await openFirstRow(), 'When');
    expect(when.getByText(formatDateTime('2026-11-20T10:28:00.000Z'))).toBeInTheDocument();
    expect(when.getByText(formatDateTime('2026-11-20T10:30:00.000Z'))).toBeInTheDocument();
    expect(when.getByText('Asia/Kolkata')).toBeInTheDocument();
    const log = within(when.getByRole('list', { name: 'Other verifications by this person' }));
    expect(log.getByText(formatDateTime('2026-11-19T09:00:00.000Z'))).toBeInTheDocument();
    expect(log.getByText('finance · Shared location')).toBeInTheDocument();
    expect(log.getByText('Verified')).toBeInTheDocument();
  });

  it('says so when the person has no other verifications', async () => {
    ops.q.PortalSecurityLog = { data: { portalSecurityLog: logDetail({ related: [] }) } };
    const when = section(await openFirstRow(), 'When');
    expect(when.getByText('No other verifications are recorded for this person.')).toBeInTheDocument();
    expect(when.queryByRole('list')).not.toBeInTheDocument();
  });

  it('answers where: the whole address, an approximate place that says it is approximate, and the shared position on a map', async () => {
    const drawer = await openFirstRow();
    const where = section(drawer, 'Where');
    expect(where.getByTestId('login-verification-ip')).toHaveTextContent('103.21.44.9');
    expect(where.getByText('Mumbai, Maharashtra, IN')).toBeInTheDocument();
    expect(where.getByTestId('login-verification-approximate')).toHaveTextContent(
      'Approximate — derived from the IP address, not GPS.',
    );
    const frame = where.getByTitle('Position the person shared when they verified');
    expect(frame).toHaveAttribute('src', expect.stringContaining('19.076%2C72.8777'));
    expect(where.getByTestId('security-location-map')).toHaveTextContent('accurate to about 38 m');
    expect(where.queryByTestId('login-verification-no-location')).not.toBeInTheDocument();
  });

  it('draws no map when the person shared no position, and says why', async () => {
    ops.q.PortalSecurityLog = {
      data: {
        portalSecurityLog: logDetail({
          has_location: false,
          latitude: null,
          longitude: null,
          accuracy_m: null,
          location_error: 'PERMISSION_DENIED',
          result: 'LOCATION_DENIED',
          method: null,
          consent: {
            authorized_person: true,
            credentials_not_shared: true,
            policies_acknowledged: true,
            location_consent: false,
          },
        }),
      },
    };
    const drawer = await openFirstRow();
    const where = section(drawer, 'Where');
    expect(where.queryByTestId('security-location-map')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Position the person shared when they verified')).not.toBeInTheDocument();
    expect(where.getByTestId('login-verification-no-location')).toHaveTextContent(
      'Location access was declined in the browser.',
    );
    // The address is still there, and still labelled approximate.
    expect(where.getByTestId('login-verification-ip')).toHaveTextContent('103.21.44.9');
    expect(where.getByTestId('login-verification-approximate')).toBeInTheDocument();
  });

  it('draws no map for a position it holds only one half of', async () => {
    ops.q.PortalSecurityLog = {
      data: { portalSecurityLog: logDetail({ longitude: null, has_location: false }) },
    };
    const where = section(await openFirstRow(), 'Where');
    expect(where.queryByTestId('security-location-map')).not.toBeInTheDocument();
    expect(where.getByTestId('login-verification-no-location')).toHaveTextContent('No location was recorded.');
  });

  it('answers on what: browser, system, device, language and the exact user agent', async () => {
    const device = section(await openFirstRow(), 'Device');
    expect(device.getByText('Chrome 126')).toBeInTheDocument();
    expect(device.getByText('Windows 11')).toBeInTheDocument();
    expect(device.getByText('desktop')).toBeInTheDocument();
    expect(device.getByText('Windows')).toBeInTheDocument();
    expect(device.getByText('en-IN')).toBeInTheDocument();
    expect(device.getByText('duid-7f3a')).toBeInTheDocument();
    expect(device.getByText('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0')).toBeInTheDocument();
  });

  it('lists the four acknowledgements as read-only answers, with the wording version they were given against', async () => {
    const consent = section(await openFirstRow(), 'Consent');
    expect(consent.getByText('Confirmed they are an authorized employee or approved person')).toBeInTheDocument();
    expect(consent.getByText('Confirmed they have not shared their login credentials')).toBeInTheDocument();
    expect(consent.getByText('Acknowledged security monitoring, IP logging and the privacy policies')).toBeInTheDocument();
    expect(consent.getByText('Agreed to share their current location')).toBeInTheDocument();
    expect(consent.getAllByTitle('Acknowledged')).toHaveLength(4);
    expect(consent.queryByTitle('Not acknowledged')).not.toBeInTheDocument();
    expect(consent.getAllByText('2026-11-23.1')).toHaveLength(2);
    expect(consent.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('shows a refused acknowledgement as refused, not as missing', async () => {
    ops.q.PortalSecurityLog = {
      data: {
        portalSecurityLog: logDetail({
          consent: {
            authorized_person: true,
            credentials_not_shared: true,
            policies_acknowledged: true,
            location_consent: false,
          },
        }),
      },
    };
    const consent = section(await openFirstRow(), 'Consent');
    expect(consent.getAllByTitle('Acknowledged')).toHaveLength(3);
    expect(consent.getAllByTitle('Not acknowledged')).toHaveLength(1);
  });

  it('shows the alternative verification that stood in for a position, and what the administrator wrote', async () => {
    ops.q.PortalSecurityLog = {
      data: {
        portalSecurityLog: logDetail({
          result: 'EXCEPTION_APPROVED',
          method: 'ADMIN_EXCEPTION',
          has_location: false,
          latitude: null,
          longitude: null,
          accuracy_m: null,
          exception: {
            status: 'USED',
            reason: 'My laptop has no location service.',
            decided_by_name: 'Priya Nair',
            decided_at: '2026-11-20T10:00:00.000Z',
            decision_note: 'Confirmed by phone.',
          },
        }),
      },
    };
    const drawer = await openFirstRow();
    const exception = section(drawer, 'Alternative verification');
    expect(exception.getByText('Used')).toBeInTheDocument();
    expect(exception.getByText('My laptop has no location service.')).toBeInTheDocument();
    expect(exception.getByText('Priya Nair')).toBeInTheDocument();
    expect(exception.getByText(formatDateTime('2026-11-20T10:00:00.000Z'))).toBeInTheDocument();
    expect(exception.getByText('Confirmed by phone.')).toBeInTheDocument();
    expect(section(drawer, 'Where').getByTestId('login-verification-no-location')).toHaveTextContent(
      'Verified through an administrator-approved alternative, so no location was taken.',
    );
  });

  it('has no alternative-verification section for a verification that took a position', async () => {
    const drawer = await openFirstRow();
    expect(within(drawer).queryByText('Alternative verification')).not.toBeInTheDocument();
  });

  it('shows who has read the record, newest first as the server sent them', async () => {
    ops.q.PortalSecurityLog = {
      data: {
        portalSecurityLog: logDetail({
          access_history: [
            { id: 'acc-2', actor_name: 'Priya Nair', action: 'VIEW', created_at: '2026-11-22T09:00:00.000Z' },
            { id: 'acc-1', actor_name: 'Rohan Mehta', action: 'FUTURE_ACTION', created_at: '2026-11-21T08:15:00.000Z' },
          ],
        }),
      },
    };
    const history = section(await openFirstRow(), 'Who has viewed this record');
    const entries = history.getAllByRole('listitem');
    expect(entries).toHaveLength(2);
    expect(entries[0]).toHaveTextContent(`Priya NairOpened this record · ${formatDateTime('2026-11-22T09:00:00.000Z')}`);
    expect(entries[1]).toHaveTextContent(`Rohan MehtaFUTURE_ACTION · ${formatDateTime('2026-11-21T08:15:00.000Z')}`);
  });

  it('says so when nobody is recorded as having opened it', async () => {
    ops.q.PortalSecurityLog = { data: { portalSecurityLog: logDetail({ access_history: [] }) } };
    const history = section(await openFirstRow(), 'Who has viewed this record');
    expect(history.getByText('Nobody has opened this record yet.')).toBeInTheDocument();
  });
});

describe('while a record is not available', () => {
  it('announces that it is loading, with nothing of the record on screen', async () => {
    ops.q.PortalSecurityLog = { loading: true };
    renderPage();
    fireEvent.click(await screen.findByText('Asha Rao'));
    const drawer = await screen.findByRole('dialog', { name: 'Login verification' });
    expect(within(drawer).getByRole('status')).toBeInTheDocument();
    expect(within(drawer).queryByTestId('login-verification-detail')).not.toBeInTheDocument();
  });

  it.each([
    ['FORBIDDEN', 'Access Denied', 'You do not have access to verification records. Only Super Admin and Tech Manager can read them.'],
    [
      'NOT_FOUND',
      'Verification not found',
      'This record no longer exists. Verifications are removed once their retention period has passed.',
    ],
    ['INTERNAL_SERVER_ERROR', 'boom', 'This record could not be loaded. Please try again.'],
  ])('explains a %s refusal in words, not as the server’s message', async (code, message, expected) => {
    ops.q.PortalSecurityLog = { error: graphQlFailure(code, message) };
    const drawer = await openFirstRow();
    expect(within(drawer).getByRole('alert')).toHaveTextContent(expected);
    expect(within(drawer).queryByText(message)).not.toBeInTheDocument();
    expect(within(drawer).queryByTestId('login-verification-detail')).not.toBeInTheDocument();
    // Support is told which record failed, and why, without the person's details.
    expect(logs.portal.tech.error).toHaveBeenCalledWith(
      'LoginVerifications',
      'openRecord',
      expect.objectContaining({ record_id: 'log-1', error: expect.objectContaining({ message: expect.any(String) }) }),
    );
  });

  it('logs nothing when the record opens', async () => {
    await openFirstRow();
    expect(logs.portal.tech.error).not.toHaveBeenCalled();
  });

  it('says it could not be loaded when the connection fails before the server answers', async () => {
    ops.q.PortalSecurityLog = { error: new Error('Failed to fetch') };
    const drawer = await openFirstRow();
    expect(within(drawer).getByRole('alert')).toHaveTextContent('This record could not be loaded. Please try again.');
  });
});

describe('closing and opening another row', () => {
  it('closes without reading anything else, then reads the next row on its own id', async () => {
    ops.tableRows = [logRow(), logRow({ id: 'log-2', user_name: 'Vikram Shah', user_email: 'vikram@example.test' })];
    renderPage();
    fireEvent.click(await screen.findByText('Asha Rao'));
    await screen.findByRole('dialog', { name: 'Login verification' });

    fireEvent.click(screen.getByTestId('login-verification-close'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(detailReads()).toHaveLength(1);

    fireEvent.click(screen.getByText('Vikram Shah'));
    await screen.findByRole('dialog', { name: 'Login verification' });
    expect(detailReads()).toEqual([
      { variables: { id: 'log-1' }, fetchPolicy: 'no-cache' },
      { variables: { id: 'log-2' }, fetchPolicy: 'no-cache' },
    ]);
  });

  it('names the close control for a screen reader', async () => {
    const drawer = await openFirstRow();
    expect(within(drawer).getByRole('button', { name: 'Close' })).toBe(screen.getByTestId('login-verification-close'));
  });
});
