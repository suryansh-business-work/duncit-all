/**
 * Filing a problem report, and reading the localization the page renders in.
 *
 * `submitStatusReport` returns its errors instead of throwing them, and that is
 * the whole design: one of them is routine. A mistyped verification code is
 * answered by the captcha widget itself, not by the form's failure banner, so
 * the caller has to be able to tell the two apart — which it cannot do if the
 * transport threw.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchLocales, fetchTranslations, submitStatusReport } from './api';
import { SERVER_BASE } from './config/server';
import type { StatusReportInput } from './types';

const jsonResponse = (body: unknown, ok = true): Response =>
  ({ ok, status: ok ? 200 : 500, json: async () => body }) as unknown as Response;

const fetchMock = vi.fn();

const REPORT: StatusReportInput = {
  service_key: 'mweb',
  impact: 'LOGIN',
  name: 'Meera N',
  email: 'meera@duncit.com',
  page_url: 'https://mweb.duncit.com/login',
  message: 'Signing in loops back to the same screen.',
  images: [],
  captcha_token: 'tok-1',
  captcha_answer: '7',
};

/** The body the mutation was posted with. */
const postedBody = () => JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string);

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('submitStatusReport', () => {
  it('posts the report to the public graph and reports that it landed', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: { submitStatusReport: { ok: true, id: 'r1' } } }));
    const signal = new AbortController().signal;

    await expect(submitStatusReport(REPORT, signal)).resolves.toEqual({ ok: true, errors: [] });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe(`${SERVER_BASE}/graphql`);
    // Unauthenticated by design: the visitor this exists for may be the one who
    // cannot sign in anywhere. The identity headers name the SURFACE, not a
    // person — they are what rate limiting and the audit trail read.
    expect((init as RequestInit).headers).toEqual({
      'content-type': 'application/json',
      'x-duncit-surface': 'WEBSITE',
      'x-duncit-app': 'status-website',
    });
    expect((init as RequestInit).headers).not.toHaveProperty('authorization');
    expect((init as RequestInit).signal).toBe(signal);
    expect(postedBody().variables).toEqual({ input: REPORT });
  });

  it('hands the server’s errors back rather than throwing them', async () => {
    const errors = [{ message: 'wrong', extensions: { code: 'CAPTCHA_WRONG' } }];
    fetchMock.mockResolvedValue(jsonResponse({ data: { submitStatusReport: null }, errors }));

    await expect(submitStatusReport(REPORT)).resolves.toEqual({ ok: false, errors });
  });

  it('reads anything short of an explicit ok as not filed', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: {} }));
    await expect(submitStatusReport(REPORT)).resolves.toEqual({ ok: false, errors: [] });

    fetchMock.mockResolvedValue(jsonResponse({ data: { submitStatusReport: { ok: false } } }));
    await expect(submitStatusReport(REPORT)).resolves.toEqual({ ok: false, errors: [] });
  });

  it('reads a transport failure as not filed, with nothing to explain it', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, false));

    await expect(submitStatusReport(REPORT)).resolves.toEqual({ ok: false, errors: [] });
  });
});

describe('localization reads', () => {
  it('lists the active locales', async () => {
    const publicLocales = [
      { code: 'hi-IN', label: 'हिंदी', english_label: 'Hindi', is_rtl: false, is_default: false, sort_order: 1 },
    ];
    fetchMock.mockResolvedValue(jsonResponse({ data: { publicLocales } }));

    await expect(fetchLocales()).resolves.toEqual(publicLocales);
  });

  it('flattens the catalogue into the key/value map the translator reads', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        data: {
          publicTranslations: [
            { key: 'status.report.heading', value: 'समस्या बताएं' },
            { key: 'status.report.submit', value: 'भेजें' },
          ],
        },
      }),
    );

    await expect(fetchTranslations('hi-IN')).resolves.toEqual({
      'status.report.heading': 'समस्या बताएं',
      'status.report.submit': 'भेजें',
    });
    expect(postedBody().variables).toEqual({ locale: 'hi-IN' });
  });

  it('answers with nothing rather than throwing when the catalogue cannot be read', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, false));

    // A status page that went blank because its localization query failed
    // would be reporting on its own outage.
    await expect(fetchTranslations('hi-IN')).resolves.toEqual({});
    await expect(fetchLocales()).resolves.toEqual([]);
  });
});
