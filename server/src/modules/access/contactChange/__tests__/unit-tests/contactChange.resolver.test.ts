jest.mock('../../contactChange.service', () => ({
  contactChangeService: {
    requestPhoneOtp: jest.fn().mockResolvedValue({ challenge_id: 'c1' }),
    confirmPhoneChange: jest.fn().mockResolvedValue(undefined),
    requestEmailOtp: jest.fn().mockResolvedValue({ ok: true }),
    confirmEmailChange: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@modules/access/user/user.service', () => ({
  userService: { publishMe: jest.fn().mockResolvedValue({ id: 'u1' }) },
}));

import type { GraphQLContext } from '@context';
import { userService } from '@modules/access/user/user.service';
import { contactChangeService } from '../../contactChange.service';
import { contactChangeResolvers } from '../../contactChange.resolver';

const USER_ID = 'u1';
const signedIn = { user: { id: USER_ID, roles: [] } } as unknown as GraphQLContext;
const signedOut = { user: null } as unknown as GraphQLContext;

const { Mutation } = contactChangeResolvers;
const PHONE = { field: 'WHATSAPP' as const, phone_extension: '+91', phone_number: '9569912921' };

/**
 * Who each mutation acts for.
 *
 * The only thing these resolvers decide is that — there is no `user_id`
 * argument anywhere in the file, because one would be a way to send a code to
 * somebody else's number and then move their account with it. So every case
 * here checks the same two things: the session is required, and the id handed
 * down is the session's own.
 */
describe('contactChange resolvers', () => {
  it('sends a phone code for the signed-in account', async () => {
    await Mutation.requestContactPhoneChangeOtp({}, PHONE, signedIn);

    expect(contactChangeService.requestPhoneOtp).toHaveBeenCalledWith(
      USER_ID,
      'WHATSAPP',
      '+91',
      '9569912921'
    );
  });

  it('confirms a phone change and answers with the account', async () => {
    const result = await Mutation.confirmContactPhoneChange(
      {},
      { ...PHONE, otp: '123456' },
      signedIn
    );

    expect(contactChangeService.confirmPhoneChange).toHaveBeenCalledWith(
      USER_ID,
      'WHATSAPP',
      '+91',
      '9569912921',
      '123456'
    );
    expect(userService.publishMe).toHaveBeenCalledWith(USER_ID);
    expect(result).toEqual({ id: 'u1' });
  });

  it('sends an email code for the signed-in account', async () => {
    await Mutation.requestEmailChangeOtp({}, { email: 'riya@duncit.com' }, signedIn);

    expect(contactChangeService.requestEmailOtp).toHaveBeenCalledWith(USER_ID, 'riya@duncit.com');
  });

  it('confirms an email change and answers with the account', async () => {
    const result = await Mutation.confirmEmailChange(
      {},
      { email: 'riya@duncit.com', otp: '123456' },
      signedIn
    );

    expect(contactChangeService.confirmEmailChange).toHaveBeenCalledWith(
      USER_ID,
      'riya@duncit.com',
      '123456'
    );
    expect(result).toEqual({ id: 'u1' });
  });

  it.each([
    ['requestContactPhoneChangeOtp', PHONE],
    ['confirmContactPhoneChange', { ...PHONE, otp: '123456' }],
    ['requestEmailChangeOtp', { email: 'riya@duncit.com' }],
    ['confirmEmailChange', { email: 'riya@duncit.com', otp: '123456' }],
  ])('refuses %s without a session', async (name, args) => {
    const resolver = (Mutation as Record<string, any>)[name];

    await expect(resolver({}, args, signedOut)).rejects.toThrow(/not authenticated/i);
  });
});
