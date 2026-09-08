// The email transport, stubbed the way every other suite here stubs it: read
// off the real module so a sender added later cannot arrive undefined.
jest.mock('@services/email/email.service', () => {
  const actual = jest.requireActual('@services/email/email.service');
  return Object.fromEntries(
    Object.entries(actual).map(([key, value]) => [
      key,
      typeof value === 'function' ? jest.fn().mockResolvedValue(undefined) : value,
    ])
  );
});

import { Types } from 'mongoose';
import { UserModel } from '@modules/access/user/user.model';
import { otpService } from '@modules/platform/otp/otp.service';
import { contactChangeService } from '../../contactChange.service';

const EXT = '+91';
/** The number from the reported bug: one account already reaches it. */
const TAKEN = '9569912921';
const FREE = '9812345678';

let seq = 0;
const account = (over: Record<string, unknown> = {}) => {
  seq += 1;
  return UserModel.create({
    auth: { email: `person${seq}@duncit.com` },
    profile: { first_name: 'Riya' },
    ...over,
  });
};

const id = (doc: { _id: unknown }) => String(doc._id);

/** Request a code and read it back — delivery is stubbed, so it is echoed. */
const codeFor = async (user: string, field: 'PHONE' | 'WHATSAPP', number: string) => {
  const res = await contactChangeService.requestPhoneOtp(user, field, EXT, number);
  return String(res.test_code);
};

/**
 * Changing the numbers Duncit reaches somebody on.
 *
 * Every case here is about what the service REFUSES, because that is what the
 * flow is for: a code proves the new value belongs to the person typing it,
 * and everything around the code exists to stop it proving something else.
 */
describe('contactChangeService — numbers', () => {
  describe('a number another account already reaches', () => {
    it('refuses a WhatsApp number held as another account WhatsApp number', async () => {
      const mine = await account();
      await account({ communication: { whatsapp: { number: TAKEN, extension: EXT } } });

      await expect(
        contactChangeService.requestPhoneOtp(id(mine), 'WHATSAPP', EXT, TAKEN)
      ).rejects.toThrow(/WhatsApp number is already linked to another account/i);
    });

    it('refuses a WhatsApp number held as another account mobile', async () => {
      const mine = await account();
      await account({
        auth: { email: 'other@duncit.com', phone: { number: TAKEN, extension: EXT } },
      });

      await expect(
        contactChangeService.requestPhoneOtp(id(mine), 'WHATSAPP', EXT, TAKEN)
      ).rejects.toThrow(/already linked to another account/i);
    });

    it('refuses a mobile number held as another account WhatsApp number', async () => {
      const mine = await account();
      await account({ communication: { whatsapp: { number: TAKEN, extension: EXT } } });

      await expect(
        contactChangeService.requestPhoneOtp(id(mine), 'PHONE', EXT, TAKEN)
      ).rejects.toThrow(/phone number is already registered to another account/i);
    });

    it('sends no code when the number is refused', async () => {
      const mine = await account();
      await account({ communication: { whatsapp: { number: TAKEN, extension: EXT } } });

      await contactChangeService
        .requestPhoneOtp(id(mine), 'WHATSAPP', EXT, TAKEN)
        .catch(() => null);

      // Nothing to verify against, because nothing was ever issued.
      await expect(
        contactChangeService.confirmPhoneChange(id(mine), 'WHATSAPP', EXT, FREE, '123456')
      ).rejects.toThrow(/expired/i);
    });

    it('refuses again at confirm, for a number claimed while the code was in flight', async () => {
      const mine = await account();
      const otp = await codeFor(id(mine), 'WHATSAPP', TAKEN);
      await account({ communication: { whatsapp: { number: TAKEN, extension: EXT } } });

      await expect(
        contactChangeService.confirmPhoneChange(id(mine), 'WHATSAPP', EXT, TAKEN, otp)
      ).rejects.toThrow(/already linked to another account/i);
    });

    it('does not count the caller own number against them', async () => {
      const mine = await account({
        communication: { whatsapp: { number: TAKEN, extension: EXT } },
      });

      await expect(
        contactChangeService.requestPhoneOtp(id(mine), 'PHONE', EXT, TAKEN)
      ).resolves.toMatchObject({ test_code: expect.any(String) });
    });

    it('refuses a request from an account that no longer exists', async () => {
      await expect(
        contactChangeService.requestPhoneOtp(
          new Types.ObjectId().toString(),
          'WHATSAPP',
          EXT,
          FREE
        )
      ).rejects.toThrow(/user not found/i);
    });
  });

  describe('storing a proved number', () => {
    it('writes the WhatsApp number and stamps it verified', async () => {
      const mine = await account();
      const otp = await codeFor(id(mine), 'WHATSAPP', FREE);

      await contactChangeService.confirmPhoneChange(id(mine), 'WHATSAPP', EXT, FREE, otp);

      const saved: any = await UserModel.findById(id(mine)).lean();
      expect(saved.communication.whatsapp).toMatchObject({ number: FREE, extension: EXT });
      expect(saved.communication.whatsapp.verified_at).toBeInstanceOf(Date);
    });

    it('writes the mobile number and marks it verified', async () => {
      const mine = await account();
      const otp = await codeFor(id(mine), 'PHONE', FREE);

      await contactChangeService.confirmPhoneChange(id(mine), 'PHONE', EXT, FREE, otp);

      const saved: any = await UserModel.findById(id(mine)).lean();
      expect(saved.auth.phone).toMatchObject({
        number: FREE,
        extension: EXT,
        is_verified: true,
      });
    });

    it('refuses a code minted for a different account', async () => {
      const mine = await account();
      const theirs = await account();
      const otp = await codeFor(id(mine), 'WHATSAPP', FREE);

      await expect(
        contactChangeService.confirmPhoneChange(id(theirs), 'WHATSAPP', EXT, FREE, otp)
      ).rejects.toThrow(/different person/i);
    });

    it('refuses a wrong code', async () => {
      const mine = await account();
      await codeFor(id(mine), 'PHONE', FREE);

      await expect(
        contactChangeService.confirmPhoneChange(id(mine), 'PHONE', EXT, FREE, '000000')
      ).rejects.toThrow(/incorrect code/i);
    });

    it('reports the number as taken when the unique index refuses the write', async () => {
      const mine = await account();
      const otp = await codeFor(id(mine), 'PHONE', FREE);
      const write = jest
        .spyOn(UserModel, 'findByIdAndUpdate')
        .mockRejectedValueOnce({ code: 11000 } as never);

      await expect(
        contactChangeService.confirmPhoneChange(id(mine), 'PHONE', EXT, FREE, otp)
      ).rejects.toThrow(/already registered to another account/i);
      write.mockRestore();
    });

    it('rethrows a write failure that is not a duplicate', async () => {
      const mine = await account();
      const otp = await codeFor(id(mine), 'PHONE', FREE);
      const write = jest
        .spyOn(UserModel, 'findByIdAndUpdate')
        .mockRejectedValueOnce(new Error('mongo is down') as never);

      await expect(
        contactChangeService.confirmPhoneChange(id(mine), 'PHONE', EXT, FREE, otp)
      ).rejects.toThrow(/mongo is down/i);
      write.mockRestore();
    });

    it('reports the account as gone when it disappears during the write', async () => {
      const mine = await account();
      const otp = await codeFor(id(mine), 'PHONE', FREE);
      const write = jest
        .spyOn(UserModel, 'findByIdAndUpdate')
        .mockResolvedValueOnce(null as never);

      await expect(
        contactChangeService.confirmPhoneChange(id(mine), 'PHONE', EXT, FREE, otp)
      ).rejects.toThrow(/user not found/i);
      write.mockRestore();
    });

    /*
      A challenge for the same purpose and number that was raised OUTSIDE this
      flow carries no account in its context. Written through the raw service so
      the challenge really is context-less — going through `requestPhoneOtp`
      would stamp the account on, which is the thing being tested.
    */
    it('refuses a code that names no account at all', async () => {
      const mine = await account();
      const loose = await otpService.request({
        purpose: 'WHATSAPP_CHANGE',
        mediums: ['SMS'],
        phone_extension: EXT,
        phone_number: FREE,
        requested_by: null,
      });

      await expect(
        contactChangeService.confirmPhoneChange(
          id(mine),
          'WHATSAPP',
          EXT,
          FREE,
          String(loose.test_code)
        )
      ).rejects.toThrow(/different person/i);
    });
  });

  /*
    Accounts that predate the profile subdocument, written straight to the
    collection because the model would refuse to save one. The service still
    has to name a recipient for them.
  */
  it('addresses a code from an account with no profile name', async () => {
    const legacy = new Types.ObjectId();
    await UserModel.collection.insertOne({
      _id: legacy,
      auth: { email: 'legacy@duncit.com' },
    } as never);

    await expect(
      contactChangeService.requestPhoneOtp(String(legacy), 'WHATSAPP', EXT, FREE)
    ).resolves.toMatchObject({ test_code: expect.any(String) });
  });
});
