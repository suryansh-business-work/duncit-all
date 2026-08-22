import {
  redact,
  renderTemplateBody,
  templateParamCount,
  templateParamError,
  templateSegments,
} from '@duncit/communication';
import { defineDemo, defineDemos } from '../types';

interface TemplateMock {
  /** An approved WhatsApp template body, placeholders and all. */
  body: string;
  params: string[];
}

export default defineDemos('communication', [
  defineDemo<TemplateMock>({
    id: 'wa-template',
    title: 'A WhatsApp template and the params it demands',
    note:
      'Remove a param: templateParamError names the mismatch before the send, which is the difference between a caught mistake and a rejected message with a Meta error code.',
    mock: {
      body: 'Hi {{1}}, your pod {{2}} at {{3}} is confirmed. See you there!',
      params: ['Meera', 'DUN-POD-4821', 'Play Arena, HSR Layout'],
    },
    compute: (mock) => ({
      'Placeholders the body uses': templateParamCount(mock.body),
      'Params supplied': mock.params.length,
      'templateParamError(...)':
        templateParamError(mock.params, templateParamCount(mock.body)) ?? 'none — this can send',
      'Rendered message': renderTemplateBody(mock.body, mock.params),
      'Segments': templateSegments(mock.body),
    }),
  }),

  defineDemo<{ request: Record<string, unknown> }>({
    id: 'redact',
    title: 'Nothing secret reaches a log line',
    note:
      'Every provider request goes through this before it is logged. Add another key called token or api_key and watch it disappear too.',
    mock: {
      request: {
        url: 'https://backend.aisensy.com/campaign/t1/api/v2',
        apiKey: 'sk_live_4f19c0c2b1',
        destination: '919845012345',
        campaignName: 'pod-confirmed',
        headers: { authorization: 'Bearer eyJhbGciOi', 'content-type': 'application/json' },
      },
    },
    compute: (mock) => ({
      'What the log actually records': redact(mock.request),
    }),
  }),
]);
