/**
 * Sarvam speech-to-text with timing: the multipart request, the three
 * parallel timestamp lists read back as cues, and every way the call can
 * refuse before or after the wire. `fetchTranscript` and `tts` are untouched
 * by this and keep their own behaviour.
 */
jest.mock('@config/runtimeEnv', () => ({ getRuntimeEnvValue: jest.fn() }));
jest.mock('@utils/outboundFetch', () => ({ outboundFetch: jest.fn() }));

import { getRuntimeEnvValue } from '@config/runtimeEnv';
import { outboundFetch } from '@utils/outboundFetch';
import { MAX_TRANSCRIBE_BYTES, cuesFromTimestamps, servamService } from '../../servam.service';

const env = getRuntimeEnvValue as unknown as jest.Mock;
const download = outboundFetch as unknown as jest.Mock;
const fetchMock = jest.fn();

const ENV: Record<string, string> = { SERVAM_AI_API_KEY: 'key-1', SERVAM_AI_BASE_URL: 'https://api.sarvam.test/' };
const BYTES = Buffer.from('RIFF....WAVE');
const ANSWER = {
  request_id: 'r1',
  transcript: 'Hello there friends',
  language_code: 'en-IN',
  timestamps: { words: ['Hello', 'there friends'], start_time_seconds: [0, 0.9], end_time_seconds: [0.9, 2.1] },
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

beforeEach(() => {
  env.mockImplementation(async (key: string) => ENV[key] ?? '');
  global.fetch = fetchMock as unknown as typeof fetch;
  fetchMock.mockResolvedValue(json(ANSWER));
});

describe('cuesFromTimestamps', () => {
  it('reads the three parallel lists as cues in whole milliseconds, in time order', () => {
    expect(cuesFromTimestamps({ words: ['b', ' a '], start_time_seconds: [1.0004, 0], end_time_seconds: [2, 0.5] })).toEqual([
      { start_ms: 0, end_ms: 500, text: 'a' },
      { start_ms: 1000, end_ms: 2000, text: 'b' },
    ]);
  });

  it('drops a row whose words or times cannot be used, and keeps the rest', () => {
    const cues = cuesFromTimestamps({
      words: ['ok', '', 7, 'backwards', 'no end', 'negative', 'string times'],
      start_time_seconds: [0, 1, 2, 5, 6, -1, '1.5'],
      end_time_seconds: [1, 2, 3, 4, undefined, 1, '2'],
    });
    expect(cues).toEqual([
      { start_ms: 0, end_ms: 1000, text: 'ok' },
      { start_ms: 1500, end_ms: 2000, text: 'string times' },
    ]);
  });

  it.each([null, undefined, {}, { words: 'Hello' }, { words: ['a'] }])('is nothing for %p', (raw) => {
    expect(cuesFromTimestamps(raw)).toEqual([]);
  });
});

describe('servamService.transcribe', () => {
  it('posts the bytes as multipart with the model, language and timestamps asked for, and reads the cues back', async () => {
    const result = await servamService.transcribe({ bytes: BYTES, fileName: 'voice.wav', contentType: 'audio/wav', language: 'en-IN', withTimestamps: true });

    expect(result).toEqual({
      ok: true,
      message: 'Transcript ready',
      transcript: 'Hello there friends',
      language_code: 'en-IN',
      cues: [
        { start_ms: 0, end_ms: 900, text: 'Hello' },
        { start_ms: 900, end_ms: 2100, text: 'there friends' },
      ],
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.sarvam.test/speech-to-text');
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({ Authorization: 'Bearer key-1', 'api-subscription-key': 'key-1' });
    const form = init.body as FormData;
    expect(form.get('model')).toBe('saaras:v4');
    expect(form.get('language_code')).toBe('en-IN');
    expect(form.get('with_timestamps')).toBe('true');
    const file = form.get('file') as File;
    expect(file.name).toBe('voice.wav');
    expect(file.type).toBe('audio/wav');
    expect(Buffer.from(await file.arrayBuffer())).toEqual(BYTES);
    expect(download).not.toHaveBeenCalled();
  });

  it('lets Sarvam detect the language when none, or "auto", is given, and honours a model from the Tech portal', async () => {
    env.mockImplementation(async (key: string) => ({ ...ENV, SERVAM_AI_STT_MODEL: 'saaras:v3' })[key] ?? '');
    await servamService.transcribe({ bytes: BYTES });
    await servamService.transcribe({ bytes: BYTES, language: ' AUTO ', withTimestamps: false });
    const first = fetchMock.mock.calls[0][1].body as FormData;
    const second = fetchMock.mock.calls[1][1].body as FormData;
    expect(first.get('language_code')).toBe('unknown');
    expect(first.get('with_timestamps')).toBe('true');
    expect(first.get('model')).toBe('saaras:v3');
    expect((first.get('file') as File).name).toBe('audio.wav');
    expect(second.get('language_code')).toBe('unknown');
    expect(second.get('with_timestamps')).toBe('false');
  });

  it('fetches the file itself when given a trusted address, naming the type the store served', async () => {
    download.mockResolvedValue(new Response(BYTES, { status: 200, headers: { 'content-type': 'audio/mpeg', 'content-length': String(BYTES.length) } }));
    const result = await servamService.transcribe({ audioUrl: 'https://ik.imagekit.io/duncit/voice.mp3', fileName: 'voice.mp3' });
    expect(result.ok).toBe(true);
    expect(download).toHaveBeenCalledWith('The media store', 'https://ik.imagekit.io/duncit/voice.mp3');
    expect((fetchMock.mock.calls[0][1].body as FormData).get('file')).toMatchObject({ type: 'audio/mpeg', name: 'voice.mp3' });
  });

  it.each([
    ['nothing at all', {}, 'Nothing to transcribe.'],
    ['an address off the trusted hosts', { audioUrl: 'https://evil.example/voice.wav' }, 'Only a file from the media store'],
    ['a plain-http address', { audioUrl: 'http://ik.imagekit.io/duncit/voice.wav' }, 'Only a file from the media store'],
    ['bytes past the ceiling', { bytes: Buffer.alloc(MAX_TRANSCRIBE_BYTES + 1) }, 'too large'],
  ])('refuses %s before touching the wire', async (_name, input, message) => {
    const result = await servamService.transcribe(input);
    expect(result).toMatchObject({ ok: false, message: expect.stringContaining(message) });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(download).not.toHaveBeenCalled();
  });

  it('refuses a download the store would not send, one that declares itself too large, and one that turns out too large', async () => {
    const url = 'https://ik.imagekit.io/duncit/voice.wav';
    download.mockResolvedValueOnce(new Response('', { status: 404 }));
    await expect(servamService.transcribe({ audioUrl: url })).resolves.toMatchObject({ ok: false, message: expect.stringContaining('HTTP 404') });
    download.mockResolvedValueOnce(new Response(BYTES, { status: 200, headers: { 'content-length': String(MAX_TRANSCRIBE_BYTES + 1) } }));
    await expect(servamService.transcribe({ audioUrl: url })).resolves.toMatchObject({ ok: false, message: expect.stringContaining('too large') });
    download.mockResolvedValueOnce(new Response(Buffer.alloc(MAX_TRANSCRIBE_BYTES + 1), { status: 200 }));
    await expect(servamService.transcribe({ audioUrl: url })).resolves.toMatchObject({ ok: false, message: expect.stringContaining('too large') });
    download.mockRejectedValueOnce(new Error('The media store did not respond in time.'));
    await expect(servamService.transcribe({ audioUrl: url })).resolves.toEqual({ ok: false, message: 'The media store did not respond in time.' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('says when the key is missing, when Sarvam refuses, when it sends no words, and when the wire breaks', async () => {
    env.mockImplementation(async () => '');
    await expect(servamService.transcribe({ bytes: BYTES })).resolves.toMatchObject({ ok: false, message: expect.stringContaining('SERVAM_AI_API_KEY') });
    expect(fetchMock).not.toHaveBeenCalled();

    env.mockImplementation(async (key: string) => ENV[key] ?? '');
    fetchMock.mockResolvedValueOnce(new Response('{"error":{"message":"bad audio"}}', { status: 422 }));
    await expect(servamService.transcribe({ bytes: BYTES })).resolves.toEqual({ ok: false, message: 'Servam transcription failed (HTTP 422): {"error":{"message":"bad audio"}}' });
    fetchMock.mockResolvedValueOnce(json({ transcript: '   ' }));
    await expect(servamService.transcribe({ bytes: BYTES })).resolves.toEqual({ ok: false, message: 'Servam returned an empty transcript' });
    fetchMock.mockRejectedValueOnce(new Error('socket hang up'));
    await expect(servamService.transcribe({ bytes: BYTES })).resolves.toEqual({ ok: false, message: 'socket hang up' });
  });

  it('comes back with the words and no cues when Sarvam sent no timing, and with no language when it named none', async () => {
    fetchMock.mockResolvedValueOnce(json({ transcript: 'just words', language_code: null }));
    await expect(servamService.transcribe({ bytes: BYTES })).resolves.toEqual({ ok: true, message: 'Transcript ready', transcript: 'just words', cues: [], language_code: '' });
  });
});
