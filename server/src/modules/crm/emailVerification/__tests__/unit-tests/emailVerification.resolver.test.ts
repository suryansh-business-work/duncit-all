import type { GraphQLContext } from '@context';
import { emailVerificationResolvers } from '../../emailVerification.resolver';
import { emailVerificationService } from '../../emailVerification.service';

jest.mock('../../emailVerification.service', () => ({
  emailVerificationService: {
    statuses: jest.fn(),
    table: jest.fn(),
    verify: jest.fn(),
    startBulk: jest.fn(),
  },
}));

const service = jest.mocked(emailVerificationService);
const crmUser = { id: 'u1', email: 'crm@duncit.com', roles: ['CRM_MANAGER'] };
const ctx = (user: unknown) => ({ user }) as unknown as GraphQLContext;
const { Query, Mutation } = emailVerificationResolvers;

describe('emailVerificationResolvers', () => {
  it('lets only CRM roles read statuses, history or run checks', () => {
    const outsider = ctx({ id: 'u2', email: 'x@duncit.com', roles: ['HOST'] });
    expect(() => Query.crmEmailStatuses(null, { emails: ['a@b.co'] }, outsider)).toThrow('Access Denied');
    expect(() => Query.crmEmailVerificationsTable(null, {}, outsider)).toThrow('Access Denied');
    expect(() => Mutation.crmVerifyEmail(null, { email: 'a@b.co' }, outsider)).toThrow('Access Denied');
    expect(() => Mutation.crmVerifyEmailsBulk(null, { content_base64: 'x' }, outsider)).toThrow('Access Denied');
    expect(service.verify).not.toHaveBeenCalled();
    expect(service.startBulk).not.toHaveBeenCalled();
  });

  it('hands a CRM user’s requests to the service', () => {
    Query.crmEmailStatuses(null, { emails: ['a@b.co'] }, ctx(crmUser));
    Query.crmEmailVerificationsTable(null, { query: { page: 2 } }, ctx(crmUser));
    Mutation.crmVerifyEmail(null, { email: 'a@b.co' }, ctx(crmUser));

    expect(service.statuses).toHaveBeenCalledWith(['a@b.co']);
    expect(service.table).toHaveBeenCalledWith({ page: 2 });
    expect(service.verify).toHaveBeenCalledWith(crmUser, 'a@b.co');
  });

  it('passes the upload’s name and page through, blank when the client sent none', () => {
    Mutation.crmVerifyEmailsBulk(null, { content_base64: 'abc', filename: 'leads.csv', url: '/tools/email-verifier' }, ctx(crmUser));
    Mutation.crmVerifyEmailsBulk(null, { content_base64: 'abc', filename: null, url: null }, ctx(crmUser));

    expect(service.startBulk).toHaveBeenNthCalledWith(1, crmUser, 'abc', 'leads.csv', '/tools/email-verifier');
    expect(service.startBulk).toHaveBeenNthCalledWith(2, crmUser, 'abc', '', '');
  });
});
