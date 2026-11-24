import { CALL_TYPE, type RecordingFile } from 'crm-telephony';

import { planCall, type PlannedCall } from '../callPlan';
import { audioContentType, MAX_RECORDING_BYTES, pickRecording, recordingScore, recordingWindow } from '../recordingMatch';
import { formatCallDuration } from '../duration';

/**
 * Picking the phone recorder's file for a call. Attaching the wrong file
 * would put one customer's conversation on another's lead, so a file is only
 * chosen on real evidence.
 */

const START = Date.UTC(2026, 10, 24, 10, 30);

const call = (over: Partial<PlannedCall['entry']> = {}): PlannedCall =>
  planCall(
    { id: '1', number: '+91 98110 00001', type: CALL_TYPE.OUTGOING, date: START, durationSeconds: 120, cachedName: '', ...over },
    { entityType: 'HOST_LEAD', leadId: 'h1', leadName: 'Run Club', contactName: 'Rohit Sharma', others: 0 },
    'install',
  ) as PlannedCall;

const file = (over: Partial<RecordingFile> = {}): RecordingFile => ({
  uri: 'content://media/1',
  name: 'audio.m4a',
  sizeBytes: 900_000,
  addedAtMs: START + 125_000,
  durationMs: 0,
  mimeType: 'audio/mp4',
  relativePath: 'Music/',
  ...over,
});

describe('recordingWindow', () => {
  it('runs from just before the call to a few minutes after it ended', () => {
    expect(recordingWindow(call())).toEqual({ fromMs: START - 5000, toMs: START + 120_000 + 180_000 });
  });
});

describe('recordingScore', () => {
  it('counts the number in the file name as the strongest sign', () => {
    expect(recordingScore(file({ name: '+919811000001_20261124.amr' }), call())).toBe(3);
  });

  it('counts the contact name, the Call recordings folder and a matching length', () => {
    const named = file({ name: 'Rohit Sharma 2026-11-24.m4a', relativePath: 'Recordings/Call/', durationMs: 118_000 });
    expect(recordingScore(named, call())).toBe(2 + 2 + 1);
  });

  it('gives an unrelated voice note nothing', () => {
    expect(recordingScore(file({ name: 'Voice 012.m4a' }), call())).toBe(0);
  });
});

describe('pickRecording', () => {
  it('picks the best-evidenced file in the window', () => {
    const weak = file({ uri: 'content://weak', relativePath: 'Recordings/Call/' });
    const strong = file({ uri: 'content://strong', name: '9811000001.m4a', relativePath: 'Recordings/Call/' });
    expect(pickRecording(call(), [weak, strong])?.uri).toBe('content://strong');
  });

  it('never attaches a file with no sign it belongs to this call, nor one matching only by length', () => {
    expect(pickRecording(call(), [file()])).toBeNull();
    expect(pickRecording(call(), [file({ durationMs: 120_000 })])).toBeNull();
  });

  it('skips files outside the window, empty files and files over the transcription limit', () => {
    const named = { name: '9811000001.m4a' };
    expect(pickRecording(call(), [file({ ...named, addedAtMs: START - 60_000 })])).toBeNull();
    expect(pickRecording(call(), [file({ ...named, addedAtMs: START + 10 * 60_000 })])).toBeNull();
    expect(pickRecording(call(), [file({ ...named, sizeBytes: 0 })])).toBeNull();
    expect(pickRecording(call(), [file({ ...named, sizeBytes: MAX_RECORDING_BYTES + 1 })])).toBeNull();
  });

  it('looks for nothing on a call that never connected', () => {
    expect(pickRecording(call({ durationSeconds: 0 }), [file({ name: '9811000001.m4a' })])).toBeNull();
  });
});

describe('audioContentType', () => {
  it('keeps the media store type when it is audio', () => {
    expect(audioContentType({ mimeType: 'audio/amr', name: 'x.bin' })).toBe('audio/amr');
  });

  it.each([
    ['call.m4a', 'audio/mp4'],
    ['call.MP3', 'audio/mpeg'],
    ['call.amr', 'audio/amr'],
    ['call.3gp', 'audio/3gpp'],
    ['call.opus', 'audio/ogg'],
    ['call', 'audio/mp4'],
  ])('reads %s as %s when the store said nothing useful', (name, type) => {
    expect(audioContentType({ mimeType: 'application/octet-stream', name })).toBe(type);
  });
});

describe('formatCallDuration', () => {
  it.each([
    [0, '0:00'],
    [9, '0:09'],
    [134, '2:14'],
    [3725, '1:02:05'],
    [-4, '0:00'],
  ])('shows %d seconds as %s', (seconds, text) => {
    expect(formatCallDuration(seconds)).toBe(text);
  });
});
