import { getRuntimeEnvValue } from '@config/runtimeEnv';
import { envEntryService } from '@modules/platform/envEntry/envEntry.service';
import { postJson } from '../../aisensy.transport';
import {
  DEFAULT_OTP_CAMPAIGN,
  campaignEndpoint,
  campaignErrorReason,
  campaignPayload,
  campaignSucceeded,
  defaultCampaign,
  isAisensyConfigured,
  isCampaignMissing,
  isMediaMissing,
  otpCampaign,
  sendCampaign,
  type CampaignMessage,
} from '../../aisensy.gateway';

jest.mock('@config/runtimeEnv', () => ({ getRuntimeEnvValue: jest.fn() }));
jest.mock('@modules/platform/envEntry/envEntry.service', () => ({ envEntryService: { resolveRuntime: jest.fn() } }));
jest.mock('../../aisensy.transport', () => ({ postJson: jest.fn() }));

const env: Record<string, string> = {};
const post = postJson as jest.Mock;
const message = (over: Partial<CampaignMessage> = {}): CampaignMessage => ({
  campaign_name: 'welcome', destination: '919876543210', user_name: 'Asha', template_params: ['Asha'], ...over,
});

beforeEach(() => {
  for (const key of Object.keys(env)) delete env[key];
  jest.resetAllMocks();
  (getRuntimeEnvValue as jest.Mock).mockImplementation(async (key: string) => env[key] ?? '');
});

describe('configuration', () => {
  it('knows whether a key is set and what campaign sends default to', async () => {
    await expect(isAisensyConfigured()).resolves.toBe(false);
    env.AISENSY_API_KEY = 'k';
    env.AISENSY_CAMPAIGN_NAME = 'fallback';
    await expect(isAisensyConfigured()).resolves.toBe(true);
    await expect(defaultCampaign()).resolves.toBe('fallback');
  });

  it('uses the shipped authentication campaign until one is configured', async () => {
    await expect(otpCampaign()).resolves.toBe(DEFAULT_OTP_CAMPAIGN);
    env.AISENSY_OTP_CAMPAIGN_NAME = 'otp_v2';
    await expect(otpCampaign()).resolves.toBe('otp_v2');
  });

  it('builds the campaign endpoint on the configured host, without trailing slashes, or on AiSensy’s own', () => {
    expect(campaignEndpoint('')).toBe('https://backend.aisensy.com/campaign/t1/api/v2');
    expect(campaignEndpoint('https://proxy.test///')).toBe('https://proxy.test/campaign/t1/api/v2');
  });
});

describe('reading the vendor’s answer', () => {
  it.each([
    [{ message: 'm', errorMessage: 'e', error: 'x' }, 'm'],
    [{ errorMessage: 'e', error: 'x' }, 'e'],
    [{ error: 'x' }, 'x'],
    [{}, 'HTTP 500'],
    [null, 'HTTP 500'],
  ])('reads the reason out of %j', (body, reason) => {
    expect(campaignErrorReason(body, 500)).toBe(reason);
  });

  it.each([[{ success: true }, true], [{ success: 'true' }, true], [{ success: 'false' }, false], [{ success: false }, false], [{}, false], [null, false]])(
    'reads success from %j as %s',
    (body, expected) => {
      expect(campaignSucceeded(body)).toBe(expected);
    },
  );

  it('recognises the missing-media rejection by its words, and not a neighbouring one', () => {
    expect(isMediaMissing(new Error('Media URL Missing'))).toBe(true);
    expect(isMediaMissing(new Error('media is required'))).toBe(true);
    expect(isMediaMissing(new Error('Media URL is not accessible'))).toBe(false);
    expect(isMediaMissing(new Error('Campaign missing'))).toBe(false);
    expect(isMediaMissing({ error: 'Media Missing' })).toBe(true);
    expect(isMediaMissing(undefined)).toBe(false);
    expect(isMediaMissing(null)).toBe(false);
  });

  it('recognises the missing-campaign rejection', () => {
    expect(isCampaignMissing(new Error('Campaign does not exist.'))).toBe(true);
    expect(isCampaignMissing(new Error('Campaign paused'))).toBe(false);
    expect(isCampaignMissing('something else')).toBe(false);
    expect(isCampaignMissing(undefined)).toBe(false);
  });
});

describe('campaignPayload', () => {
  it('carries the plain fields only when there is no media and no button value', () => {
    expect(campaignPayload(message({ buttons: [{ index: 0, value: '' }] }), 'k')).toEqual({
      apiKey: 'k', campaignName: 'welcome', destination: '919876543210', userName: 'Asha', templateParams: ['Asha'],
    });
    expect(campaignPayload(message({ media: { url: '', filename: 'a.png' } }), 'k')).not.toHaveProperty('media');
  });

  it('puts media in with its filename when it has one, and without when it does not', () => {
    expect(campaignPayload(message({ media: { url: 'https://i/x.png', filename: 'x.png' } }), 'k').media).toEqual({ url: 'https://i/x.png', filename: 'x.png' });
    expect(campaignPayload(message({ media: { url: 'https://i/x.png', filename: '' } }), 'k').media).toEqual({ url: 'https://i/x.png' });
  });

  it('sends each button value under buttons, with the index as a string', () => {
    expect(campaignPayload(message({ buttons: [{ index: 1, value: 'abc' }, { index: 2, value: '' }] }), 'k').buttons).toEqual([
      { type: 'button', sub_type: 'url', index: '1', parameters: [{ type: 'text', text: 'abc' }] },
    ]);
  });
});

describe('sendCampaign', () => {
  const configure = () => {
    env.AISENSY_API_KEY = 'secret-key';
  };

  it('refuses to send without a key', async () => {
    await expect(sendCampaign(message())).rejects.toMatchObject({ extensions: { code: 'BAD_REQUEST' }, message: expect.stringContaining('not configured') });
    expect(post).not.toHaveBeenCalled();
  });

  it('posts to the endpoint on the configured host and returns the submitted id', async () => {
    configure();
    env.AISENSY_BASE_URL = 'https://proxy.test/';
    post.mockResolvedValue({ ok: true, status: 200, data: { success: 'true', submitted_message_id: 'mid-1' } });
    await expect(sendCampaign(message())).resolves.toBe('mid-1');
    expect(post).toHaveBeenCalledWith('https://proxy.test/campaign/t1/api/v2', expect.objectContaining({ apiKey: 'secret-key', campaignName: 'welcome' }));
  });

  it('returns an empty id when the vendor accepted the message without one', async () => {
    configure();
    post.mockResolvedValue({ ok: true, status: 200, data: { success: true } });
    await expect(sendCampaign(message())).resolves.toBe('');
  });

  it('fails with the vendor’s reason and status for an ordinary rejection', async () => {
    configure();
    post.mockResolvedValue({ ok: false, status: 400, data: { message: 'Campaign does not exist.' } });
    await expect(sendCampaign(message())).rejects.toMatchObject({
      message: 'AiSensy error: Campaign does not exist. (HTTP 400)', extensions: { code: 'BAD_GATEWAY' },
    });
  });

  it('treats an HTTP 200 whose success flag is not true as a rejection', async () => {
    configure();
    post.mockResolvedValue({ ok: true, status: 200, data: { success: 'false', message: 'nope' } });
    await expect(sendCampaign(message())).rejects.toThrow('AiSensy error: nope (HTTP 200)');
  });

  it('names the entry whose key was rejected, or says there is no active default', async () => {
    configure();
    post.mockResolvedValue({ ok: false, status: 401, data: { error: 'bad key' } });
    (envEntryService.resolveRuntime as jest.Mock).mockResolvedValueOnce({ name: 'Production' });
    await expect(sendCampaign(message())).rejects.toThrow('AiSensy rejected the API key from entry "Production" (HTTP 401: bad key)');
    (envEntryService.resolveRuntime as jest.Mock).mockResolvedValueOnce(null);
    post.mockResolvedValue({ ok: false, status: 403, data: null });
    await expect(sendCampaign(message())).rejects.toThrow('AiSensy rejected the API key from no active default entry (HTTP 403: HTTP 403)');
  });
});
