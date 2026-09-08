// Read off the real module so a sender added later cannot arrive undefined.
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
import { EMAIL_OTP_MINUTES, hashOtp } from '@modules/access/user/email-otp';
import { contactChangeService } from '../../contactChange.service';

const NEXT = 'riya.new@duncit.com';

let seq = 0;
const account = (over: Record<string, unknown> = {}) => {
  seq += 1;
  return UserModel.create({
    auth: { email: `owner${seq}@duncit.com` },
    profile: { first_name: 'Riya' },
    ...over,
  });
};

const id = (doc: { _id: unknown }) => String(doc._id);

/** Ask for a code and read it back — echoed outside production. */
const codeFor = async (user: string, email = NEXT) => {
  const res = await contactChangeService.requestEmailOtp(user, email);
  return String(res.dev_otp);
};

/**
 * Push the live code's expiry back so the resend cooldown has elapsed.
 *
 * The cooldown is derived from how much of the code's own TTL is left, so
 * ageing the code IS ageing the send — there is no second timestamp to move.
 */
const ageTheCode = (user: string, minutesAgo: number) =>
  UserModel.updateOne(
    { _id: user },
    {
      $set: {
        'auth.email_change_otp_expires_at': new Date(
          Date.now() + (EMAIL_OTP_MINUTES - minutesAgo) * 60_000
        ),
      },
    }
  );

/**
 * Changing the address Duncit writes to.
 *
 * The code goes to the NEW address, so every refusal here is about the same
 * thing: a code may only ever prove the one address it was actually sent to.
 */
describe('contactChangeService — email', () => {
  describe('asking for a code', () => {
    it('refuses a blank address', async () => {
      const mine = await account();

      await expect(contactChangeService.requestEmailOtp(id(mine), '  ')).rejects.toThrow(
        /enter the new email address/i
      );
    });

    it('refuses an address the account already has', async () => {
      const mine = await account({ auth: { email: NEXT } });

      await expect(contactChangeService.requestEmailOtp(id(mine), NEXT)).rejects.toThrow(
        /already your email address/i
      );
    });

    it('refuses an address another account holds', async () => {
      const mine = await account();
      await account({ auth: { email: NEXT } });

      await expect(contactChangeService.requestEmailOtp(id(mine), NEXT)).rejects.toThrow(
        /already in use/i
      );
    });

    it('refuses a request from an account that no longer exists', async () => {
      await expect(
        contactChangeService.requestEmailOtp(new Types.ObjectId().toString(), NEXT)
      ).rejects.toThrow(/user not found/i);
    });

    it('pins the address to the code it mints', async () => {
      const mine = await account();

      const res = await contactChangeService.requestEmailOtp(id(mine), ` ${NEXT.toUpperCase()} `);

      expect(res.ok).toBe(true);
      const saved: any = await UserModel.findById(id(mine))
        .select('+auth.email_change_pending')
        .lean();
      expect(saved.auth.email_change_pending).toBe(NEXT);
    });

    it('refuses a second code inside the cooldown', async () => {
      const mine = await account();
      await codeFor(id(mine));

      await expect(contactChangeService.requestEmailOtp(id(mine), NEXT)).rejects.toThrow(
        /before asking for another code/i
      );
    });

    it('allows another code once the cooldown has passed', async () => {
      const mine = await account();
      await codeFor(id(mine));
      await ageTheCode(id(mine), 2);

      await expect(contactChangeService.requestEmailOtp(id(mine), NEXT)).resolves.toMatchObject({
        ok: true,
      });
    });
  });

  describe('spending the code', () => {
    it('moves the address and marks it verified', async () => {
      const mine = await account();
      const otp = await codeFor(id(mine));

      await contactChangeService.confirmEmailChange(id(mine), NEXT, otp);

      const saved: any = await UserModel.findById(id(mine))
        .select('+auth.email_change_otp_hash +auth.email_change_pending')
        .lean();
      expect(saved.auth.email).toBe(NEXT);
      expect(saved.auth.is_email_verified).toBe(true);
      expect(saved.auth.email_change_otp_hash).toBeUndefined();
      expect(saved.auth.email_change_pending).toBeUndefined();
    });

    it('refuses when no code was ever asked for', async () => {
      const mine = await account();

      await expect(
        contactChangeService.confirmEmailChange(id(mine), NEXT, '123456')
      ).rejects.toThrow(/otp expired/i);
    });

    it('refuses a code whose window has closed', async () => {
      const mine = await account();
      const otp = await codeFor(id(mine));
      await ageTheCode(id(mine), EMAIL_OTP_MINUTES + 1);

      await expect(contactChangeService.confirmEmailChange(id(mine), NEXT, otp)).rejects.toThrow(
        /otp expired/i
      );
    });

    it('refuses a code alongside a different address', async () => {
      const mine = await account();
      const otp = await codeFor(id(mine));

      await expect(
        contactChangeService.confirmEmailChange(id(mine), 'someone.else@duncit.com', otp)
      ).rejects.toThrow(/sent to a different address/i);
    });

    it('refuses a wrong code', async () => {
      const mine = await account();
      await codeFor(id(mine));

      await expect(
        contactChangeService.confirmEmailChange(id(mine), NEXT, '000000')
      ).rejects.toThrow(/invalid otp/i);
    });

    it('refuses an address claimed while the code was in flight', async () => {
      const mine = await account();
      const otp = await codeFor(id(mine));
      await account({ auth: { email: NEXT } });

      await expect(contactChangeService.confirmEmailChange(id(mine), NEXT, otp)).rejects.toThrow(
        /already in use/i
      );
    });

    it('refuses a confirm from an account that no longer exists', async () => {
      await expect(
        contactChangeService.confirmEmailChange(new Types.ObjectId().toString(), NEXT, '123456')
      ).rejects.toThrow(/user not found/i);
    });

    it('reports the address as taken when the unique index refuses the write', async () => {
      const mine = await account();
      const otp = await codeFor(id(mine));
      const write = jest
        .spyOn(UserModel, 'findByIdAndUpdate')
        .mockRejectedValueOnce({ code: 11000 } as never);

      await expect(contactChangeService.confirmEmailChange(id(mine), NEXT, otp)).rejects.toThrow(
        /already in use/i
      );
      write.mockRestore();
    });

    it('rethrows a write failure that is not a duplicate', async () => {
      const mine = await account();
      const otp = await codeFor(id(mine));
      const write = jest
        .spyOn(UserModel, 'findByIdAndUpdate')
        .mockRejectedValueOnce(new Error('mongo is down') as never);

      await expect(contactChangeService.confirmEmailChange(id(mine), NEXT, otp)).rejects.toThrow(
        /mongo is down/i
      );
      write.mockRestore();
    });

    it('reports the account as gone when it disappears during the write', async () => {
      const mine = await account();
      const otp = await codeFor(id(mine));
      const write = jest
        .spyOn(UserModel, 'findByIdAndUpdate')
        .mockResolvedValueOnce(null as never);

      await expect(contactChangeService.confirmEmailChange(id(mine), NEXT, otp)).rejects.toThrow(
        /user not found/i
      );
      write.mockRestore();
    });
  });

  /*
    What the service is handed when the argument is absent rather than wrong.
    GraphQL types both of these non-null, so only a direct caller can do it —
    which is exactly why the service answers for itself rather than trusting
    the schema above it.
  */
  describe('absent arguments', () => {
    it('treats a missing address as a blank one', async () => {
      const mine = await account();

      await expect(
        contactChangeService.requestEmailOtp(id(mine), null as unknown as string)
      ).rejects.toThrow(/enter the new email address/i);
    });

    it('treats a missing code as an unusable one', async () => {
      const mine = await account();

      await expect(
        contactChangeService.confirmEmailChange(
          id(mine),
          null as unknown as string,
          null as unknown as string
        )
      ).rejects.toThrow(/otp expired/i);
    });
  });

  /*
    Accounts that predate the fields being read, written straight to the
    collection because the model would refuse to save one.
  */
  describe('accounts missing the fields being read', () => {
    it('sends to an account that has no address of its own yet', async () => {
      const mine = await account({ auth: {} });

      await expect(contactChangeService.requestEmailOtp(id(mine), NEXT)).resolves.toMatchObject({
        ok: true,
      });
    });

    it('names a recipient for an account with no profile name', async () => {
      const legacy = new Types.ObjectId();
      await UserModel.collection.insertOne({
        _id: legacy,
        auth: { email: 'legacy@duncit.com' },
      } as never);

      await expect(
        contactChangeService.requestEmailOtp(String(legacy), NEXT)
      ).resolves.toMatchObject({ ok: true });
    });

    it('refuses a confirm on an account with no auth at all', async () => {
      const legacy = new Types.ObjectId();
      await UserModel.collection.insertOne({
        _id: legacy,
        profile: { first_name: 'Legacy' },
      } as never);

      await expect(
        contactChangeService.confirmEmailChange(String(legacy), NEXT, '123456')
      ).rejects.toThrow(/otp expired/i);
    });

    it('refuses a live code that was never pinned to an address', async () => {
      const mine = await account();
      await UserModel.updateOne(
        { _id: mine._id },
        {
          $set: {
            'auth.email_change_otp_hash': hashOtp('123456'),
            'auth.email_change_otp_expires_at': new Date(Date.now() + 60_000),
          },
        }
      );

      await expect(
        contactChangeService.confirmEmailChange(id(mine), NEXT, '123456')
      ).rejects.toThrow(/sent to a different address/i);
    });
  });
});
