import { Types } from 'mongoose';
import { UserModel } from '../../user.model';
import { numberHeldElsewhere } from '../../number-owner';

const EXT = '+91';
const NUMBER = '9569912921';

const account = (over: Record<string, unknown> = {}) =>
  UserModel.create({
    auth: { email: `${new Types.ObjectId().toString()}@duncit.com` },
    profile: { first_name: 'Riya' },
    ...over,
  });

/**
 * Which numbers count as taken, and for whom.
 *
 * The rule exists because a number resolves an ACCOUNT at three sign-in doors,
 * and `accountFor` reads either field — so both fields have to answer here,
 * and the caller's own account must never answer against itself.
 */
describe('numberHeldElsewhere', () => {
  it('is false when nobody holds the number', async () => {
    await expect(numberHeldElsewhere(EXT, NUMBER)).resolves.toBe(false);
  });

  it('is true when the number is another account’s mobile', async () => {
    await account({ auth: { email: 'a@duncit.com', phone: { number: NUMBER, extension: EXT } } });

    await expect(numberHeldElsewhere(EXT, NUMBER)).resolves.toBe(true);
  });

  it('is true when the number is another account’s WhatsApp number', async () => {
    await account({ communication: { whatsapp: { number: NUMBER, extension: EXT } } });

    await expect(numberHeldElsewhere(EXT, NUMBER)).resolves.toBe(true);
  });

  it('ignores a different dialling code', async () => {
    await account({ communication: { whatsapp: { number: NUMBER, extension: '+44' } } });

    await expect(numberHeldElsewhere(EXT, NUMBER)).resolves.toBe(false);
  });

  it('does not count the caller’s own account against itself', async () => {
    const mine = await account({
      auth: { email: 'mine@duncit.com', phone: { number: NUMBER, extension: EXT } },
    });

    await expect(numberHeldElsewhere(EXT, NUMBER, String(mine._id))).resolves.toBe(false);
  });

  it('still sees a number somebody else holds when one account is excluded', async () => {
    const mine = await account();
    await account({ communication: { whatsapp: { number: NUMBER, extension: EXT } } });

    await expect(numberHeldElsewhere(EXT, NUMBER, String(mine._id))).resolves.toBe(true);
  });
});
