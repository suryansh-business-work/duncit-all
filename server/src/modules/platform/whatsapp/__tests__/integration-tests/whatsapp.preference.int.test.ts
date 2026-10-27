/**
 * A person's WhatsApp switches against a real database: what the sheet shows
 * with and without a number, what one toggle and the all-switch write, what a
 * STOP / START reply does to marketing alone, and the refusals.
 */
import { Types } from 'mongoose';
import { logs } from '@observability/log';
import { UserModel } from '@modules/access/user/user.model';
import { WA_OPTIONAL_CATEGORIES, WA_REQUIRED_CATEGORIES, WA_EVENTS } from '../../whatsapp.events';
import { WaPreferenceEventModel, WaPreferenceModel } from '../../waPreference.model';
import { whatsappPreferenceService as service } from '../../whatsapp.preference.service';

const DESTINATION = '919876543210';
const inUse = (list: readonly string[]) => list.filter((c) => WA_EVENTS.some((e) => e.category === c));
const OPTIONAL = inUse(WA_OPTIONAL_CATEGORIES);
const REQUIRED = inUse(WA_REQUIRED_CATEGORIES);

const member = (over: Record<string, unknown> = {}) =>
  UserModel.create({
    auth: { email: `m${new Types.ObjectId()}@duncit.com`, phone: { extension: '+91', number: '9876543210' } },
    profile: { first_name: 'Asha' },
    ...over,
  });

afterEach(() => jest.restoreAllMocks());

describe('the sheet', () => {
  it('shows every in-use category, the required ones locked on, for a member with a number', async () => {
    const asha = await member();
    const sheet = await service.mine(String(asha._id));
    expect(sheet).toMatchObject({ destination: DESTINATION, reachable: true, updated_at: null });
    expect(sheet.categories.filter((c) => c.required).map((c) => c.category)).toEqual(REQUIRED);
    expect(sheet.categories.filter((c) => !c.required).map((c) => [c.category, c.enabled])).toEqual(OPTIONAL.map((c) => [c, true]));
  });

  it('still shows the switches, unreachable, for a member with no number or who does not exist', async () => {
    const nameless = await member({ auth: { email: 'nonumber@duncit.com' } });
    for (const id of [String(nameless._id), String(new Types.ObjectId())]) {
      const sheet = await service.mine(id);
      expect(sheet).toMatchObject({ destination: '', reachable: false, updated_at: null });
      expect(sheet.categories.every((c) => c.required || c.enabled)).toBe(true);
    }
  });
});

describe('switching one category', () => {
  it('opts out and back in, recording both on the audit trail and tying the number to the account', async () => {
    const asha = await member();
    const off = await service.setMine(String(asha._id), 'marketing', false);
    expect(off.categories.find((c) => c.category === 'marketing')?.enabled).toBe(false);
    expect(off.updated_at).toEqual(expect.any(String));
    const row = await WaPreferenceModel.findOne({ destination: DESTINATION }).lean();
    expect(row?.opted_out).toEqual(['marketing']);
    expect(String(row?.user_id)).toBe(String(asha._id));
    const on = await service.setMine(String(asha._id), 'marketing', true);
    expect(on.categories.find((c) => c.category === 'marketing')?.enabled).toBe(true);
    const events = await WaPreferenceEventModel.find({ destination: DESTINATION }).sort({ created_at: 1 }).lean();
    expect(events.map((e) => [e.category, e.enabled])).toEqual([['marketing', false], ['marketing', true]]);
  });

  it('switching a category on for a number that never opted out writes a clean row', async () => {
    const asha = await member();
    const sheet = await service.setMine(String(asha._id), 'marketing', true);
    expect(sheet.categories.filter((c) => !c.required).every((c) => c.enabled)).toBe(true);
    expect((await WaPreferenceModel.findOne({ destination: DESTINATION }).lean())?.opted_out ?? []).toEqual([]);
  });

  it('refuses a category that cannot be switched off, one that does not exist and a member with no number', async () => {
    const asha = await member();
    await expect(service.setMine(String(asha._id), REQUIRED[0], false)).rejects.toMatchObject({ message: 'This kind of message cannot be switched off', extensions: { code: 'BAD_USER_INPUT' } });
    await expect(service.setMine(String(asha._id), 'nonsense', false)).rejects.toMatchObject({ message: 'Unknown message type' });
    const nameless = await member({ auth: { email: 'nonumber@duncit.com' } });
    await expect(service.setMine(String(nameless._id), 'marketing', false)).rejects.toMatchObject({ message: 'Add your WhatsApp number first' });
    expect(await WaPreferenceModel.countDocuments()).toBe(0);
  });

  it('keeps the switch even when the audit trail cannot be written, and logs why', async () => {
    const asha = await member();
    jest.spyOn(WaPreferenceEventModel, 'insertMany').mockRejectedValue(new Error('events down'));
    const warn = jest.spyOn(logs.server, 'warn').mockImplementation(() => undefined as never);
    const sheet = await service.setMine(String(asha._id), 'marketing', false);
    expect(sheet.categories.find((c) => c.category === 'marketing')?.enabled).toBe(false);
    expect(warn).toHaveBeenCalledWith('whatsapp', 'preferenceEvent', expect.objectContaining({ destination: DESTINATION }));
  });
});

describe('switching everything', () => {
  it('opts out of every optional category, then back in', async () => {
    const asha = await member();
    const off = await service.setAllMine(String(asha._id), false);
    expect(off.categories.filter((c) => !c.required).every((c) => !c.enabled)).toBe(true);
    const on = await service.setAllMine(String(asha._id), true);
    expect(on.categories.filter((c) => !c.required).every((c) => c.enabled)).toBe(true);
  });

  it('refuses a member with no number', async () => {
    const nameless = await member({ auth: { email: 'nonumber@duncit.com' } });
    await expect(service.setAllMine(String(nameless._id), false)).rejects.toMatchObject({ message: 'Add your WhatsApp number first' });
  });
});

describe('reply keywords', () => {
  const marketing = async () => (await WaPreferenceModel.findOne({ destination: DESTINATION }).lean())?.opted_out ?? [];

  it('treats STOP, UNSUBSCRIBE and STOP ALL in any case as an opt-out of marketing only', async () => {
    for (const text of ['STOP', ' unsubscribe ', 'Stop All']) {
      await WaPreferenceModel.deleteMany({});
      await expect(service.applyReplyKeyword(DESTINATION, text)).resolves.toBe(true);
      expect(await marketing()).toEqual(['marketing']);
    }
  });

  it('treats START, SUBSCRIBE and UNSTOP as opting back in, without unlinking an account', async () => {
    const asha = await member();
    await service.setMine(String(asha._id), 'marketing', false);
    await expect(service.applyReplyKeyword(DESTINATION, 'start')).resolves.toBe(true);
    expect(await marketing()).toEqual([]);
    expect(String((await WaPreferenceModel.findOne({ destination: DESTINATION }).lean())?.user_id)).toBe(String(asha._id));
    await expect(service.applyReplyKeyword(DESTINATION, 'Subscribe')).resolves.toBe(true);
    await expect(service.applyReplyKeyword(DESTINATION, 'unstop')).resolves.toBe(true);
  });

  it('leaves a sentence that merely contains the word, an unrelated message and a number-less caller alone', async () => {
    await expect(service.applyReplyKeyword(DESTINATION, 'please stop sending')).resolves.toBe(false);
    await expect(service.applyReplyKeyword(DESTINATION, 'hello')).resolves.toBe(false);
    await expect(service.applyReplyKeyword('', 'STOP')).resolves.toBe(false);
    expect(await WaPreferenceModel.countDocuments()).toBe(0);
  });
});
