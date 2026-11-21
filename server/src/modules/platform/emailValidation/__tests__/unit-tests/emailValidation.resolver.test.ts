import type { GraphQLContext } from '@context';
import { emailValidationResolvers } from '../../emailValidation.resolver';
import { emailValidationService } from '../../emailValidation.service';

jest.mock('../../emailValidation.service', () => ({
  emailValidationService: { table: jest.fn(), validate: jest.fn(), revalidate: jest.fn() },
}));

const service = jest.mocked(emailValidationService);
const admin = { id: 'a1', email: 'admin@duncit.com', roles: ['SUPER_ADMIN'] };
const finance = { id: 'f1', email: 'fin@duncit.com', roles: ['FINANCE_MANAGER'] };
const ctx = (user: unknown) => ({ user }) as unknown as GraphQLContext;
const { Query, Mutation } = emailValidationResolvers;

describe('emailValidationResolvers', () => {
  it('keeps the log and re-runs to platform admins', () => {
    expect(() => Query.emailValidationsTable(null, {}, ctx(finance))).toThrow('Access Denied');
    expect(() => Mutation.revalidateEmail(null, { id: 'x' }, ctx(finance))).toThrow('Access Denied');
    expect(service.table).not.toHaveBeenCalled();
    expect(service.revalidate).not.toHaveBeenCalled();
  });

  it('hands an admin’s log read and re-run to the service', () => {
    Query.emailValidationsTable(null, { query: { page: 3 } }, ctx(admin));
    Mutation.revalidateEmail(null, { id: 'row1' }, ctx(admin));

    expect(service.table).toHaveBeenCalledWith({ page: 3 });
    expect(service.revalidate).toHaveBeenCalledWith(admin, 'row1');
  });

  it('lets any signed-in person ask for a check, leaving the console decision to the service', () => {
    Mutation.validateEmail(null, { email: 'a@b.co', portal: 'finance' }, ctx(finance));
    expect(service.validate).toHaveBeenCalledWith(finance, 'a@b.co', 'finance');
  });

  it('refuses a check from someone who is not signed in', () => {
    expect(() => Mutation.validateEmail(null, { email: 'a@b.co', portal: 'finance' }, ctx(null))).toThrow('Not authenticated');
    expect(service.validate).not.toHaveBeenCalled();
  });
});
