import { logs } from '@observability/log';
import { defaultCampaign, isAisensyConfigured, sendCampaign } from '../../aisensy.gateway';
import { aisensyService, toButtons, toMedia } from '../../aisensy.service';
import { aisensyResolvers } from '../../aisensy.resolver';
import { makeContext } from '@test/harness';

jest.mock('../../aisensy.gateway', () => ({
  INVALID_NUMBER_REASON: 'Not a valid WhatsApp mobile number',
  defaultCampaign: jest.fn(),
  isAisensyConfigured: jest.fn(),
  sendCampaign: jest.fn(),
}));
jest.mock('@observability/log', () => ({ logs: { server: { info: jest.fn() } } }));

const send = sendCampaign as jest.Mock;
const valid = (over: Record<string, unknown> = {}) => ({
  campaign_name: ' welcome ', destination: '+919876543210', user_name: ' Asha ', template_params: [' Asha ', 'pod'], ...over,
});

beforeEach(() => {
  jest.resetAllMocks();
  (defaultCampaign as jest.Mock).mockResolvedValue('fallback_campaign');
  send.mockResolvedValue('mid-1');
});

describe('toMedia / toButtons', () => {
  it('keeps media with a url and drops a blank or missing one', () => {
    expect(toMedia({ url: ' https://i/x.png ', filename: ' x.png ' })).toEqual({ url: 'https://i/x.png', filename: 'x.png' });
    expect(toMedia({ url: 'https://i/x.png' })).toEqual({ url: 'https://i/x.png', filename: '' });
    expect(toMedia({ url: '  ' })).toBeUndefined();
    expect(toMedia(null)).toBeUndefined();
    expect(toMedia(undefined)).toBeUndefined();
  });

  it('keeps buttons that carry a value, defaulting a missing or invalid index to zero', () => {
    expect(toButtons([{ index: 2, value: ' abc ' }, { value: 'def' }, { index: 'x', value: 'ghi' }, { index: 1, value: '  ' }, null])).toEqual([
      { index: 2, value: 'abc' }, { index: 0, value: 'def' }, { index: 0, value: 'ghi' },
    ]);
    expect(toButtons(undefined)).toEqual([]);
    expect(toButtons('not a list')).toEqual([]);
  });
});

describe('status', () => {
  it('reports whether a key is set and the default campaign', async () => {
    (isAisensyConfigured as jest.Mock).mockResolvedValue(true);
    await expect(aisensyService.status()).resolves.toEqual({ configured: true, default_campaign: 'fallback_campaign' });
  });
});

describe('send', () => {
  it('trims the input, strips a leading plus and submits through the gateway', async () => {
    const out = await aisensyService.send(valid({ media: { url: 'https://i/x.png' }, buttons: [{ index: 0, value: 'abc' }] }));
    expect(out).toEqual({ ok: true, submitted_message_id: 'mid-1', message: 'Campaign "welcome" submitted' });
    expect(send).toHaveBeenCalledWith({
      campaign_name: 'welcome', destination: '919876543210', user_name: 'Asha', template_params: ['Asha', 'pod'],
      media: { url: 'https://i/x.png', filename: '' }, buttons: [{ index: 0, value: 'abc' }],
    });
    expect(logs.server.info).toHaveBeenCalledWith('aisensy', 'send', { campaign_name: 'welcome', submitted_message_id: 'mid-1' });
  });

  it('falls back to the default campaign when none is named, and says so when there is none at all', async () => {
    await aisensyService.send(valid({ campaign_name: '  ' }));
    expect(send).toHaveBeenLastCalledWith(expect.objectContaining({ campaign_name: 'fallback_campaign' }));
    (defaultCampaign as jest.Mock).mockResolvedValue('');
    await expect(aisensyService.send(valid({ campaign_name: '' }))).rejects.toMatchObject({ message: 'Campaign name is required', extensions: { code: 'BAD_USER_INPUT' } });
  });

  it('refuses a number WhatsApp cannot live on, with the shape to enter', async () => {
    await expect(aisensyService.send(valid({ destination: '12345' }))).rejects.toThrow('Not a valid WhatsApp mobile number — enter the country code + number');
    await expect(aisensyService.send(valid({ destination: undefined }))).rejects.toThrow('Not a valid WhatsApp mobile number');
  });

  it('refuses a missing user name and an unfilled template parameter', async () => {
    await expect(aisensyService.send(valid({ user_name: ' ' }))).rejects.toThrow('User name is required');
    await expect(aisensyService.send(valid({ template_params: ['ok', '  '] }))).rejects.toThrow('Fill every template parameter before sending');
    expect(send).not.toHaveBeenCalled();
  });

  it('sends a template with no parameters when none are given', async () => {
    await aisensyService.send(valid({ template_params: undefined }));
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ template_params: [] }));
  });
});

describe('resolvers', () => {
  const tech = makeContext({ id: 't', roles: ['TECH_MANAGER'] });
  const outsider = makeContext({ id: 'o', roles: ['USER'] });

  it('are for the Tech portal only', async () => {
    (isAisensyConfigured as jest.Mock).mockResolvedValue(false);
    await expect(aisensyResolvers.Query.aisensyStatus({}, {}, tech)).resolves.toMatchObject({ configured: false });
    await expect(aisensyResolvers.Mutation.sendAisensyCampaign({}, { input: valid() }, tech)).resolves.toMatchObject({ ok: true });
    expect(() => aisensyResolvers.Query.aisensyStatus({}, {}, outsider)).toThrow();
    expect(() => aisensyResolvers.Mutation.sendAisensyCampaign({}, { input: valid() }, outsider)).toThrow();
  });
});
