import { Platform } from 'react-native';

import { submitAppFeedback } from '@/hooks/useFeedback';
import { graphqlRequest } from '@/services/graphql.client';
import { SubmitAppFeedbackDocument } from '@/graphql/feedback';
import { buildAppFeedbackInput } from '@duncit/slack';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;

describe('submitAppFeedback', () => {
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
        }),
      },
      { auth: true },
    );
    expect(returned).toBe(result);
  });
});
