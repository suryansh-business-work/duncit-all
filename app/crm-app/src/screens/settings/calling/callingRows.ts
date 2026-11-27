import type { CallingDiagnostics, RecordingFolder } from 'crm-telephony';

import type { RowTone } from './DiagnosticRow';

/** The fixes a row can offer; the card turns each into a button. */
export type RowAction = 'redirectionRole' | 'appSettings' | 'grantAudio';

export interface CallingRow {
  id: string;
  labelKey: string;
  /** A translation key, or the literal value when `literal` is set (a dialer name, a folder). */
  value: string;
  literal?: boolean;
  tone: RowTone;
  hintKey?: string;
  hintVars?: Record<string, string | number>;
  action?: RowAction;
}

/**
 * What Settings › Calling & recording says about this phone, row by row.
 * Pure: the card renders it, the tests read it. Samsung Phone stays the
 * default dialer — the row only reports it, it never asks to change it.
 */
export function callingRows(
  phone: CallingDiagnostics,
  folders: readonly RecordingFolder[],
  audioAccess = true,
): CallingRow[] {
  const rows: CallingRow[] = [
    {
      id: 'dialer',
      labelKey: 'crmApp.calling.defaultDialer',
      value: phone.defaultDialer || 'crmApp.calling.unknown',
      literal: Boolean(phone.defaultDialer),
      tone: 'info',
      hintKey: 'crmApp.calling.defaultDialerHint',
    },
    outgoingRow(phone),
    phone.batteryUnrestricted
      ? {
          id: 'battery',
          labelKey: 'crmApp.calling.battery',
          value: 'crmApp.calling.unrestricted',
          tone: 'ok',
        }
      : {
          id: 'battery',
          labelKey: 'crmApp.calling.battery',
          value: 'crmApp.calling.optimized',
          tone: 'warn',
          hintKey: 'crmApp.calling.batteryHint',
          action: 'appSettings',
        },
  ];
  if (phone.backgroundRestricted)
    rows.push({
      id: 'background',
      labelKey: 'crmApp.calling.background',
      value: 'crmApp.calling.restricted',
      tone: 'warn',
      hintKey: 'crmApp.calling.backgroundHint',
      action: 'appSettings',
    });
  rows.push(recordingRow(phone, folders, audioAccess));
  return rows;
}

function outgoingRow(phone: CallingDiagnostics): CallingRow {
  const base = { id: 'outgoing', labelKey: 'crmApp.calling.outgoingCallerId' };
  if (phone.redirectionHeld) return { ...base, value: 'crmApp.settings.allowed', tone: 'ok' };
  if (!phone.redirectionAvailable)
    return {
      ...base,
      value: 'crmApp.calling.notAvailable',
      tone: 'info',
      hintKey: 'crmApp.calling.outgoingUnavailableHint',
    };
  return {
    ...base,
    value: 'crmApp.calling.off',
    tone: 'warn',
    hintKey: 'crmApp.calling.outgoingHint',
    action: 'redirectionRole',
  };
}

/**
 * Where the phone keeps its call recordings — or why none can be seen. Audio
 * access comes first: without it Android shows the app no audio file at all,
 * which used to read as "no recordings" and sent people to the wrong fix.
 */
function recordingRow(
  phone: CallingDiagnostics,
  folders: readonly RecordingFolder[],
  audioAccess: boolean,
): CallingRow {
  const base = { id: 'recordings', labelKey: 'crmApp.calling.recordingFolder' };
  if (!audioAccess)
    return {
      ...base,
      value: 'crmApp.calling.audioNeeded',
      tone: 'warn',
      hintKey: 'crmApp.calling.audioNeededHint',
      action: 'grantAudio',
    };
  const [newest] = folders;
  if (!newest)
    return {
      ...base,
      value: 'crmApp.calling.noRecordings',
      tone: 'warn',
      hintKey: 'crmApp.calling.noRecordingsHint',
    };
  const count = folders.reduce((sum, f) => sum + f.count, 0);
  return {
    ...base,
    value: newest.relativePath,
    literal: true,
    tone: 'ok',
    hintKey: 'crmApp.calling.recordingsFound',
    hintVars: { count, maker: phone.manufacturer },
  };
}
