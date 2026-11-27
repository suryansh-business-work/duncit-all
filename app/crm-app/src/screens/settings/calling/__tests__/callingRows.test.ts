import type { CallingDiagnostics } from 'crm-telephony';

import { callingRows } from '../callingRows';

/** What Settings › Calling & recording reports for a phone, and the fix it offers for each gap. */

const healthy: CallingDiagnostics = {
  manufacturer: 'samsung',
  model: 'SM-S921B',
  sdk: 35,
  phoneState: true,
  callLog: true,
  overlay: true,
  notifications: true,
  defaultDialer: 'Phone',
  dialerIsDuncit: false,
  redirectionAvailable: true,
  redirectionHeld: true,
  batteryUnrestricted: true,
  backgroundRestricted: false,
  callerIdOn: true,
  autoLogOn: true,
  directoryNumbers: 120,
};
const samsungFolder = { relativePath: 'Recordings/Call/', count: 12, latestMs: 1 };
const byId = (rows: ReturnType<typeof callingRows>, id: string) => rows.find((r) => r.id === id);

it('reports a healthy Samsung phone with nothing to fix, keeping Samsung Phone as the dialer', () => {
  const rows = callingRows(healthy, [samsungFolder]);
  expect(rows.map((r) => r.id)).toEqual(['dialer', 'outgoing', 'battery', 'recordings']);
  expect(rows.every((r) => r.action === undefined)).toBe(true);
  expect(byId(rows, 'dialer')).toMatchObject({ value: 'Phone', literal: true, tone: 'info' });
  expect(byId(rows, 'recordings')).toMatchObject({
    value: 'Recordings/Call/',
    literal: true,
    tone: 'ok',
    hintVars: { count: 12, maker: 'samsung' },
  });
});

it('offers the call-redirecting role when outgoing caller ID is off, and explains when the phone has none', () => {
  const off = byId(callingRows({ ...healthy, redirectionHeld: false }, []), 'outgoing');
  expect(off).toMatchObject({
    tone: 'warn',
    value: 'crmApp.calling.off',
    action: 'redirectionRole',
  });

  const none = byId(
    callingRows({ ...healthy, redirectionHeld: false, redirectionAvailable: false }, []),
    'outgoing',
  );
  expect(none).toMatchObject({ tone: 'info', value: 'crmApp.calling.notAvailable' });
  expect(none?.action).toBeUndefined();
});

it('sends the person to App info when battery optimisation or background limits can stop call logging', () => {
  const rows = callingRows(
    { ...healthy, batteryUnrestricted: false, backgroundRestricted: true },
    [],
  );
  expect(byId(rows, 'battery')).toMatchObject({ tone: 'warn', action: 'appSettings' });
  expect(byId(rows, 'background')).toMatchObject({
    tone: 'warn',
    value: 'crmApp.calling.restricted',
    action: 'appSettings',
  });
});

it('says no recordings were found (with how to turn them on), and adds up every call folder it did find', () => {
  expect(byId(callingRows(healthy, []), 'recordings')).toMatchObject({
    tone: 'warn',
    value: 'crmApp.calling.noRecordings',
    hintKey: 'crmApp.calling.noRecordingsHint',
  });
  const rows = callingRows(healthy, [
    samsungFolder,
    { relativePath: 'Call/', count: 3, latestMs: 0 },
  ]);
  expect(byId(rows, 'recordings')?.hintVars).toEqual({ count: 15, maker: 'samsung' });
});

it('falls back to "not known" when Android names no default dialer', () => {
  expect(byId(callingRows({ ...healthy, defaultDialer: '' }, []), 'dialer')).toMatchObject({
    value: 'crmApp.calling.unknown',
    literal: false,
  });
});

it('asks for audio access before anything else about recordings, even when folders were seen before', () => {
  const row = byId(callingRows(healthy, [samsungFolder], false), 'recordings');
  expect(row).toMatchObject({
    value: 'crmApp.calling.audioNeeded',
    tone: 'warn',
    hintKey: 'crmApp.calling.audioNeededHint',
    action: 'grantAudio',
  });
  // With access, the folder is reported as before.
  expect(byId(callingRows(healthy, [samsungFolder], true), 'recordings')?.tone).toBe('ok');
});
