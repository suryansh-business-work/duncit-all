import crypto from 'node:crypto';
import { otpService } from '../../otp.service';
import { OtpChallengeModel } from '../../otp.model';

jest.mock('../../otp.model', () => ({
  ...jest.requireActual('../../otp.model'),
  OtpChallengeModel: { create: jest.fn() },
}));

const create = OtpChallengeModel.create as unknown as jest.Mock;
const sha = (value: string) => crypto.createHash('sha256').update(value).digest('hex');

describe('otpService.attest', () => {
  beforeEach(() => {
    create.mockImplementation(async (fields: Record<string, unknown>) => ({
      _id: 'ch1',
      ...fields,
      save: jest.fn().mockResolvedValue(undefined),
    }));
  });

  it('records a challenge that is already verified, for exactly the number proven', async () => {
    const before = Date.now();
    const target = { phone_extension: '+91', phone_number: '9845012345' };
    const { challenge } = await otpService.attest('WHATSAPP_SIGNUP', target, { attested_by: 'TRUECALLER' });

    const fields = create.mock.calls[0][0];
    expect(fields).toMatchObject({
      purpose: 'WHATSAPP_SIGNUP',
      mediums: [],
      deliveries: [],
      ...target,
      context: { attested_by: 'TRUECALLER' },
    });
    expect(fields.verified_at.getTime()).toBeGreaterThanOrEqual(before);
    // Lives as long as a typed code would, so the grant expires on the same clock.
    expect(fields.expires_at.getTime() - fields.verified_at.getTime()).toBe(10 * 60 * 1000);
    // A code nobody was sent: there is no plaintext that could ever match it.
    expect(fields.code_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(challenge._id).toBe('ch1');
  });

  it('mints the same one-shot grant a verified code earns, storing only its hash', async () => {
    const { challenge, token } = await otpService.attest(
      'LOGIN',
      { phone_extension: '+91', phone_number: '9845012345' },
      { user_id: 'u1' }
    );

    const [id, secret] = token.split('.');
    expect(id).toBe('ch1');
    expect(secret).toMatch(/^[a-f0-9]{64}$/);
    expect(challenge.grant_hash).toBe(sha(secret));
    expect(challenge.save).toHaveBeenCalledTimes(1);
  });

  it('never reuses a hidden code between two attestations', async () => {
    const target = { phone_extension: '+91', phone_number: '9845012345' };
    await otpService.attest('LOGIN', target, {});
    await otpService.attest('LOGIN', target, {});
    expect(create.mock.calls[0][0].code_hash).not.toBe(create.mock.calls[1][0].code_hash);
  });
});
