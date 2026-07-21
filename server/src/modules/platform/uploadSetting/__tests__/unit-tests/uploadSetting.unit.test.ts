jest.mock('@config/runtimeEnv', () => ({
  getRuntimeEnvValue: jest.fn(async () => ''),
}));

import { getRuntimeEnvValue } from '@config/runtimeEnv';
import { parseScanVerdict, reviewImageWithAi } from '../../uploadSetting.service';

const mockEnv = getRuntimeEnvValue as jest.Mock;

const makeLog = () =>
  ({
    url: 'https://ik.imagekit.io/x/a.jpg',
    folder: '/pods',
    risk: 'PENDING',
    summary: '',
    save: jest.fn(async () => undefined),
  }) as any;

describe('parseScanVerdict', () => {
  it('parses a strict verdict and clips the summary', () => {
    expect(parseScanVerdict('{"risk":"high","summary":"nudity"}')).toEqual({
      risk: 'HIGH',
      summary: 'nudity',
    });
  });

  it('returns null for unknown risks and non-JSON', () => {
    expect(parseScanVerdict('{"risk":"BANANA","summary":"x"}')).toBeNull();
    expect(parseScanVerdict('not json')).toBeNull();
  });
});

describe('reviewImageWithAi', () => {
  it('falls back to LOW when no API key is configured', async () => {
    const log = makeLog();
    await reviewImageWithAi(log);
    expect(log.risk).toBe('LOW');
    expect(log.summary).toContain('unavailable');
    expect(log.save).toHaveBeenCalled();
  });

  it('applies the AI verdict when the vision call succeeds', async () => {
    mockEnv.mockImplementation(async (key: string) => (key === 'OPENAI_API_KEY' ? 'sk-test' : ''));
    const fetchMock = jest.spyOn(global, 'fetch' as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '{"risk":"MEDIUM","summary":"borderline"}' } }],
      }),
    } as any);
    try {
      const log = makeLog();
      await reviewImageWithAi(log);
      expect(log.risk).toBe('MEDIUM');
      expect(log.summary).toBe('borderline');
      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      // Vision request: the uploaded image URL goes along as image_url content.
      expect(JSON.stringify(body.messages)).toContain('image_url');
    } finally {
      fetchMock.mockRestore();
      mockEnv.mockImplementation(async () => '');
    }
  });

  it('keeps the fallback verdict on HTTP failure and never throws on save errors', async () => {
    mockEnv.mockImplementation(async (key: string) => (key === 'OPENAI_API_KEY' ? 'sk-test' : ''));
    const fetchMock = jest
      .spyOn(global, 'fetch' as any)
      .mockResolvedValue({ ok: false, json: async () => ({}) } as any);
    try {
      const log = makeLog();
      await reviewImageWithAi(log);
      expect(log.risk).toBe('LOW');

      const exploding = makeLog();
      exploding.save = jest.fn(async () => {
        throw new Error('db down');
      });
      await expect(reviewImageWithAi(exploding)).resolves.toBeUndefined();
    } finally {
      fetchMock.mockRestore();
      mockEnv.mockImplementation(async () => '');
    }
  });
});
