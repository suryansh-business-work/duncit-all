import { Types } from 'mongoose';
import { shortLinkService } from '../../shortLink.service';
import { shortLinkClickService } from '../../shortLinkClick.service';
import { shortLinkJourneyService, furthestStep } from '../../shortLinkJourney.service';
import { ShortLinkClickModel } from '../../shortLinkClick.model';
import { UserModel } from '@modules/access/user/user.model';

const base = {
  label: 'Diwali pod push',
  destination_url: 'https://mweb.duncit.com/club/c1/pod/p1',
  source: 'INSTAGRAM' as const,
  medium: 'SOCIAL' as const,
};

const ANDROID =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

let seq = 0;
const seedUser = async () => {
  seq += 1;
  return UserModel.create({
    auth: { email: `buyer${seq}@x.com` },
    profile: { first_name: 'Asha', last_name: `K${seq}` },
    metadata: { status: 'ACTIVE', role_keys: ['USER'] },
  });
};

const newLink = () => shortLinkService.create(base, null);

const click = (linkId: string, code: string, clickId: string, at?: Date) =>
  shortLinkClickService.record({
    clickId,
    code,
    shortLinkId: linkId,
    referrer: 'https://www.instagram.com/p/1',
    userAgent: ANDROID,
    forwardedFor: '103.21.244.0',
    at,
  });

describe('furthestStep', () => {
  it('reports the deepest step reached, whatever order they arrived in', () => {
    expect(
      furthestStep([
        { step: 'VIEWED_POD' as const },
        { step: 'LANDED' as const },
        { step: 'SIGNED_UP' as const },
      ]),
    ).toBe('VIEWED_POD');
    expect(furthestStep([{ step: 'PAID' as const }, { step: 'LANDED' as const }])).toBe('PAID');
  });

  it('falls back to CLICKED for a click that never reported back', () => {
    expect(furthestStep([])).toBe('CLICKED');
  });
});

describe('recordStep', () => {
  it('stamps a step once and keeps its original time', async () => {
    const link = await newLink();
    await click(link.id, link.code, 'c-1');

    await shortLinkJourneyService.recordStep('c-1', 'LANDED');
    const first = await ShortLinkClickModel.findOne({ click_id: 'c-1' }).exec();
    const firstAt = first?.journey[0].at;

    await shortLinkJourneyService.recordStep('c-1', 'LANDED');
    const again = await ShortLinkClickModel.findOne({ click_id: 'c-1' }).exec();

    // A reloaded page must not rewrite when something happened.
    expect(again?.journey).toHaveLength(1);
    expect(again?.journey[0].at.toISOString()).toBe(firstAt?.toISOString());
  });

  it('binds the account once the visitor signs in', async () => {
    const link = await newLink();
    const user = await seedUser();
    await click(link.id, link.code, 'c-1');

    await shortLinkJourneyService.recordStep('c-1', 'LANDED');
    await shortLinkJourneyService.recordStep('c-1', 'SIGNED_UP', String(user._id));

    const doc = await ShortLinkClickModel.findOne({ click_id: 'c-1' }).exec();
    expect(String(doc?.user_id)).toBe(String(user._id));
    expect(doc?.journey.map((entry) => entry.step)).toEqual(['LANDED', 'SIGNED_UP']);
  });

  // The step can already be there from an anonymous visit that later signs in.
  it('binds the account even when the step was already recorded', async () => {
    const link = await newLink();
    const user = await seedUser();
    await click(link.id, link.code, 'c-1');

    await shortLinkJourneyService.recordStep('c-1', 'VIEWED_POD');
    await shortLinkJourneyService.recordStep('c-1', 'VIEWED_POD', String(user._id));

    const doc = await ShortLinkClickModel.findOne({ click_id: 'c-1' }).exec();
    expect(String(doc?.user_id)).toBe(String(user._id));
    expect(doc?.journey).toHaveLength(1);
  });

  // The id comes from a URL a visitor can edit — analytics, not an action.
  // The false answer is what lets the landing endpoint fall back to the code.
  it('ignores an unknown click id, and says so', async () => {
    expect(await shortLinkJourneyService.recordStep('nope', 'LANDED')).toBe(false);
    expect(await shortLinkJourneyService.recordStep('nope', 'LANDED', '64b7f9c2f1a2b3c4d5e6f7a8')).toBe(false);
  });

  it('answers true for a step that already happened on a real click', async () => {
    const link = await newLink();
    await click(link.id, link.code, 'c-1');
    await shortLinkJourneyService.recordStep('c-1', 'LANDED');
    expect(await shortLinkJourneyService.recordStep('c-1', 'LANDED')).toBe(true);
  });
});

describe('attributePayment', () => {
  it('credits the sale to the most recent click of that buyer', async () => {
    const link = await newLink();
    const user = await seedUser();
    const older = new Date(Date.now() - 5 * 86_400_000);

    await click(link.id, link.code, 'c-old', older);
    await click(link.id, link.code, 'c-new');
    await shortLinkJourneyService.recordStep('c-old', 'SIGNED_UP', String(user._id));
    await shortLinkJourneyService.recordStep('c-new', 'SIGNED_UP', String(user._id));

    const paymentId = new Types.ObjectId().toHexString();
    expect(
      await shortLinkJourneyService.attributePayment({
        userId: String(user._id),
        paymentId,
        amount: 1500,
      }),
    ).toBe(true);

    const newest = await ShortLinkClickModel.findOne({ click_id: 'c-new' }).exec();
    const oldest = await ShortLinkClickModel.findOne({ click_id: 'c-old' }).exec();
    expect(newest?.converted_amount).toBe(1500);
    expect(newest?.journey.some((entry) => entry.step === 'PAID')).toBe(true);
    // Last touch: the earlier click gets nothing.
    expect(oldest?.converted_amount).toBeNull();
  });

  // A purchase months later is not the poster's doing.
  it('ignores a click older than the attribution window', async () => {
    const link = await newLink();
    const user = await seedUser();
    const ancient = new Date(Date.now() - 40 * 86_400_000);

    await click(link.id, link.code, 'c-old', ancient);
    await shortLinkJourneyService.recordStep('c-old', 'SIGNED_UP', String(user._id));

    expect(
      await shortLinkJourneyService.attributePayment({
        userId: String(user._id),
        paymentId: new Types.ObjectId().toHexString(),
        amount: 900,
      }),
    ).toBe(false);
  });

  it('is silent for a buyer who never followed a link', async () => {
    const user = await seedUser();
    expect(
      await shortLinkJourneyService.attributePayment({
        userId: String(user._id),
        paymentId: new Types.ObjectId().toHexString(),
        amount: 900,
      }),
    ).toBe(false);
  });

  it('does not double-stamp PAID when a payment is verified twice', async () => {
    const link = await newLink();
    const user = await seedUser();
    await click(link.id, link.code, 'c-1');
    await shortLinkJourneyService.recordStep('c-1', 'SIGNED_UP', String(user._id));

    const args = {
      userId: String(user._id),
      paymentId: new Types.ObjectId().toHexString(),
      amount: 1500,
    };
    await shortLinkJourneyService.attributePayment(args);
    await shortLinkJourneyService.attributePayment(args);

    const doc = await ShortLinkClickModel.findOne({ click_id: 'c-1' }).exec();
    expect(doc?.journey.filter((entry) => entry.step === 'PAID')).toHaveLength(1);
  });
});

describe('funnel', () => {
  it('counts how many clicks reached each step, with revenue', async () => {
    const link = await newLink();
    const user = await seedUser();
    await click(link.id, link.code, 'c-1');
    await click(link.id, link.code, 'c-2');
    await click(link.id, link.code, 'c-3');

    await shortLinkJourneyService.recordStep('c-1', 'LANDED');
    await shortLinkJourneyService.recordStep('c-2', 'LANDED');
    await shortLinkJourneyService.recordStep('c-1', 'SIGNED_UP', String(user._id));
    await shortLinkJourneyService.recordStep('c-1', 'CHECKOUT_STARTED');
    await shortLinkJourneyService.attributePayment({
      userId: String(user._id),
      paymentId: new Types.ObjectId().toHexString(),
      amount: 2000,
    });

    const funnel = await shortLinkJourneyService.funnel(link.id);
    const counts = Object.fromEntries(funnel.steps.map((s) => [s.step, s.count]));
    // Every recorded click counts as CLICKED — the redirect is proof enough.
    expect(counts.CLICKED).toBe(3);
    expect(counts.LANDED).toBe(2);
    expect(counts.SIGNED_UP).toBe(1);
    expect(counts.CHECKOUT_STARTED).toBe(1);
    expect(counts.PAID).toBe(1);
    expect(counts.SURVEY_DONE).toBe(0);
    expect(funnel.revenue).toBe(2000);
    expect(funnel.conversion_rate).toBeCloseTo(33.3, 1);
  });

  it('reports an all-zero funnel for a link nobody followed', async () => {
    const link = await newLink();
    const funnel = await shortLinkJourneyService.funnel(link.id);
    expect(funnel.steps.every((step) => step.count === 0)).toBe(true);
    expect(funnel.revenue).toBe(0);
    // No division by zero when nothing has happened.
    expect(funnel.conversion_rate).toBe(0);
  });
});

describe('journeys', () => {
  it('names the person behind each click, and says when there is none', async () => {
    const link = await newLink();
    const user = await seedUser();
    await click(link.id, link.code, 'c-1');
    await click(link.id, link.code, 'c-2');
    await shortLinkJourneyService.recordStep('c-1', 'SIGNED_UP', String(user._id));

    const page = await shortLinkJourneyService.journeys(link.id);
    expect(page.total).toBe(2);
    const named = page.rows.find((row) => row.click_id === 'c-1');
    const anonymous = page.rows.find((row) => row.click_id === 'c-2');
    expect(named?.user_name).toBe(`Asha K${seq}`);
    expect(named?.user_email).toContain('@x.com');
    expect(named?.furthest_step).toBe('SIGNED_UP');
    expect(anonymous?.user_id).toBeNull();
    expect(anonymous?.furthest_step).toBe('CLICKED');
  });

  // Phone signups have no email, and last_name is optional on the model.
  it('handles a one-word name and an account with no email', async () => {
    const link = await newLink();
    const phoneOnly = await UserModel.create({
      auth: {},
      profile: { first_name: 'Meera' },
      metadata: { status: 'ACTIVE', role_keys: ['USER'] },
    });
    await click(link.id, link.code, 'c-1');
    await shortLinkJourneyService.recordStep('c-1', 'SIGNED_UP', String(phoneOnly._id));

    const page = await shortLinkJourneyService.journeys(link.id);
    expect(page.rows[0].user_name).toBe('Meera');
    expect(page.rows[0].user_email).toBeNull();
    expect(page.rows[0].user_id).toBe(String(phoneOnly._id));
  });

  it('reports a click it could not place without inventing a location', async () => {
    const link = await newLink();
    await shortLinkClickService.record({
      clickId: 'c-nowhere',
      code: link.code,
      shortLinkId: link.id,
      referrer: null,
      userAgent: ANDROID,
      forwardedFor: null,
      remoteAddress: null,
    });

    const page = await shortLinkJourneyService.journeys(link.id);
    expect(page.rows[0]).toMatchObject({ country: null, city: null, platform: 'Direct' });
  });

  it('returns the full step trail of one click', async () => {
    const link = await newLink();
    await click(link.id, link.code, 'c-1');
    await shortLinkJourneyService.recordStep('c-1', 'LANDED');
    await shortLinkJourneyService.recordStep('c-1', 'VIEWED_POD');

    const journey = await shortLinkJourneyService.journey('c-1');
    expect(journey.steps.map((entry) => entry.step)).toEqual(['LANDED', 'VIEWED_POD']);
    await expect(shortLinkJourneyService.journey('nope')).rejects.toThrow(/not found/i);
  });
});
