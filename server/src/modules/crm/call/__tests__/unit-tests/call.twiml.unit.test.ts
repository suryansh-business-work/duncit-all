/**
 * The lead's side of a portal call. The recording notice is spoken only when
 * something is recorded or transcribed, before either starts, and every value
 * placed in the XML is escaped.
 */
import { buildPortalConferenceTwiml, conferenceName } from '../../call.twiml';

describe('conferenceName', () => {
  it('names the conference after the call log', () => {
    expect(conferenceName('abc123')).toBe('crm-abc123');
  });
});

describe('buildPortalConferenceTwiml', () => {
  const transcription = { callbackUrl: 'https://s.test/twilio/transcription?logId=1&userId=2', language: 'hi-IN' };

  it('speaks the notice, starts transcription on both tracks, then joins a recorded conference', () => {
    const xml = buildPortalConferenceTwiml({
      conference: 'crm-1',
      notice: 'This call may be recorded & transcribed.',
      transcription,
      recordingCallbackUrl: 'https://s.test/rec?a=1&b=2',
    });

    expect(xml).toBe(
      [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<Response>',
        '<Say>This call may be recorded &amp; transcribed.</Say>',
        '<Start><Transcription statusCallbackUrl="https://s.test/twilio/transcription?logId=1&amp;userId=2" statusCallbackMethod="POST" track="both_tracks" languageCode="hi-IN" partialResults="false"/></Start>',
        '<Dial>',
        '<Conference startConferenceOnEnter="false" endConferenceOnExit="true" beep="false" record="record-from-start" recordingStatusCallback="https://s.test/rec?a=1&amp;b=2" recordingStatusCallbackMethod="POST">crm-1</Conference>',
        '</Dial>',
        '</Response>',
      ].join('')
    );
  });

  it('speaks the notice for a recording alone', () => {
    const xml = buildPortalConferenceTwiml({ conference: 'crm-1', notice: 'Recorded.', recordingCallbackUrl: 'https://s.test/rec' });
    expect(xml).toContain('<Say>Recorded.</Say>');
    expect(xml).not.toContain('<Transcription');
  });

  it('says nothing and records nothing when neither is on', () => {
    const xml = buildPortalConferenceTwiml({ conference: 'crm-1', notice: 'Recorded.', transcription: null, recordingCallbackUrl: null });
    expect(xml).not.toContain('<Say>');
    expect(xml).not.toContain('record=');
    expect(xml).toContain('<Dial><Conference startConferenceOnEnter="false" endConferenceOnExit="true" beep="false">crm-1</Conference></Dial>');
  });

  it('transcribes without a spoken line when there is no notice', () => {
    const xml = buildPortalConferenceTwiml({ conference: 'crm-1', notice: null, transcription });
    expect(xml).not.toContain('<Say>');
    expect(xml).toContain('<Start><Transcription');
  });
});
