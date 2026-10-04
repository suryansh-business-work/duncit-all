import { Platform } from 'react-native';

import { submitAppFeedback } from '@/hooks/useFeedback';
import { graphqlRequest } from '@/services/graphql.client';
import { SubmitAppFeedbackDocument } from '@/graphql/feedback';
import { appVersion } from '@/utils/app-version';
import { buildAppFeedbackInput } from '@duncit/slack';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;

const deviceOs = `${Platform.OS} ${String(Platform.Version ?? '')}`.trim();
const deviceModel = String((Platform.constants as { Model?: string } | undefined)?.Model ?? '');

describe('submitAppFeedback', () => {
  beforeEach(() => mockRequest.mockReset());

  it('posts the composed feedback input with auth and returns the result', async () => {
    const result = { submitAppFeedback: { ok: true, channel: 'C_FB', ts: '9' } };
    mockRequest.mockResolvedValue(result);

    const returned = await submitAppFeedback('Bug', 'the app crashes on launch');

    expect(mockRequest).toHaveBeenCalledWith(
      SubmitAppFeedbackDocument,
      {
        input: buildAppFeedbackInput({
          category: 'Bug',
          message: 'the app crashes on launch',
          platform: Platform.OS,
          media_urls: [],
          app_version: appVersion(),
          device_os: deviceOs,
          device_model: deviceModel,
          source_screen: 'Report a Problem',
        }),
      },
      { auth: true },
    );
    const sent = mockRequest.mock.calls[0][1].input;
    // Defaults: no media and the Report a Problem screen; the device context is stamped.
    expect(sent.media_urls).toEqual([]);
    expect(sent.source_screen).toBe('Report a Problem');
    expect(sent.app_version).toBe(appVersion());
    expect(sent.device_os.startsWith(Platform.OS)).toBe(true);
    expect(returned).toBe(result);
  });

  it('forwards the attached media and the screen the report came from', async () => {
    mockRequest.mockResolvedValue({ submitAppFeedback: { ok: true, channel: 'C', ts: '1' } });

    await submitAppFeedback('Idea', 'add dark mode', ['https://cdn/a.png'], 'Settings');

    const sent = mockRequest.mock.calls[0][1].input;
    expect(sent.category).toBe('Idea');
    expect(sent.message).toBe('add dark mode');
    expect(sent.media_urls).toEqual(['https://cdn/a.png']);
    expect(sent.source_screen).toBe('Settings');
  });

  it('propagates a failed request to the caller', async () => {
    mockRequest.mockRejectedValue(new Error('network down'));
    await expect(submitAppFeedback('Bug', 'x')).rejects.toThrow('network down');
  });
});
