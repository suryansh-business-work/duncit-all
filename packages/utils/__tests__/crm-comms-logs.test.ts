import { describe, expect, it } from 'vitest';
import {
  CRM_CALL_SENTIMENT,
  CRM_COMMS_FILTERS,
  crmCallHasTranscript,
  crmCommsStatusTone,
  crmCommsTypeCounts,
  crmTranscriptLabelKey,
} from '../src/crm-comms-logs';

/** A lead's Communications: statuses, transcripts, sentiment and the filter counts. */

describe('crmCommsStatusTone', () => {
  it('reads a sent, failed, unanswered and queued status in their tones, and anything new as neutral', () => {
    expect(crmCommsStatusTone('DELIVERED')).toBe('success');
    expect(crmCommsStatusTone('FAILED')).toBe('error');
    expect(crmCommsStatusTone('NO_ANSWER')).toBe('warning');
    expect(crmCommsStatusTone('RINGING')).toBe('info');
    expect(crmCommsStatusTone('QUEUED')).toBe('default');
    expect(crmCommsStatusTone('BOUNCED')).toBe('default');
  });
});

describe('crmCommsTypeCounts', () => {
  it('counts emails and calls, ignoring anything else', () => {
    expect(crmCommsTypeCounts([{ type: 'EMAIL' }, { type: 'CALL' }, { type: 'CALL' }, { type: 'SMS' }])).toEqual({ EMAIL: 1, CALL: 2 });
    expect(CRM_COMMS_FILTERS).toEqual(['ALL', 'EMAIL', 'CALL']);
  });
});

describe('transcripts', () => {
  it('has a transcript when it is ready with text, or when live segments exist', () => {
    expect(crmCallHasTranscript({ transcript_status: 'READY', transcript: 'Hi' })).toBe(true);
    expect(crmCallHasTranscript({ transcript_status: 'READY', transcript: '' })).toBe(false);
    expect(crmCallHasTranscript({ transcript_status: 'NONE', transcript_segments: [{}] })).toBe(true);
    expect(crmCallHasTranscript({ transcript_status: 'NONE', transcript_segments: null })).toBe(false);
  });

  it('says where a call without a transcript stands', () => {
    expect(crmTranscriptLabelKey({ transcript_status: 'PENDING' })).toBe('crm.call.transcriptPending');
    expect(crmTranscriptLabelKey({ transcript_status: 'FAILED' })).toBe('crm.call.transcriptFailed');
    expect(crmTranscriptLabelKey({ transcript_status: 'NONE', recording_url: 'https://r' })).toBe('crm.call.transcriptNotRequested');
    expect(crmTranscriptLabelKey({ transcript_status: 'NONE', recording_url: null })).toBe('crm.call.noRecordingYet');
  });

  it('labels each sentiment', () => {
    expect(CRM_CALL_SENTIMENT.MIXED).toEqual({ labelKey: 'crm.call.sentimentMIXED', tone: 'warning' });
  });
});
