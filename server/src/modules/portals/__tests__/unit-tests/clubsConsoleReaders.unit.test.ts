/**
 * The Clubs console (clubs.duncit.com) signs in ALL_CLUBS_ACCESS, and a club's
 * page lists its admins and hosts and opens their records in place — so those
 * tables and records answer that role (`embeddedConsoleReaders(…, ['CLUB'])`).
 * Reads only, and a host's identity documents and bank details stay with the
 * hosts console: the clubs console gets them stripped.
 */
const hostTable = jest.fn();
const hostGetById = jest.fn();
const hostAdminUpdate = jest.fn();
const caTable = jest.fn();
const caById = jest.fn();
const caUpdate = jest.fn();

jest.mock('@modules/venues/host/host.service', () => ({
  hostService: {
    table: (...a: unknown[]) => hostTable(...a),
    getById: (...a: unknown[]) => hostGetById(...a),
    adminUpdate: (...a: unknown[]) => hostAdminUpdate(...a),
  },
}));
jest.mock('@modules/access/user/user.service', () => ({ userService: {} }));
jest.mock('@modules/clubs/clubAdminProfile/clubAdminProfile.service', () => ({
  clubAdminProfileService: {
    table: (...a: unknown[]) => caTable(...a),
    byId: (...a: unknown[]) => caById(...a),
    update: (...a: unknown[]) => caUpdate(...a),
  },
}));

import { hostResolvers } from '@modules/venues/host/host.resolver';
import { clubAdminProfileResolvers } from '@modules/clubs/clubAdminProfile/clubAdminProfile.resolver';
import { consoleReaders, embeddedConsoleReaders } from '@modules/portals/console-access';
import { makeContext } from '@test/harness';

type Op = (...a: any[]) => unknown;
const op = (resolvers: { Query?: unknown; Mutation?: unknown }, kind: 'Query' | 'Mutation', name: string): Op =>
  (resolvers[kind] as Record<string, Op>)[name];
const call = (fn: Op, args: unknown, roles: string[]) =>
  (async () => fn({}, args, makeContext({ id: 'staff-1', roles })))();

const CLUBS_STAFF = ['USER', 'ALL_CLUBS_ACCESS'];
const HOSTS_STAFF = ['USER', 'ALL_HOSTS_ACCESS'];
const MEMBER = ['USER'];
const VENUES_STAFF = ['USER', 'ALL_VENUES_ACCESS'];

/** A host as the service returns it, documents and bank details included. */
const HOST = {
  id: 'h-1',
  full_name: 'Asha',
  email: 'asha@duncit.com',
  phone: '+919999999999',
  status: 'APPROVED',
  dob: '1990-01-01T00:00:00.000Z',
  aadhar_number: '123456789012',
  pan_number: 'ABCDE1234F',
  police_verification_url: 'https://cdn.duncit.com/pv.jpg',
  bank_account: { account_number: '0011', ifsc: 'HDFC0001', upi_id: 'asha@upi', account_holder_name: 'Asha', is_verified: true },
};

const STRIPPED = {
  dob: null,
  aadhar_number: '',
  pan_number: '',
  police_verification_url: '',
  bank_account: { account_number: '', ifsc: '', upi_id: '', account_holder_name: '', is_verified: true },
};

const READS: [string, Op, unknown, jest.Mock, unknown][] = [
  ['hostsTable', op(hostResolvers, 'Query', 'hostsTable'), { query: { page: 2 } }, hostTable, { page: 2 }],
  ['host', op(hostResolvers, 'Query', 'host'), { host_doc_id: 'h-1' }, hostGetById, 'h-1'],
  ['clubAdminProfilesTable', op(clubAdminProfileResolvers, 'Query', 'clubAdminProfilesTable'), { query: { page: 2 } }, caTable, { page: 2 }],
  ['clubAdminProfile', op(clubAdminProfileResolvers, 'Query', 'clubAdminProfile'), { id: 'ca-1' }, caById, 'ca-1'],
];

const WRITES: [string, Op, unknown, jest.Mock][] = [
  ['adminUpdateHost', op(hostResolvers, 'Mutation', 'adminUpdateHost'), { host_doc_id: 'h-1' }, hostAdminUpdate],
  ['updateClubAdminProfile', op(clubAdminProfileResolvers, 'Mutation', 'updateClubAdminProfile'), { id: 'ca-1', input: {} }, caUpdate],
];

beforeEach(() => jest.clearAllMocks());

describe('embeddedConsoleReaders', () => {
  it("adds the embedding console's readers to the entity's own, once each", () => {
    const readers = embeddedConsoleReaders('HOST', ['CLUB']);
    expect(readers).toEqual(expect.arrayContaining([...consoleReaders('HOST'), 'ALL_CLUBS_ACCESS']));
    expect(new Set(readers).size).toBe(readers.length);
    expect(readers).not.toContain('ALL_VENUES_ACCESS');
  });
});

describe("A club's admins and hosts read for the Clubs console", () => {
  it.each(READS)('%s answers ALL_CLUBS_ACCESS and delegates its argument', async (_name, fn, args, service, expected) => {
    service.mockResolvedValueOnce({ rows: [] });
    await call(fn, args, CLUBS_STAFF);
    expect(service).toHaveBeenCalledWith(expected);
  });

  it.each(READS)('%s refuses a member and an unrelated console', async (_name, fn, args, service) => {
    await expect(call(fn, args, MEMBER)).rejects.toThrow('Access Denied');
    await expect(call(fn, args, VENUES_STAFF)).rejects.toThrow('Access Denied');
    expect(service).not.toHaveBeenCalled();
  });
});

describe("A host's documents stay with the hosts console", () => {
  it('hostsTable strips identity and bank details for the Clubs console, keeping name, contact and status', async () => {
    hostTable.mockResolvedValueOnce({ rows: [HOST], total: 1, page: 1, page_size: 25 });
    await expect(call(op(hostResolvers, 'Query', 'hostsTable'), {}, CLUBS_STAFF)).resolves.toEqual({
      rows: [{ ...HOST, ...STRIPPED }],
      total: 1,
      page: 1,
      page_size: 25,
    });
  });

  it('host strips them on the record too, and answers null for an unknown id', async () => {
    hostGetById.mockResolvedValueOnce(HOST).mockResolvedValueOnce(null);
    const host = op(hostResolvers, 'Query', 'host');
    await expect(call(host, { host_doc_id: 'h-1' }, CLUBS_STAFF)).resolves.toEqual({ ...HOST, ...STRIPPED });
    await expect(call(host, { host_doc_id: 'nope' }, CLUBS_STAFF)).resolves.toBeNull();
  });

  it('a hosts-console reader still reads them whole, whatever other console they hold', async () => {
    hostTable.mockResolvedValueOnce({ rows: [HOST], total: 1 });
    hostGetById.mockResolvedValueOnce(HOST);
    await expect(call(op(hostResolvers, 'Query', 'hostsTable'), {}, HOSTS_STAFF)).resolves.toEqual({ rows: [HOST], total: 1 });
    await expect(
      call(op(hostResolvers, 'Query', 'host'), { host_doc_id: 'h-1' }, [...CLUBS_STAFF, 'ALL_HOSTS_ACCESS'])
    ).resolves.toEqual(HOST);
  });
});

describe('Writes stay with their own consoles', () => {
  it.each(WRITES)('%s refuses ALL_CLUBS_ACCESS', async (_name, fn, args, service) => {
    await expect(call(fn, args, CLUBS_STAFF)).rejects.toThrow('Access Denied');
    expect(service).not.toHaveBeenCalled();
  });
});
