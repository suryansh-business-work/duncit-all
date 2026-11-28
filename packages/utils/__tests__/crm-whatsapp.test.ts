import { describe, expect, it } from 'vitest';
import {
  WA_MAX_ERROR_RESTARTS,
  waConnectionStatusView,
  waExtractionPercent,
  waExtractionView,
  waFirstStatusAction,
  waInitialConnectStep,
  waShouldRetryError,
} from '../src/crm-whatsapp';

/** The WhatsApp Lead Generator's shared rules: status words, progress and the link step's decisions. */

describe('waConnectionStatusView', () => {
  it('words and colours each session status, reading anything unknown as Disconnected', () => {
    expect(waConnectionStatusView('CONNECTED')).toEqual({ labelKey: 'crm.tools.statusConnected', tone: 'success' });
    expect(waConnectionStatusView('CONNECTING')).toEqual({ labelKey: 'crm.tools.statusConnecting', tone: 'warning' });
    expect(waConnectionStatusView('ERROR')).toEqual({ labelKey: 'crm.tools.statusError', tone: 'error' });
    expect(waConnectionStatusView('DISCONNECTED')).toEqual({ labelKey: 'crm.tools.statusDisconnected', tone: 'default' });
    expect(waConnectionStatusView('PAIRING')).toEqual({ labelKey: 'crm.tools.statusDisconnected', tone: 'default' });
  });
});

describe('waExtractionView', () => {
  it('titles and colours each job status, reading anything unknown as Cancelled', () => {
    expect(waExtractionView('RUNNING')).toEqual({ labelKey: 'crm.tools.extractionRunning', tone: 'warning' });
    expect(waExtractionView('DONE')).toEqual({ labelKey: 'crm.tools.extractionDone', tone: 'success' });
    expect(waExtractionView('FAILED')).toEqual({ labelKey: 'crm.tools.extractionFailed', tone: 'error' });
    expect(waExtractionView('CANCELLED')).toEqual({ labelKey: 'crm.tools.extractionCancelled', tone: 'default' });
    expect(waExtractionView('QUEUED')).toEqual({ labelKey: 'crm.tools.extractionCancelled', tone: 'default' });
  });
});

describe('waExtractionPercent', () => {
  it('rounds processed over total, and is 0 until the total is known', () => {
    expect(waExtractionPercent({ total: 200, processed: 50 })).toBe(25);
    expect(waExtractionPercent({ total: 3, processed: 2 })).toBe(67);
    expect(waExtractionPercent({ total: 0, processed: 0 })).toBe(0);
  });
});

describe('waInitialConnectStep', () => {
  it('opens a booting or previously linked session on Link WhatsApp, a first connect on the gateway', () => {
    expect(waInitialConnectStep({ status: 'CONNECTING' })).toBe('link');
    expect(waInitialConnectStep({ status: 'DISCONNECTED', connected_at: '2026-11-20T10:00:00.000Z' })).toBe('link');
    expect(waInitialConnectStep({ status: 'DISCONNECTED', connected_at: null })).toBe('gateway');
    expect(waInitialConnectStep({ status: 'DISCONNECTED' })).toBe('gateway');
  });

  it('opens a failed session on Link WhatsApp, where its reason and Restart connection are, linked before or not', () => {
    expect(waInitialConnectStep({ status: 'ERROR' })).toBe('link');
    expect(waInitialConnectStep({ status: 'ERROR', connected_at: null })).toBe('link');
    expect(waInitialConnectStep({ status: 'ERROR', connected_at: '2026-11-20T10:00:00.000Z' })).toBe('link');
  });
});

describe('waFirstStatusAction', () => {
  it('arms a booting session whether or not it was linked before', () => {
    expect(waFirstStatusAction('CONNECTING', false)).toBe('arm');
    expect(waFirstStatusAction('CONNECTING', true)).toBe('arm');
  });

  it('starts nothing for a session never linked', () => {
    expect(waFirstStatusAction('DISCONNECTED', false)).toBe('none');
    expect(waFirstStatusAction('ERROR', false)).toBe('none');
  });

  it('resumes a dropped linked session and restarts a failed one, leaving a live one alone', () => {
    expect(waFirstStatusAction('DISCONNECTED', true)).toBe('resume');
    expect(waFirstStatusAction('ERROR', true)).toBe('restart');
    expect(waFirstStatusAction('CONNECTED', true)).toBe('none');
  });
});

describe('waShouldRetryError', () => {
  it('retries a failed start somebody began, up to the cap', () => {
    expect(waShouldRetryError('ERROR', true, 0)).toBe(true);
    expect(waShouldRetryError('ERROR', true, WA_MAX_ERROR_RESTARTS - 1)).toBe(true);
    expect(waShouldRetryError('ERROR', true, WA_MAX_ERROR_RESTARTS)).toBe(false);
  });

  it('never retries a session nobody started, or one that has not failed', () => {
    expect(waShouldRetryError('ERROR', false, 0)).toBe(false);
    expect(waShouldRetryError('CONNECTING', true, 0)).toBe(false);
  });
});
